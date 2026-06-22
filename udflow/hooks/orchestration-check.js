#!/usr/bin/env node
// udflow Stop hook (best-effort, non-blocking). Two advisories, both fail-open:
//   1. Verdict not honored: the gatekeeper's last verdict in the transcript was a BLOCKING
//      one (FIX REQUIRED / NOT READY), but the final message claims the work is done/ready
//      without surfacing that block. This is the highest-value check — it guards the product's
//      core promise (a ship/no-ship verdict that actually gates delivery).
//   2. Panel missing/incomplete: a READY verdict is asserted but the core review panel
//      (spec-reviewer, test-reviewer, gatekeeper) did not all run as independent subagents.
// A Stop hook can only advise (systemMessage), never block. Always exit 0, never crash. If the
// transcript can't be parsed (format differs), it does nothing — absence equals prior behavior.
// Provenance is structured AND tool-bound: panel presence is read only from real `Task` invocations,
// and the gatekeeper verdict only from a gatekeeper Task's own tool_result — never from free prose, a
// non-Task tool_use that merely contains "subagent_type:", or an unrelated tool_result that merely
// contains the verdict vocabulary. So none of those can spoof either advisory.
const fs = require("fs");
const os = require("os");
const path = require("path");

const REQUIRED = ["spec-reviewer", "test-reviewer", "gatekeeper"];
const MAX_TRANSCRIPT = 32 * 1024 * 1024; // cap the synchronous transcript read; fail-open (skip) above it

function debug(msg) {
  if (!process.env.UDFLOW_HOOK_DEBUG) return;
  try { fs.appendFileSync(path.join(os.tmpdir(), "udflow-hook.log"), "[orchestration-check] " + msg + "\n"); } catch (e) {}
  try { process.stderr.write("[udflow orchestration-check] " + msg + "\n"); } catch (e) {}
}

// The last verdict token in a body of transcript text. Verdicts are machine-checked literals
// (SKILL.md forbids translating them), so a literal scan is reliable. Order the alternation so
// "NOT READY" / "FIX REQUIRED" are matched whole before the bare "READY" inside "NOT READY".
function lastVerdict(text) {
  const re = /\b(NOT READY|FIX REQUIRED|READY)\b/g;
  let m, last = "";
  while ((m = re.exec(text)) !== null) last = m[1];
  return last;
}

// Language-neutral "the final message asserts a READY verdict". READY / FIX REQUIRED / NOT READY
// and the severity labels blocker/major/minor are machine-checked literals kept verbatim in every
// language (SKILL.md, Language And Text Integrity), so this still fires on a localized summary
// whose surrounding prose — including the English words "verdict" / "gatekeeper" / "readiness" —
// is translated. Requires >=2 distinct severity labels (the formal Findings section always lists
// blocker/major/minor) so a bare incidental "READY" can't trip it. Without this, a non-English
// summary ("最終裁決：READY") matched neither branch and both advisories below went silent.
function assertsReadyVerdict(text) {
  // Require an AFFIRMATIVE "READY" — the bare token NOT immediately preceded by "NOT". Matching the
  // "READY" inside "NOT READY" was the single leaky base predicate behind multiple bugs: it made
  // claimsComplete/claimsShipReady true for HONEST disclosures of a NOT READY block (so an honest
  // "NOT READY, so I'm not shipping" — especially a localized one carrying the verbatim severity
  // labels — was misread as a ship claim and wrongly nagged). Fixing it here de-leaks every dependent.
  if (!/(?<!NOT\s)\bREADY\b/.test(text)) return false;
  if (/verdict|gatekeeper|readiness/i.test(text)) return true;
  const sev = new Set((text.match(/\b(?:blocker|major|minor)s?\b/ig) || [])
    .map((s) => s.toLowerCase().replace(/s$/, "")));
  return sev.size >= 2;
}

