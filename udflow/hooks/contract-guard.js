#!/usr/bin/env node
// udflow contract guard (PreToolUse, Write/Edit/MultiEdit only). Protects the two contract-level
// artifacts a run depends on from being silently weakened by the SAME tool call that is supposed to
// be extending them: the per-run machine contract (udflowOp/output/contract.md — 0.42.0 layout — or the
// legacy output/udflow/contract.md; references/task-contract.md)
// and, for design.md, whole-section deletion (references/design-spec.md). This is content-based, NOT
// actor-based: PreToolUse only ever sees tool_name/tool_input/cwd/permission_mode — never who or what
// agent is driving the call — so this hook cannot and does not distinguish "the implementer editing its
// own contract" from any other Write/Edit/MultiEdit that happens to target these two files. It compares
// the CURRENT on-disk content against the tool's PROPOSED resulting content (simulated locally, the tool
// is never actually invoked) and only ever asks — never denies — when the diff would drop a previously
// recorded acceptance criterion / mustNotChange / scope path, downgrade risk, or delete a whole design.md
// section. A false positive costs one keystroke (the pragmatism axiom: false positives are worse than a
// documented miss), so this stays conservative and fails open (silent allow) on anything it cannot
// confidently simulate: unreadable/missing old file, an old_string that doesn't match, a malformed shape,
// or any unexpected error. Per-project opt-out via .claude/settings.json "udflow": { "contractGuard": false }.
// Cross-platform Node built-ins only (fs/os/path); never crashes a session.
const os = require("os");
const path = require("path");
const fs = require("fs");

const MAX_STDIN = 5 * 1024 * 1024; // cap to avoid unbounded buffering of a large tool_input (bytes)

// debug() kept in sync with plan-gate.js / destructive-guard.js / load-failure-memory.js / compact-fidelity.js / orchestration-check.js (documented copy — see P3 garden hash guard)
function debug(msg) {
  if (!process.env.UDFLOW_HOOK_DEBUG) return;
  try { fs.appendFileSync(path.join(os.tmpdir(), "udflow-hook.log"), "[contract-guard] " + msg + "\n"); } catch (e) {}
  try { process.stderr.write("[udflow contract-guard] " + msg + "\n"); } catch (e) {}
}

// Is `file_path` the run's task contract? Path-normalized relative to CLAUDE_PROJECT_DIR, falling back
// to the event's cwd — same root-resolution precedence plan-gate.js/destructive-guard.js use. Root-anchored
// deliberately: contract.md lives at one of exactly two fixed paths — udflowOp/output/contract.md (the
// 0.42.0 layout) or output/udflow/contract.md (legacy, pre-migration runs; references/task-contract.md) —
// unlike design.md. Returns the matched repo-relative path (used as the ask label), or "" when the
// target is neither (same falsy semantics as the previous boolean).
function matchTaskContractPath(targetPath, input) {
  if (!targetPath) return "";
  try {
    const root = process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || "";
    if (!root) return "";
    const got = path.resolve(String(targetPath)).replace(/\\/g, "/").toLowerCase();
    for (const rel of [["udflowOp", "output", "contract.md"], ["output", "udflow", "contract.md"]]) {
      if (got === path.resolve(root, ...rel).replace(/\\/g, "/").toLowerCase()) return rel.join("/");
    }
    return "";
  } catch (e) { return ""; }
}

// Is `file_path` a design.md contract? Matched by BASENAME only, anywhere — design-spec.md sanctions a
// documented non-root path for design.md, so this deliberately does NOT root-anchor (unlike contract.md).
function isDesignMdPath(targetPath) {
  if (!targetPath) return false;
  try { return path.basename(String(targetPath)).toLowerCase() === "design.md"; } catch (e) { return false; }
}

// Read the current on-disk content of a target. Absence / unreadable is NOT an error here — it just
// means there is no "old" content to diff against (the caller treats null as the first-write case).
function readCurrent(targetPath) {
  try { return fs.readFileSync(targetPath, "utf8"); } catch (e) { return null; }
}

