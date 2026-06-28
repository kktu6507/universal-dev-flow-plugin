#!/usr/bin/env node
// udflow Stop hook (best-effort, non-blocking). Four advisories, all fail-open:
//   1. Verdict not honored: the gatekeeper's last verdict in the transcript was a BLOCKING
//      one (FIX REQUIRED / NOT READY), but the final message claims the work is done/ready
//      without surfacing that block. This is the highest-value check — it guards the product's
//      core promise (a ship/no-ship verdict that actually gates delivery).
//   2. Panel missing/incomplete: a READY verdict is asserted but the core review panel
//      (spec-reviewer, test-reviewer, gatekeeper) did not all run as independent subagents.
//   3. Verification not honored: the verification sentinel (udflow:verify=) reports a REQUIRED
//      check failed or never ran, yet the session is delivering. The command exit status is
//      authority over reviewer prose — a red/unrun required check must gate delivery. Fires ONLY
//      on the explicit sentinel (no prose inference), mirroring advisory 1's delivery-sentinel path.
//   4. Evidence not logged: a real, verified, DELIVERED run (a gatekeeper Task ran AND
//      udflow:verify=pass AND the session is delivering) carries NO `### Live run` evidence block.
//      udflow ships no telemetry, so a run that isn't written down does not count — this nudges the
//      run to emit its paste-ready evidence block (references/final-report.md, Evidence Record). A pure
//      logging reminder, never a block; excludes trivial (verify=na / no sentinel) and held/mid-repair
//      runs (gated on delivering), so it only fires on a completed real run that forgot to log itself.
// A Stop hook is ADVISORY by default (systemMessage, never blocks) — the pragmatism default, so a
// false positive can never trap the user. An explicit opt-in (UDFLOW_ENFORCE_STOP) upgrades ONLY the
// highest-confidence, fully sentinel-based signal (a real id-bound gatekeeper blocking verdict AND an
// explicit udflow:delivery=shipped) to a Stop block; every other path stays advisory. Always exit 0,
// never crash. If the transcript can't be parsed (format differs), it does nothing — absence equals
// prior behavior.
// Provenance is structured AND tool-bound: panel presence is read only from real `Task` invocations,
// and the gatekeeper verdict only from a gatekeeper Task's own tool_result — never from free prose, a
// non-Task tool_use that merely contains "subagent_type:", or an unrelated tool_result that merely
// contains the verdict vocabulary. So none of those can spoof either advisory.
const fs = require("fs");
const os = require("os");
const path = require("path");

const REQUIRED = ["spec-reviewer", "test-reviewer", "gatekeeper"];
const MAX_TRANSCRIPT = 32 * 1024 * 1024; // cap the synchronous transcript read; fail-open (skip) above it

// Opt-in HARD enforcement (default OFF). When UDFLOW_ENFORCE_STOP is truthy, the single highest-
// confidence, fully sentinel-based signal — a real id-bound gatekeeper blocking verdict AND an explicit
// udflow:delivery=shipped — is upgraded from advisory to a Stop BLOCK. Everything else stays advisory.
// Never blocks on prose, ambiguity, the verify sentinel, the panel check, or an absent transcript. The
// model always controls a one-token escape (emit udflow:delivery=held). Trap-risk + disengage: README.
const ENFORCE = /^(1|true|yes|on)$/i.test(String(process.env.UDFLOW_ENFORCE_STOP || ""));

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
  // Last-match (like lastVerdict): the orchestrator's final rollup line wins even if an earlier
  // delivery decision is discussed in prose above it.
  const re = /udflow\s*:\s*delivery\s*=\s*(held|hold|holding|stop|stopped|blocked|shipped|ship|shipping|delivered|deliver|delivering|merged|released)/ig;
  let m, last = null;
  while ((m = re.exec(text)) !== null) last = m[1];
  if (last === null) return null;
  return /^(?:held|hold|holding|stop|stopped|blocked)$/i.test(last) ? "held" : "shipped";
}

