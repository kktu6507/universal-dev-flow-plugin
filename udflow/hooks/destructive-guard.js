#!/usr/bin/env node
// udflow destructive-command guard (PreToolUse, ALL modes). A safety net distinct from the plan gate:
// plan-gate.js blocks working-tree *writes* only while in plan mode and is fail-OPEN; this guard catches
// a NARROW, HIGH-CONFIDENCE set of *unrecoverable* Bash commands (git reset --hard, git push --force,
// rm -rf, mkfs, dd of=<device>, find -delete, shred) in EVERY mode, because after plan approval nothing
// else stops an implementer from running one on the wrong target. It surfaces a confirmation
// (permissionDecision: "ask") — never a hard "deny" — so a false positive costs one keystroke, not a
// wall (the pragmatism axiom: false positives are worse than the documented miss list). Risk posture:
// fail-OPEN if the whole input can't be parsed (can't tell what the tool is -> allow), but once a command
// MATCHES a destructive pattern, fail-CLOSED-to-ASK (any later error still resolves toward asking, never
// a silent allow). Per-project opt-out via .claude/settings.json "udflow": { "destructiveGuard": false }.
// Cross-platform Node; never crashes a session.
const os = require("os");
const path = require("path");
const fs = require("fs");

const MAX_STDIN = 5 * 1024 * 1024; // cap to avoid unbounded buffering of a large tool_input (bytes)

function debug(msg) {
  if (!process.env.UDFLOW_HOOK_DEBUG) return;
  try { fs.appendFileSync(path.join(os.tmpdir(), "udflow-hook.log"), "[destructive-guard] " + msg + "\n"); } catch (e) {}
  try { process.stderr.write("[udflow destructive-guard] " + msg + "\n"); } catch (e) {}
}

// Narrow, high-confidence deny-list of UNRECOVERABLE Bash commands. Conservative like
// plan-gate's bashLooksLikePlanWrite: matched against the quote-stripped command, anchored at
// start/space/separator, and deliberately NOT trying to catch interpreter one-liners (node -e / python -c),
// $VAR/~/glob targets, separated flags (rm -r -f), `bash -c "…"` nesting, or a word-internal apostrophe
// that mis-pairs the quote-stripper and blanks a real command (the SAME accepted miss plan-gate documents).
// These are documented misses — tightening would add false positives, and this is a best-effort net that
// only ever ASKS (never denies, never the sole protection). The recoverable-but-common
// ops (git restore / git clean / git checkout -- <path>) are intentionally OUT of this v1 set: they fire
// often and benignly, and asking on them would train reflexive approval that decays the prompt's value
// for the ops that truly matter.
function bashLooksDestructive(command) {
  const cmd = String(command || "");
  // Drop quoted spans first so a literal pattern inside quotes (e.g. echo "rm -rf /") doesn't trip.
  // Kept simple/non-recursive so a multi-MB hostile string can't overflow the regex stack. A stray
  // word-internal apostrophe can mis-pair and blank an unquoted span (e.g. "won't … rm -rf … it's"),
  // an accepted, documented miss identical to plan-gate's — this is a best-effort net, not a shell parser.
  const unquoted = cmd.replace(/'[^']*'|"[^"]*"/g, " ");
  const destructivePatterns = [
    // git history/worktree obliterators
    /(?:^|[\s;&|])git\s+reset\s+(?:[^;&|]*\s)?--hard\b/i,                                  // discards commits + working tree
    /(?:^|[\s;&|])git\s+push\s+(?:[^;&|]*\s)?(?:--force(?![\w-])|--force-with-lease=?|-f\b)/i, // rewrites remote history (--force(?![\w-]) so a non-flag like --force-fast doesn't false-ask, while --force-with-lease still matches its own branch)
    // filesystem obliterators
    /(?:^|[\s;&|])rm\s+(?:-[A-Za-z]*\s+)*-[A-Za-z]*r[A-Za-z]*f|(?:^|[\s;&|])rm\s+(?:-[A-Za-z]*\s+)*-[A-Za-z]*f[A-Za-z]*r/i, // rm -rf / -fr (combined flags)
    /(?:^|[\s;&|])find\s[^;&|]*\s-delete\b/i,                                              // bulk delete by find
    /(?:^|[\s;&|])dd\s(?=[^;&|]*\bof=)(?![^;&|]*\bof=(?:\/dev\/null\b|NUL\b))/i,            // dd of=<real device/file> (exempt /dev/null, NUL; reused verbatim from plan-gate — a malformed double-of= with /dev/null anywhere is exempted, but last-of= wins so it'd write /dev/null anyway)
    /(?:^|[\s;&|])(?:mkfs(?:\.\w+)?|shred)\b/i,                                            // format / unrecoverable wipe
  ];
  return destructivePatterns.some((re) => re.test(unquoted));
}