// Replace only the FIRST occurrence of `search` in `str` with the LITERAL text of `replacement`,
// matching the real Edit/MultiEdit tool's default (non-replace_all) semantics. Deliberately NOT
// `str.replace(search, replacement)`: String#replace treats `$&`/`$$`/`$1`.../`` $` ``/`$'` in the
// REPLACEMENT string specially even when `search` is a plain string (not a regex) — markdown/JSON
// contract content can plausibly contain a literal "$" (e.g. a mustNotChange entry naming a shell
// variable), so a bare .replace() could simulate a result the real tool would never produce. Caller
// guarantees `search` is already `.includes()`-confirmed present in `str`.
function replaceFirstLiteral(str, search, replacement) {
  const i = str.indexOf(search);
  return str.slice(0, i) + replacement + str.slice(i + search.length);
}

// Simulate the tool's proposed resulting content without ever invoking the tool. Returns the resulting
// string, or null when the simulation cannot be trusted (missing/mismatched old_string, malformed edits
// array) — the caller treats null as "cannot confidently simulate -> fail open / allow".
function simulateResult(tool, ti, current) {
  if (tool === "Write") {
    return typeof ti.content === "string" ? ti.content : null;
  }
  if (tool === "Edit") {
    if (typeof current !== "string") return null; // no old content to apply against
    if (typeof ti.old_string !== "string" || typeof ti.new_string !== "string") return null;
    if (!current.includes(ti.old_string)) return null; // old_string not found -> don't guess
    // Real Edit replaces only the FIRST occurrence by default (this hook never reads replace_all).
    return replaceFirstLiteral(current, ti.old_string, ti.new_string);
  }
  if (tool === "MultiEdit") {
    if (typeof current !== "string") return null;
    if (!Array.isArray(ti.edits)) return null;
    let running = current;
    for (const e of ti.edits) {
      if (!e || typeof e.old_string !== "string" || typeof e.new_string !== "string") return null;
      if (!running.includes(e.old_string)) return null; // any step failing -> fail open for the WHOLE call
      // Same first-occurrence-only semantics as the Edit branch above (real MultiEdit steps default
      // to replacing only the first match unless replace_all is set, which this hook never reads).
      running = replaceFirstLiteral(running, e.old_string, e.new_string);
    }
    return running;
  }
  return null;
}