// THE VERIFICATION SENTINEL (the structural fix for advisory 3, language-neutral, deterministic): the
// orchestrator MAY end its final summary with a machine-readable rollup of whether the REQUIRED checks
// actually passed, so the hook does NOT have to infer "is the build green?" from prose or from Bash
// exit codes scattered in the transcript (the fragile part). Format (case/space tolerant), distinct
// stem from `delivery` so the two regexes never cross-match:
//   udflow:verify=pass   → every required check ran and exited zero
//   udflow:verify=fail   → a required check ran and exited non-zero
//   udflow:verify=unrun  → a required check was claimed/expected but never actually ran
//   udflow:verify=na     → no command checks were required (docs-only / trivial)
// When present it is AUTHORITATIVE; when absent advisory 3 is a dead branch (no prose fallback — the
// near-zero-false-positive posture the delivery sentinel established). Last-match scan (like lastVerdict /
// deliverySentinel) so the final rollup line wins over an earlier in-prose mention. TOLERANT DECODER: the
// CONTRACT surface is exactly the four literals pass|fail|unrun|na (what the gatekeeper emits and the docs
// publish); the extra synonyms (passed/green/ok, failed/red/broken, skipped/blocked/not-run) are defensive
// folds for human/LLM variance, mirroring deliverySentinel — they fail safe (each folds to its nearest
// favorable meaning; an unrecognized value yields null).
function verifySentinel(text) {
  const re = /udflow\s*:\s*verify\s*=\s*(pass|passed|green|ok|fail|failed|red|broken|unrun|not-?run|notrun|skipped|blocked|na|n\/?a)/ig;
  let m, last = null;
  while ((m = re.exec(text)) !== null) last = m[1];
  if (last === null) return null;
  const v = last.toLowerCase();
  if (/^(?:pass|passed|green|ok)$/.test(v)) return "pass";
  if (/^(?:fail|failed|red|broken)$/.test(v)) return "fail";
  if (/^(?:na|n\/?a)$/.test(v)) return "na";
  return "unrun";
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

    // The agent identity of a `Task` block comes ONLY from its explicit input field
    // (subagent_type / agentType / agent_type) — never from stringifying the whole input. The old
    // approach scanned the serialized input, so free text in a SIBLING field — e.g. a real gatekeeper
    // Task whose PROMPT quotes "subagent_type: spec-reviewer" — spoofed panel presence and silenced the
    // advisories. Reading the structured field closes that: the prompt is not the agent type. A string
    // input is JSON-parsed first; anything unreadable yields "" (fail-safe — the agent reads as "did not
    // run", i.e. toward warning, never toward a silent false pass).
    const subagentTypeOf = (b) => {
      let inp = b && b.input;
      if (typeof inp === "string") { try { inp = JSON.parse(inp); } catch (e) { return ""; } }
      if (!inp || typeof inp !== "object") return "";
      const v = (inp.subagent_type != null) ? inp.subagent_type
              : (inp.agentType != null) ? inp.agentType
              : (inp.agent_type != null) ? inp.agent_type : "";
      return typeof v === "string" ? v.toLowerCase() : "";
    };

    // Did the panel actually run? Only real `Task` invocations count, and only via the structured
    // subagent_type field (REQUIRED names are lowercase, matched as a substring of e.g. "udflow:spec-reviewer").
    const taskTypes = allBlocks.filter(isTaskUse).map(subagentTypeOf);
    const ran = new Set();
    for (const name of REQUIRED) {
      if (taskTypes.some((t) => t.includes(name))) ran.add(name);
    }
    const missing = REQUIRED.filter((n) => !ran.has(n));

    // Ids of gatekeeper `Task` invocations, so the verdict binds to that Task's own result rather than
    // any tool_result that happens to mention the vocabulary — again from the structured field only.
    const gatekeeperIds = new Set();
    for (const b of allBlocks) {
      if (isTaskUse(b) && b.id != null && subagentTypeOf(b).includes("gatekeeper")) gatekeeperIds.add(b.id);
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
    // summary. Bind by tool_use_id. The id-less fallback is TRANSCRIPT-LEVEL, not per-result: it applies
    // only when NO pre-final tool_result carries an id at all (an older / id-free format where binding is
    // impossible). When binding IS possible (any result has an id), an id-less result must NOT enter the
    // verdict pool — otherwise a stray id-less result containing "READY" (e.g. a Bash log line) would be
    // appended after the gatekeeper's real NOT READY and, as the LAST verdict, silence the advisory.
    // Reading the LAST verdict means a FIX REQUIRED → repair → READY loop reads as READY, not a stale block.
    let anyResultId = false;
    for (let i = 0; i < finalIdx && !anyResultId; i++) {
      for (const b of blocksOf(parsed[i])) {
        if (!isToolResult(b)) continue;
        if ((b.tool_use_id != null ? b.tool_use_id : b.toolUseId) != null) { anyResultId = true; break; }
      }
    }
    const verdictParts = [];
    for (let i = 0; i < finalIdx; i++) {
      for (const b of blocksOf(parsed[i])) {
        if (!isToolResult(b)) continue;
        const id = b.tool_use_id != null ? b.tool_use_id : b.toolUseId;
        if (id != null) { if (gatekeeperIds.has(id)) verdictParts.push(resultTextOf(b)); }
        else if (!anyResultId) verdictParts.push(resultTextOf(b)); // id-less only when binding is impossible transcript-wide
      }
    }
    const verdict = lastVerdict(verdictParts.join("\n"));
    const finalReportsBlock = /\b(NOT READY|FIX REQUIRED)\b/.test(finalText);
    const finalClaimsComplete = claimsComplete(finalText);
    const finalShipReady = claimsShipReady(finalText);
    const finalHoldsDelivery = holdsDelivery(finalText);
    const finalDelivery = deliverySentinel(finalText); // "held" | "shipped" | null
    const finalVerify = verifySentinel(finalText);     // "pass" | "fail" | "unrun" | "na" | null
    // Is the session delivering without honoring the block? The delivery sentinel is authoritative
    // when present (deterministic, language-neutral); otherwise fall back to the English prose
    // heuristic. This is the structural fix for the false-positive class that prose-parsing produced.
    const sessionDelivers = finalDelivery !== null
      ? finalDelivery === "shipped"
      : (finalClaimsComplete && !finalHoldsDelivery);
    debug("verdict=" + verdict + " claimsComplete=" + finalClaimsComplete + " reportsBlock=" + finalReportsBlock +
      " shipReady=" + finalShipReady + " holds=" + finalHoldsDelivery + " sentinel=" + finalDelivery +
      " verify=" + finalVerify + " delivers=" + sessionDelivers + " ran=[" + [...ran].join(",") + "]");

    // (1) Verdict not honored — highest value. A real blocking verdict was reached, yet the session
    // is DELIVERING (per the sentinel, or per the prose heuristic when no sentinel). An honest hold —
    // "udflow:delivery=held", or "complete, but NOT READY, so not shipping" — is not nagged; a final
    // that quotes the block but still ships ("NOT READY, but it's ready to ship") is caught.
    if ((verdict === "NOT READY" || verdict === "FIX REQUIRED") && sessionDelivers) {
      const msg = "udflow: the gatekeeper's last verdict was '" + verdict + "', but the session is " +
        "ending as if the work were complete/ready. A " + verdict + " verdict must gate delivery — " +
        "either continue the repair loop until the gatekeeper returns READY, or report the block " +
        "(what remains unresolved and why) instead of claiming done. Do not override the verdict silently.";
      // HARD enforce ONLY when: opted in, NOT re-entered from a prior block (loop-trap guard), and the
      // delivery decision is the EXPLICIT sentinel udflow:delivery=shipped (never the prose fallback).
      // This is strictly narrower than sessionDelivers: a prose-only "ship" can warn but NEVER blocks,
      // and an honest udflow:delivery=held (finalDelivery !== "shipped") is the model's one-token escape.
      const stopActive = input.stop_hook_active === true || input.stopHookActive === true;
      if (ENFORCE && !stopActive && finalDelivery === "shipped") {
        return process.stdout.write(JSON.stringify({
          decision: "block",
          reason: msg + " (udflow hard-enforce: UDFLOW_ENFORCE_STOP is set. To proceed, get the " +
            "gatekeeper to READY, or emit udflow:delivery=held to hold honestly, or unset " +
            "UDFLOW_ENFORCE_STOP.)"
        }), () => process.exit(0));
      }
      return process.stdout.write(JSON.stringify({ systemMessage: msg }), () => process.exit(0));
    }

    // (2) READY asserted but the core panel did not fully run. Graded: distinguish "never ran"
    // (panel clearly skipped) from "incomplete" (some core reviewers missing — e.g. only the
    // gatekeeper ran, skipping the spec/test reviewers that do the actual review work). Suppression
    // is gated on an HONEST HOLD (the delivery=held sentinel, or `holdsDelivery`), NOT on mere
    // presence of a block token: a mixed-history close that *mentions* an earlier NOT READY yet still
    // claims READY + ships ("was NOT READY, but it's ready now") must still warn. Gating on the bare
    // `NOT READY`/`FIX REQUIRED` token wrongly silenced that case (the panel safety-net defeated by a
    // prose mention); `holdsDelivery` keys on the ship DECISION, and `delivery=held` is authoritative.
    if (finalShipReady && !finalHoldsDelivery && missing.length > 0 && finalDelivery !== "held") {
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

    // (3) Verification not honored. The verification sentinel reports a REQUIRED check failed or was
    // never run, yet the session is delivering. Placed LAST (lowest priority): the two advisories above
    // early-return, so at most one systemMessage is ever emitted and this branch never perturbs them.
    // Fires ONLY on the explicit literal udflow:verify=fail|unrun — never inferred from prose, a Bash
    // exit code, or the word "failed"; absent the sentinel this branch is dead and behavior is exactly
    // as before. Gated on sessionDelivers (delivery sentinel authoritative; prose fallback) so an honest
    // hold — udflow:verify=fail + udflow:delivery=held — stays silent (holding on a red check is correct).
    if ((finalVerify === "fail" || finalVerify === "unrun") && sessionDelivers) {
      const what = finalVerify === "fail"
        ? "a required check (build/test/typecheck on behavior-changing code) exited non-zero"
        : "a required check was claimed but never actually run";
      const msg = "udflow: the verification sentinel reports " + what + " (udflow:verify=" + finalVerify +
        "), but the session is ending as if the work were complete/ready. A red or unrun required check " +
        "must gate delivery — the command's exit status is authority, reviewer findings cannot override " +
        "a red build. Fix and rerun the check until it is green (udflow:verify=pass), or hold delivery " +
        "(udflow:delivery=held) and report what failed or was not run.";
      return process.stdout.write(JSON.stringify({ systemMessage: msg }), () => process.exit(0));
    }

    // (4) Evidence not logged. A REAL, verified, DELIVERED run — a gatekeeper Task actually ran, the
    // verification sentinel is green (udflow:verify=pass), and the session is delivering — yet the final
    // report carries no `### Live run` evidence block. Placed LAST (lowest priority): the three integrity
    // advisories above early-return, so reaching here means the run is otherwise clean, which is exactly
    // when a real run is contracted to log itself (references/final-report.md, Evidence Record). This is a
    // pure logging NUDGE, never a block. It is conservative by construction — it requires the gatekeeper
    // Task (a real udflow verdict, not a bare sentinel), verify=pass (so trivial verify=na / no-sentinel
    // and red/unrun runs never trip it), and sessionDelivers (so a held / mid-repair run is not nagged) —
    // honoring the pragmatism axiom that a false positive is worse than a documented miss. Detection of the
    // block is GENEROUS (loose /Live run/ match) so an existing block reliably suppresses the nudge; the
    // `### Live run` header is a guarded literal (validate-structure 5f) so a prose rename can't silently
    // make this inert. Like every advisory it is finalText-scoped and emits at most one systemMessage.
    const hasLiveRun = /\bLive run\b/i.test(finalText);
    if (finalVerify === "pass" && sessionDelivers && ran.has("gatekeeper") && !hasLiveRun) {
      const msg = "udflow: this was a real, verified run (a gatekeeper verdict ran and udflow:verify=pass), " +
        "but the final report has no `### Live run` evidence block. udflow ships no telemetry, so a run " +
        "that isn't written down does not count — emit the `### Live run` block (see references/final-report.md, " +
        "Evidence Record) so the run can be pasted into EVIDENCE.md or the Verified-run issue form. Omit it " +
        "only for trivial edits, pure Q&A, or benchmark/demo runs.";
      return process.stdout.write(JSON.stringify({ systemMessage: msg }), () => process.exit(0));
    }
  } catch (e) { debug("error: " + (e && e.message)); }
  return process.exit(0);
});
