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
// Provenance: verdict/panel detection reads only model & subagent output (assistant turns and
// tool_result blocks), never free human-typed text — so a user message that quotes the verdict
// vocabulary or pastes a "subagent_type:" string cannot spoof either advisory.
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
  if (!/\bREADY\b/.test(text)) return false;
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

    // Parse each line once and tag provenance. Verdict/panel detection must trust only MODEL /
    // subagent output, never free human-typed text — otherwise a user message that merely quotes
    // the verdict vocabulary ("READY / FIX REQUIRED / NOT READY") fires a false "verdict not
    // honored", and a pasted "subagent_type: ..." string silently satisfies the panel check. The
    // gatekeeper's own verdict arrives as a tool_result INSIDE a user-role line, so tool_result
    // content stays trusted; only a human-typed user turn (string / text content, no tool_result)
    // is excluded. An unparseable line can't be vouched for, so it is treated as untrusted —
    // fail-open (at worst it suppresses an advisory, the accepted failure direction).
    const parsed = lines.map((ln) => { try { return JSON.parse(ln); } catch (e) { return null; } });
    const isHumanTurn = (obj) => {
      if (!obj) return true;
      const role = obj.role || (obj.message && obj.message.role) || obj.type;
      if (role !== "user" && role !== "human") return false; // assistant / tool / system -> model-side, trusted
      const content = (obj.message && obj.message.content !== undefined) ? obj.message.content : obj.content;
      if (Array.isArray(content)) return !content.some((b) => b && (b.type === "tool_result" || b.type === "tool-result"));
      return true; // string / object content with no tool_result block -> human-typed
    };
    const trusted = parsed.map((o) => !isHumanTurn(o));

    // Did the panel actually run? Look for the reviewer/gatekeeper subagent types in TRUSTED lines
    // only (a real Task invocation is an assistant tool_use; pasted "subagent_type:" text is ignored).
    const trustedText = lines.filter((_, i) => trusted[i]).join("\n");
    const ran = new Set();
    for (const name of REQUIRED) {
      const re = new RegExp("(?:subagent_type|agentType|agent_type)\"?\\s*[:=]\\s*\"?[^\"]*" + name, "i");
      if (re.test(trustedText)) ran.add(name);
    }
    const missing = REQUIRED.filter((n) => !ran.has(n));

    // Locate the final assistant message (the orchestrator's closing summary).
    let finalText = "", finalIdx = lines.length;
    for (let i = lines.length - 1; i >= 0; i--) {
      const obj = parsed[i];
      if (!obj) continue;
      const role = obj.role || (obj.message && obj.message.role) || obj.type;
      if (role === "assistant") { finalText = JSON.stringify(obj); finalIdx = i; break; }
    }

    // The gatekeeper's verdict lives in the transcript BEFORE the final summary, in TRUSTED
    // (assistant / tool_result) lines only — never in human-typed prose. Reading the last verdict
    // (not just any) means a FIX REQUIRED → repair → READY loop reads as READY, not a stale block.
    const bodyBeforeFinal = lines.filter((_, i) => i < finalIdx && trusted[i]).join("\n");
    const verdict = lastVerdict(bodyBeforeFinal);
    const finalReportsBlock = /\b(NOT READY|FIX REQUIRED)\b/.test(finalText);
    const finalClaimsComplete = claimsComplete(finalText);
    const finalShipReady = claimsShipReady(finalText);
    debug("verdict=" + verdict + " claimsComplete=" + finalClaimsComplete + " reportsBlock=" + finalReportsBlock +
      " shipReady=" + finalShipReady + " ran=[" + [...ran].join(",") + "]");

    // (1) Verdict not honored — highest value. A real blocking verdict was reached, yet the
    // session ends claiming completion without surfacing it. The blocking token is strong,
    // specific evidence, so this stays well clear of crying wolf.
    if ((verdict === "NOT READY" || verdict === "FIX REQUIRED") && finalClaimsComplete && !finalReportsBlock) {
      const msg = "udflow: the gatekeeper's last verdict was '" + verdict + "', but the session is " +
        "ending as if the work were complete/ready. A " + verdict + " verdict must gate delivery — " +
        "either continue the repair loop until the gatekeeper returns READY, or report the block " +
        "(what remains unresolved and why) instead of claiming done. Do not override the verdict silently.";
      return process.stdout.write(JSON.stringify({ systemMessage: msg }), () => process.exit(0));
    }

    // (2) READY asserted but the core panel did not fully run. Graded: distinguish "never ran"
    // (panel clearly skipped) from "incomplete" (some core reviewers missing — e.g. only the
    // gatekeeper ran, skipping the spec/test reviewers that do the actual review work).
    if (finalShipReady && !finalReportsBlock && missing.length > 0) {
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