// Extract the FIRST ```json fenced block and JSON.parse it. Small local reimplementation (contract-check.mjs
// is an ESM module using import/export; this hook is CommonJS like every other hook, so reimplementing this
// ~10-line extractor is the established pattern here, not a shortcut). Returns null on absence/parse error.
function extractContractJson(markdown) {
  if (typeof markdown !== "string") return null;
  const m = markdown.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

const RISK_ORDINAL = { low: 0, medium: 1, high: 2 };

// Compare an old vs new parsed contract.md JSON block. Returns an array of human-readable reason strings
// (empty array = no findings). Guards Array.isArray before iterating so a malformed shape falls through
// to "no findings" (fail-open) rather than throwing.
function diffContractJson(oldC, newC) {
  const reasons = [];

  const oldACs = Array.isArray(oldC.acceptanceCriteria) ? oldC.acceptanceCriteria : [];
  const newACs = Array.isArray(newC.acceptanceCriteria) ? newC.acceptanceCriteria : [];
  for (const a of oldACs) {
    if (!a) continue;
    if (typeof a.id === "undefined") {
      // id-less AC: no id to pair old<->new for a field-level diff, but a REMOVAL must still be caught.
      // Match by exact text; flag when the text no longer appears in any new AC. Skip only when there is
      // no text either (nothing identifiable to protect). Matching by content (not position) => no
      // false-ask on reorder. `id` is not required per references/task-contract.md.
      if (typeof a.text === "undefined") continue;
      if (!newACs.some((b) => b && b.text === a.text)) reasons.push(`acceptance criterion "${a.text}" would be removed or its text changed`);
      continue;
    }
    const match = newACs.find((b) => b && b.id === a.id);
    if (!match) { reasons.push(`acceptance criterion "${a.id}" would be removed`); continue; }
    if (match.text !== a.text) reasons.push(`acceptance criterion "${a.id}" text would change ("${a.text}" -> "${match.text}")`);
    if (match.behaviorChanging !== a.behaviorChanging) reasons.push(`acceptance criterion "${a.id}" behaviorChanging would change (${a.behaviorChanging} -> ${match.behaviorChanging})`);
    if (match.verification !== a.verification) reasons.push(`acceptance criterion "${a.id}" verification would change ("${a.verification}" -> "${match.verification}")`);
  }

  const oldMNC = Array.isArray(oldC.mustNotChange) ? oldC.mustNotChange : [];
  const newMNC = Array.isArray(newC.mustNotChange) ? newC.mustNotChange : [];
  for (const s of oldMNC) {
    if (!newMNC.includes(s)) reasons.push(`mustNotChange entry "${s}" would be removed`);
  }

  const oldAllowed = Array.isArray(oldC.allowedPaths) ? oldC.allowedPaths : [];
  const newAllowed = Array.isArray(newC.allowedPaths) ? newC.allowedPaths : [];
  for (const s of oldAllowed) {
    if (!newAllowed.includes(s)) reasons.push(`allowedPaths entry "${s}" would be removed`);
  }

  const oldForbidden = Array.isArray(oldC.forbiddenPaths) ? oldC.forbiddenPaths : [];
  const newForbidden = Array.isArray(newC.forbiddenPaths) ? newC.forbiddenPaths : [];
  for (const s of oldForbidden) {
    if (!newForbidden.includes(s)) reasons.push(`forbiddenPaths entry "${s}" would be removed`);
  }

  // risk: only flag a LOWER new ordinal. A missing old risk is "no claim" (never a baseline); an
  // increase (e.g. medium -> high) must never flag. Normalize case/whitespace before the ordinal
  // lookup so a downgrade written as "Low"/"LOW"/" low "/"Medium" isn't missed by a bare-string
  // lookup miss (this hook is the sole automated control on the risk field).
  const oldOrd = RISK_ORDINAL[String(oldC.risk).trim().toLowerCase()];
  const newOrd = RISK_ORDINAL[String(newC.risk).trim().toLowerCase()];
  if (typeof oldOrd === "number" && typeof newOrd === "number" && newOrd < oldOrd) {
    reasons.push(`risk would be downgraded ("${oldC.risk}" -> "${newC.risk}")`);
  }

  return reasons;
}

// Extract normalized level-2 (## ) heading lines: trim + collapse internal whitespace. Exact match only
// (no fuzzy/substring) — "## Color" must not match inside "## Color Palette & Roles".
function extractHeadings(markdown) {
  if (typeof markdown !== "string") return [];
  const out = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(/^\s*##\s+(.+?)\s*$/);
    if (m) out.push(m[1].replace(/\s+/g, " ").trim());
  }
  return out;
}

// Flag ONLY a heading present in old content with zero exact-normalized-match in new content (a whole
// section wholesale-deleted). A section whose heading survives but whose body was edited/expanded/reduced
// to "n/a" is NOT flagged — heading presence only, never body content.
function diffDesignHeadings(oldContent, newContent) {
  const oldHeadings = extractHeadings(oldContent);
  const newHeadings = new Set(extractHeadings(newContent));
  const reasons = [];
  for (const h of oldHeadings) {
    if (!newHeadings.has(h)) reasons.push(`design.md section "## ${h}" would be removed entirely`);
  }
  return reasons;
}

// Project opt-out: a project may disable this guard for its OWN sessions by setting
// "udflow": { "contractGuard": false } in .claude/settings.json (or settings.local.json, which takes
// precedence). Mirrors plan-gate.js's / destructive-guard.js's opt-out exactly, including the FAIL-SAFE:
// a missing file, parse error, oversized config, or any read error counts as "not disabled" (keep asking).
// settings-flag reader (DisabledForProject + readFlag pair) kept in sync with plan-gate.js / destructive-guard.js / compact-fidelity.js (documented copy — see P3 garden hash guard)
function contractGuardDisabledForProject(input) {
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

// Read udflow.contractGuard from a settings file: true/false when set, undefined otherwise (missing
// file / not set / any error). Caps the read so a pathological settings file can't stall the hook.
function readGuardFlag(file) {
  try {
    let size = 0;
    try { size = fs.statSync(file).size; } catch (e) { return undefined; } // not present / unstatable
    if (size > 1024 * 1024) return undefined;
    const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
    const v = cfg && cfg.udflow && cfg.udflow.contractGuard;
    return v === false ? false : (v === true ? true : undefined);
  } catch (e) { return undefined; }
}

// stdin reader kept in sync with plan-gate.js / destructive-guard.js / load-failure-memory.js / compact-fidelity.js / orchestration-check.js (documented copy — see P3 garden hash guard)
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
    if (tool !== "Write" && tool !== "Edit" && tool !== "MultiEdit") return process.exit(0); // no-op for everything else
    const ti = input.tool_input || {};
    const targetPath = ti.file_path || "";
    if (!targetPath) return process.exit(0);

    const contractLabel = matchTaskContractPath(targetPath, input); // matched rel path, or ""
    const isContract = contractLabel !== "";
    const isDesign = !isContract && isDesignMdPath(targetPath); // mutually exclusive by construction
    if (!isContract && !isDesign) return process.exit(0); // the overwhelming majority of edits: no-op

    const current = readCurrent(targetPath); // null = absent/unreadable (no "old" to compare)
    const proposed = simulateResult(tool, ti, current);
    if (proposed === null) { debug("cannot confidently simulate the result; allowing"); return process.exit(0); }

    let reasons = [];
    if (isContract) {
      const oldJson = extractContractJson(current);
      if (oldJson == null) {
        // No parseable old JSON block (file absent, unreadable, or no old block): ALWAYS allow,
        // unconditionally — this is the sanctioned first-ever write case (references/task-contract.md).
        debug("contract.md: no prior JSON block; first-write case, allowing unconditionally");
        return process.exit(0);
      }
      const newJson = extractContractJson(proposed);
      if (newJson == null) {
        reasons.push("the machine ```json block would be lost entirely (an already-populated contract would become unparseable/absent)");
      } else {
        reasons = diffContractJson(oldJson, newJson);
      }
    } else {
      // design.md: only defined when there WAS old content to compare a heading against. No old file /
      // unreadable old file has no headings to lose, so reasons stays empty (allow) by construction.
      if (typeof current === "string") reasons = diffDesignHeadings(current, proposed);
    }

    if (reasons.length === 0) { debug("no findings; allowing"); return process.exit(0); }

    if (contractGuardDisabledForProject(input)) {
      debug("contract guard disabled for this project (udflow.contractGuard=false); allowing");
      return process.exit(0);
    }

    const label = isContract ? contractLabel : "design.md";
    const out = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          `udflow contract guard: this ${tool} to ${label} would remove or weaken previously recorded ` +
          "contract content:\n- " + reasons.join("\n- ") +
          "\nConfirm this is intentional (a legitimate supersede/rewrite) before proceeding. This is a " +
          "content-based check (it cannot tell WHO is making the edit) and only ever asks, never denies. " +
          "Disable for this project with \"udflow\": { \"contractGuard\": false } in .claude/settings.json."
      }
    };
    debug("ASK: " + reasons.join(" | "));
    // write-then-exit: flush the ask JSON before exiting so a full buffer can't truncate it
    return process.stdout.write(JSON.stringify(out), () => process.exit(0));
  } catch (e) { debug("error: " + (e && e.message)); }
  return process.exit(0);
});