// Does the final message claim the work is finished/shippable? Broader than a formal verdict so
// it catches an orchestrator that drops the verdict token and just says "looks good, you're set"
// — the exact way a blocking verdict gets quietly ignored. Safe to be generous here: the
// verdict-not-honored warning also requires a real blocking verdict token to exist first.
function claimsComplete(text) {
  if (assertsReadyVerdict(text)) return true;
  return /\b(ready to (?:ship|merge|release|go)|good to go|all set|you'?re all set|ship it|shipped|is complete|is done|done!|all done|no (?:remaining |outstanding )?issues|safe to (?:ship|merge|release)|looks good)\b/i.test(text);
}

// A DELIBERATE ship/readiness decision — used to gate the panel-presence check, which (unlike
// verdict-honoring) has no blocking-token precondition, so it must stay clear of casual "looks
// good / done" to avoid crying wolf. Catches the formal verdict (in any language) AND the
// lowercase / no-keyword ship phrasings, closing the "drop the verdict word to dodge the check"
// gap without nagging trivial completions.
function claimsShipReady(text) {
  if (assertsReadyVerdict(text)) return true;
  return /\b(ready to (?:ship|merge|release)|cleared to (?:ship|merge|release)|safe to (?:ship|merge|release)|good to go|ship it|ready for (?:release|production|merge))\b/i.test(text);
}

// Does the final message HONESTLY hold delivery — an explicit not-ship / stop / hold DECISION? Used
// to gate the verdict-not-honored check so that "the gatekeeper said NOT READY, but it's ready to
// ship" still warns (no hold cue), while "complete, but NOT READY, so I'm not shipping" stays silent.
// Keyed on the ship DECISION only — NOT on problem-description words like "unresolved" / "blocked"
// (those describe the issue, not the choice to stop), so a block acknowledged-then-overridden is not
// mistaken for an honest hold. It is still needed even with the assertsReadyVerdict fix above, because
// claimsComplete can be true via an English completion phrase (e.g. "is complete") — this cue is what
// keeps an honest English "complete, but NOT READY, so I'm not shipping" silent. NOTE: this is an
// ENGLISH-only heuristic and only a FALLBACK; the language-neutral, authoritative path is the
// delivery sentinel below.
function holdsDelivery(text) {
  return /\b(?:not|won'?t|will not|do(?:es)? not|cannot|can'?t|are not|is not|isn'?t|aren'?t|not going to|not gonna)\s+(?:ship|shipp?ing|merg(?:e|ing)|releas(?:e|ing)|deliver(?:ing)?)\b/i.test(text)
    || /\bnot\s+ready\s+to\s+(?:ship|merge|release|go)\b/i.test(text)
    || /\b(?:stopping|halting|holding(?:\s+(?:off|back))?|on hold|withholding|paus(?:e|ing))\b/i.test(text);
}

// THE ARCHITECTURE FIX (signal at the source, language-neutral, deterministic): the orchestrator MAY
// end its final summary with a machine-readable delivery sentinel stating its decision unambiguously,
// so the verdict-not-honored check does NOT have to infer "is this shipping or honestly holding?" from
// translated prose (the fragile part that kept producing false positives). Format (case/space tolerant):
//   udflow:delivery=held      → not delivering (honoring a block / stopping) → silent
//   udflow:delivery=shipped   → delivering → a blocking verdict here is unhonored → warn
// When present it is AUTHORITATIVE; when absent the prose heuristic (claimsComplete && !holdsDelivery)
// is the fallback. SKILL.md instructs the orchestrator to emit it; this hook never depends on it.
function deliverySentinel(text) {
  const m = /udflow\s*:\s*delivery\s*=\s*(held|hold|holding|stop|stopped|blocked|shipped|ship|shipping|delivered|deliver|delivering|merged|released)/i.exec(text);
  if (!m) return null;
  return /^(?:held|hold|holding|stop|stopped|blocked)$/i.test(m[1]) ? "held" : "shipped";
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("error", () => process.exit(0));
const _wd = setTimeout(() => process.exit(0), 5000); _wd.unref();
process.stdin.on("data", (c) => { raw += c; });
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const tpath = input.transcript_path || input.transcriptPath || "";
    if (!tpath) return process.exit(0);

    // statSync also fails open on a missing path (ENOENT -> catch). The size is sampled here and the
    // read below is unbounded, so a file that grows past the cap in this window is an accepted
    // best-effort gap (on Stop the session has ended; the transcript is not actively appended).
    let tsize = 0;
    try { tsize = fs.statSync(tpath).size; } catch (e) { return process.exit(0); }
    if (tsize > MAX_TRANSCRIPT) { debug("transcript over cap (" + tsize + " bytes); skipping"); return process.exit(0); }
    const text = fs.readFileSync(tpath, "utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    const parsed = lines.map((ln) => { try { return JSON.parse(ln); } catch (e) { return null; } });

    // Provenance is STRUCTURED and TOOL-BOUND. Panel presence is read only from real `Task`
    // invocations (a tool_use whose name is "Task"); the gatekeeper verdict only from the
    // tool_result of a gatekeeper Task. Free prose — human OR assistant — is never trusted, and
    // neither is a non-Task tool_use whose input merely contains "subagent_type: ..." (e.g. an Edit
    // writing that string) nor an unrelated tool_result that merely contains the verdict vocabulary
    // (e.g. a Bash log printing "NOT READY"). Shapes handled: {role,content} and {message:{content}};
    // content may be a string or an array of typed blocks.
    const blocksOf = (obj) => {
      const c = obj ? ((obj.message && obj.message.content !== undefined) ? obj.message.content : obj.content) : null;
      return Array.isArray(c) ? c : [];
    };
    const isTaskUse = (b) => b && (b.type === "tool_use" || b.type === "tool-use") && b.name === "Task";
    const isToolResult = (b) => b && (b.type === "tool_result" || b.type === "tool-result");
    const resultTextOf = (b) => {
      const rc = b.content;
      if (typeof rc === "string") return rc;
      if (Array.isArray(rc)) return rc.map((x) => (x && typeof x.text === "string") ? x.text : "").join("\n");
      return rc != null ? JSON.stringify(rc) : "";
    };
    const allBlocks = parsed.flatMap(blocksOf);

    // Did the panel actually run? Only real `Task` invocations count; a non-Task tool_use whose
    // input happens to contain a "subagent_type: <name>" string does not.
    const taskInputText = allBlocks.filter(isTaskUse)
      .map((b) => JSON.stringify(b.input != null ? b.input : {})).join("\n");
    const ran = new Set();
    for (const name of REQUIRED) {
      const re = new RegExp("(?:subagent_type|agentType|agent_type)\"?\\s*[:=]\\s*\"?[^\"]*" + name, "i");
      if (re.test(taskInputText)) ran.add(name);
    }
    const missing = REQUIRED.filter((n) => !ran.has(n));

    // Ids of gatekeeper `Task` invocations, so the verdict binds to that Task's own result rather
    // than any tool_result that happens to mention the vocabulary.
    const gkRe = /(?:subagent_type|agentType|agent_type)"?\s*[:=]\s*"?[^"]*gatekeeper/i;
    const gatekeeperIds = new Set();
    for (const b of allBlocks) {
      if (isTaskUse(b) && b.id != null && gkRe.test(JSON.stringify(b.input != null ? b.input : {}))) gatekeeperIds.add(b.id);
    }

    // Locate the final assistant message (the orchestrator's closing summary).
    let finalText = "", finalIdx = lines.length;
    for (let i = lines.length - 1; i >= 0; i--) {
      const obj = parsed[i];
      if (!obj) continue;
      const role = obj.role || (obj.message && obj.message.role) || obj.type;
      if (role === "assistant") { finalText = JSON.stringify(obj); finalIdx = i; break; }
    }

    // The gatekeeper's verdict comes ONLY from a gatekeeper Task's tool_result, before the final
    // summary. Bind by tool_use_id; when the transcript carries no ids at all (binding impossible)
    // fall back to any pre-final tool_result. Reading the LAST verdict means a FIX REQUIRED →
    // repair → READY loop reads as READY, not a stale block.
    const verdictParts = [];
    for (let i = 0; i < finalIdx; i++) {
      for (const b of blocksOf(parsed[i])) {
        if (!isToolResult(b)) continue;
        const id = b.tool_use_id != null ? b.tool_use_id : b.toolUseId;
        if (id != null) { if (gatekeeperIds.has(id)) verdictParts.push(resultTextOf(b)); }
        else verdictParts.push(resultTextOf(b)); // no id to bind on -> best-effort (test / older format)
      }
    }
    const verdict = lastVerdict(verdictParts.join("\n"));
    const finalReportsBlock = /\b(NOT READY|FIX REQUIRED)\b/.test(finalText);
    const finalClaimsComplete = claimsComplete(finalText);
    const finalShipReady = claimsShipReady(finalText);
    const finalHoldsDelivery = holdsDelivery(finalText);
    const finalDelivery = deliverySentinel(finalText); // "held" | "shipped" | null
    // Is the session delivering without honoring the block? The delivery sentinel is authoritative
    // when present (deterministic, language-neutral); otherwise fall back to the English prose
    // heuristic. This is the structural fix for the false-positive class that prose-parsing produced.
    const sessionDelivers = finalDelivery !== null
      ? finalDelivery === "shipped"
      : (finalClaimsComplete && !finalHoldsDelivery);
    debug("verdict=" + verdict + " claimsComplete=" + finalClaimsComplete + " reportsBlock=" + finalReportsBlock +
      " shipReady=" + finalShipReady + " holds=" + finalHoldsDelivery + " sentinel=" + finalDelivery +
      " delivers=" + sessionDelivers + " ran=[" + [...ran].join(",") + "]");

    // (1) Verdict not honored — highest value. A real blocking verdict was reached, yet the session
    // is DELIVERING (per the sentinel, or per the prose heuristic when no sentinel). An honest hold —
    // "udflow:delivery=held", or "complete, but NOT READY, so not shipping" — is not nagged; a final
    // that quotes the block but still ships ("NOT READY, but it's ready to ship") is caught.
    if ((verdict === "NOT READY" || verdict === "FIX REQUIRED") && sessionDelivers) {
      const msg = "udflow: the gatekeeper's last verdict was '" + verdict + "', but the session is " +
        "ending as if the work were complete/ready. A " + verdict + " verdict must gate delivery — " +
        "either continue the repair loop until the gatekeeper returns READY, or report the block " +
        "(what remains unresolved and why) instead of claiming done. Do not override the verdict silently.";
      return process.stdout.write(JSON.stringify({ systemMessage: msg }), () => process.exit(0));
    }

    // (2) READY asserted but the core panel did not fully run. Graded: distinguish "never ran"
    // (panel clearly skipped) from "incomplete" (some core reviewers missing — e.g. only the
    // gatekeeper ran, skipping the spec/test reviewers that do the actual review work). An explicit
    // delivery=held sentinel overrides the ship-ready prose: if the session isn't delivering, panel
    // completeness is moot, so the sentinel stays authoritative for this advisory too.
    if (finalShipReady && !finalReportsBlock && missing.length > 0 && finalDelivery !== "held") {
      const msg = ran.size === 0
        ? "udflow: a READY verdict was asserted but none of the core review panel (spec-reviewer, " +
          "test-reviewer, gatekeeper) appears to have run as a subagent this session. A self-review is " +
          "not a formal multi-agent review — run the panel, or downgrade to FIX REQUIRED and disclose " +
          "it as local self-review."
        : "udflow: a READY verdict was asserted, but the core review panel is incomplete — " +
          missing.join(", ") + " did not run as a subagent this session. spec-reviewer and " +
          "test-reviewer do the actual review work; a verdict resting on a partial panel is not a " +
          "formal multi-agent review. Run the missing reviewer(s), or downgrade to FIX REQUIRED and " +
          "disclose the gap.";
      return process.stdout.write(JSON.stringify({ systemMessage: msg }), () => process.exit(0));
    }
  } catch (e) { debug("error: " + (e && e.message)); }
  return process.exit(0);
});
