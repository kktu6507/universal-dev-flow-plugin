#!/usr/bin/env node
// udflow Stop hook (best-effort, non-blocking): if the session's final message asserts a
// READY verdict but the core review panel (spec-reviewer, test-reviewer, gatekeeper) did
// not actually run as independent subagents, surface a non-blocking reminder.
// Always fail-open: exit 0, never block the stop, never crash. If the transcript can't be
// parsed (format differs), it simply does nothing — absence equals current behavior.
const fs = require("fs");
const os = require("os");
const path = require("path");

const REQUIRED = ["spec-reviewer", "test-reviewer", "gatekeeper"];

function debug(msg) {
  if (!process.env.UDFLOW_HOOK_DEBUG) return;
  try { fs.appendFileSync(path.join(os.tmpdir(), "udflow-hook.log"), "[orchestration-check] " + msg + "\n"); } catch (e) {}
  try { process.stderr.write("[udflow orchestration-check] " + msg + "\n"); } catch (e) {}
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
    if (!tpath || !fs.existsSync(tpath)) return process.exit(0);

    const text = fs.readFileSync(tpath, "utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);

    // Did the panel actually run? Look for the reviewer/gatekeeper subagent types anywhere.
    const ran = new Set();
    for (const name of REQUIRED) {
      const re = new RegExp("(?:subagent_type|agentType|agent_type)\"?\\s*[:=]\\s*\"?[^\"]*" + name, "i");
      if (re.test(text)) ran.add(name);
    }

    // Did the final assistant message assert a READY verdict?
    let finalText = "";
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(lines[i]);
        const role = obj.role || (obj.message && obj.message.role) || obj.type;
        if (role === "assistant") { finalText = JSON.stringify(obj); break; }
      } catch (e) {}
    }
    const assertsReady = /\bREADY\b/.test(finalText) && /verdict|gatekeeper|readiness/i.test(finalText);
    const missing = REQUIRED.filter((n) => !ran.has(n));
    debug("assertsReady=" + assertsReady + " ran=[" + [...ran].join(",") + "] missing=[" + missing.join(",") + "]");

    if (assertsReady && missing.length) {
      const msg = "udflow: a READY verdict was asserted but these agents did not run as independent subagents this session: " +
        missing.join(", ") + ". A self-review is not a formal multi-agent review — either run the panel (spec-reviewer, test-reviewer, gatekeeper) or downgrade to FIX REQUIRED and disclose it as local self-review.";
      return process.stdout.write(JSON.stringify({ systemMessage: msg }), () => process.exit(0));
    }
  } catch (e) { debug("error: " + (e && e.message)); }
  return process.exit(0);
});