// Project opt-out: a project may disable this guard for its OWN sessions by setting
// "udflow": { "destructiveGuard": false } in .claude/settings.json (or settings.local.json, which takes
// precedence). Mirrors plan-gate.js's planGateDisabledForProject exactly, including the FAIL-SAFE:
// a missing file, parse error, oversized config, or any read error counts as "not disabled" (keep
// asking), so a broken settings file can never silently drop the safety net.
function destructiveGuardDisabledForProject(input) {
  try {
    const root = process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || "";
    if (!root) return false;
    for (const name of ["settings.local.json", "settings.json"]) { // local overrides project
      const v = readGuardFlag(path.join(root, ".claude", name));
      if (v === false) return true;  // explicitly disabled in the higher-precedence file -> allow
      if (v === true) return false;  // explicitly enabled -> enforce (a lower file can't flip it back)
      // undefined -> not set here; fall through to the lower-precedence file
    }
  } catch (e) {}
  return false;
}

// Read udflow.destructiveGuard from a settings file: true/false when set, undefined otherwise (missing
// file / not set / any error). Caps the read so a pathological settings file can't stall the hook.
function readGuardFlag(file) {
  try {
    let size = 0;
    try { size = fs.statSync(file).size; } catch (e) { return undefined; } // not present / unstatable
    if (size > 1024 * 1024) return undefined;
    const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
    const v = cfg && cfg.udflow && cfg.udflow.destructiveGuard;
    return v === false ? false : (v === true ? true : undefined);
  } catch (e) { return undefined; }
}

let raw = "";
let rawBytes = 0;
process.stdin.setEncoding("utf8");
process.stdin.on("error", () => process.exit(0));
const _watchdog = setTimeout(() => process.exit(0), 5000); _watchdog.unref();
process.stdin.on("data", (c) => {
  raw += c;
  rawBytes += Buffer.byteLength(c, "utf8");
  if (rawBytes > MAX_STDIN) { debug("stdin over cap; allowing"); try { process.stdin.pause(); } catch (e) {} process.exit(0); }
});
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const tool = input.tool_name || "";
    if (tool !== "Bash") return process.exit(0); // only Bash commands can be destructive here
    const ti = input.tool_input || {};

    if (!bashLooksDestructive(ti.command)) { debug("no destructive match; allowing"); return process.exit(0); }

    // MATCHED: fail-CLOSED-to-ASK. The opt-out check fails safe toward "not disabled" on any error
    // (above), so a broken settings file still asks; only an explicit destructiveGuard:false allows.
    if (destructiveGuardDisabledForProject(input)) {
      debug("destructive guard disabled for this project (udflow.destructiveGuard=false); allowing");
      return process.exit(0);
    }
    const out = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          "udflow safety-net: this Bash command matches a high-confidence destructive pattern " +
          "(git reset --hard / git push --force / rm -rf / find -delete / dd of= / mkfs / shred). " +
          "These are unrecoverable — confirm the target is intended before running. This is a best-effort " +
          "net (only obvious forms are caught; interpreter one-liners and obfuscated forms slip), so do not " +
          "rely on it alone. Disable for this project with \"udflow\": { \"destructiveGuard\": false } in " +
          ".claude/settings.json."
      }
    };
    debug("ASK: " + String(ti.command).slice(0, 200));
    // write-then-exit: flush the ask JSON before exiting so a full buffer can't truncate it
    return process.stdout.write(JSON.stringify(out), () => process.exit(0));
  } catch (e) { debug("error: " + (e && e.message)); }
  return process.exit(0);
});
