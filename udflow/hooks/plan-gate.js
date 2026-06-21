#!/usr/bin/env node
// udflow plan gate: while permission mode is "plan", deny structured edits
// (Write/Edit/MultiEdit/NotebookEdit) except Claude Code's own plan files under
// ~/.claude/plans/, and deny Bash commands that obviously write the working tree
// (redirect-to-file, tee-to-file, sed -i, git apply). The Bash check is a narrow
// tripwire for the common cases — not full shell classification; it defaults to allow.
// Cross-platform Node; fail-open (exit 0 = allow) on any error so it never breaks a session.
const os = require("os");
const path = require("path");
const fs = require("fs");

const MAX_STDIN = 5 * 1024 * 1024; // cap to avoid unbounded buffering of a large tool_input

function debug(msg) {
  if (!process.env.UDFLOW_HOOK_DEBUG) return;
  try { fs.appendFileSync(path.join(os.tmpdir(), "udflow-hook.log"), "[plan-gate] " + msg + "\n"); } catch (e) {}
  try { process.stderr.write("[udflow plan-gate] " + msg + "\n"); } catch (e) {}
}

// Resolve symlinks on the deepest existing ancestor (the target file may not exist yet),
// so a symlink under a "plans" path cannot redirect the exemption elsewhere.
function realpathDeepest(p) {
  let cur = p;
  for (let i = 0; i < 64; i++) {
    if (fs.existsSync(cur)) {
      const real = fs.realpathSync(cur);
      const rest = path.relative(cur, p);
      return rest ? path.join(real, rest) : real;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return p;
}

// Narrow tripwire: does this Bash command obviously write the working tree? Conservative,
// defaults to allow — false positives are worse than the documented miss list. It deliberately
// does NOT catch: no-space redirects (echo x>f), `>|`, $VAR/~ targets, cp/mv, or interpreter
// one-liners (node -e fs.writeFileSync / python -c open(...,'w') / xargs touch) — those are
// unbounded to classify and tightening the redirect form would false-positive on arithmetic
// like $((a>b)). git checkout/restore and read-only commands stay allowed. The covered set is a
// safety net, not a guarantee — the workflow rule (no Bash tree-writes while planning) plus a
// default plan mode are the real guard; see SKILL.md and the README "Plan gate" section.
function bashLooksLikePlanWrite(command) {
  const cmd = String(command || "");
  // Drop quoted spans first so a literal ">" inside quotes doesn't count. Kept simple and
  // non-recursive so a multi-MB hostile string can't overflow the regex stack; a stray
  // apostrophe in an unquoted word can still mis-pair (an accepted, tested miss).
  const unquoted = cmd.replace(/'[^']*'|"[^"]*"/g, " ");
  const obviousWritePatterns = [
    // redirect to a file (>, >>, &>) after start/space/separator; exempt fd-dups (2>&1),
    // /dev/null, NUL. Target must be a literal path/word (so > $VAR and > ~ slip — accepted).
    /(?:^|[\s;&|])(?:\d?>|>>|&>)\s*(?!&?\d\b|\/dev\/null\b|NUL\b)(?:\.{0,2}[\\/]|[A-Za-z]:[\\/]|[A-Za-z0-9_.][A-Za-z0-9_.-]*)/i,
    // tee writing to a file (skipping flags); /dev/null and NUL exempt.
    /(?:^|[\s;&|])tee\s+(?:-[A-Za-z]+\s+)*(?!\/dev\/null\b|NUL\b)(?:\.{0,2}[\\/]|[A-Za-z]:[\\/]|[A-Za-z0-9_.][A-Za-z0-9_.-]*)/i,
    // sed in place: bare -i, -i<suffix> (e.g. -i.bak), or --in-place, within the sed arg span.
    /(?:^|[\s;&|])sed\b(?=[^;&|]*\s(?:-[A-Za-z]*i[\w.-]*|--in-place\b))/i,
    // perl in place: -i / -i.bak / -pi / -ni etc. (the -i flag is always an in-place rewrite).
    /(?:^|[\s;&|])perl\b(?=[^;&|]*\s-[A-Za-z]*i)/i,
    // truncate: always resizes (and creates) the named file.
    /(?:^|[\s;&|])truncate\s+\S/i,
    // dd writing to a file via of= (exempt of=/dev/null, of=NUL); without of= dd writes stdout.
    /(?:^|[\s;&|])dd\s(?=[^;&|]*\bof=)(?![^;&|]*\bof=(?:\/dev\/null\b|NUL\b))/i,
    // ln creating a link (symbolic or hard) — writes a new directory entry into the tree.
    /(?:^|[\s;&|])ln\s+(?:-[A-Za-z]+\s+)*\S/i,
    // git apply that actually applies — exempt dry-run/report-only flags.
    /(?:^|[\s;&|])git\s+apply\b(?![^;&|]*\s--(?:check|stat|numstat|summary)\b)/i
  ];
  return obviousWritePatterns.some((re) => re.test(unquoted));
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("error", () => process.exit(0));
const _watchdog = setTimeout(() => process.exit(0), 5000); _watchdog.unref();
process.stdin.on("data", (c) => {
  raw += c;
  if (raw.length > MAX_STDIN) { debug("stdin over cap; allowing"); try { process.stdin.pause(); } catch (e) {} process.exit(0); }
});
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const tool = input.tool_name || "";
    const mode = input.permission_mode || input.permissionMode || "";
    const ti = input.tool_input || {};
    const editBlocked = tool === "Write" || tool === "Edit" || tool === "MultiEdit" || tool === "NotebookEdit";
    const bashBlocked = tool === "Bash" && bashLooksLikePlanWrite(ti.command);

    const targetPath = ti.file_path || ti.path || ti.notebook_path || "";
    let isPlanFile = false; // only relevant for structured edits to ~/.claude/plans
    if (targetPath) {
      try {
        // Compare case-insensitively ONLY on the case-insensitive filesystems (Windows, macOS).
        // On case-sensitive systems (Linux), folding case would wrongly exempt a real directory
        // named e.g. ~/.claude/PLANS — widening the writable-exemption set. Match the FS instead.
        const caseInsensitiveFS = process.platform === "win32" || process.platform === "darwin";
        const norm = (s) => { s = s.replace(/\\/g, "/"); return caseInsensitiveFS ? s.toLowerCase() : s; };
        let resolved = path.resolve(String(targetPath));
        try { resolved = realpathDeepest(resolved); } catch (e) {}
        resolved = norm(resolved);
        const planRoot = norm(path.join(os.homedir(), ".claude", "plans")) + "/";
        isPlanFile = resolved.startsWith(planRoot);
      } catch (e) { isPlanFile = false; }
    }

    const deny = (editBlocked && !isPlanFile) || bashBlocked;
    debug("tool=" + tool + " mode=" + mode + " editBlocked=" + editBlocked + " bashBlocked=" + bashBlocked + " isPlanFile=" + isPlanFile);

    if (mode === "plan" && deny) {
      const out = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: bashBlocked
            ? "udflow plan gate: this Bash command looks like a working-tree write (>, tee, sed -i, perl -i, truncate, dd of=, ln, git apply), so it is blocked while in plan mode. This is a best-effort heuristic — if the command is read-only, writes outside the working tree (e.g. to /tmp), or a dry run, present the plan via ExitPlanMode and run it after approval, or adjust it. Only obvious writes are caught, not all Bash (e.g. interpreter one-liners slip), so do not use Bash to modify the tree while planning regardless."
            : "udflow plan gate: file modifications are blocked while in plan mode. Present the plan via ExitPlanMode and get approval before implementing."
        }
      };
      debug("DENY");
      // write-then-exit: flush the deny JSON before exiting so a full buffer can't truncate it
      return process.stdout.write(JSON.stringify(out), () => process.exit(0));
    }
  } catch (e) { debug("error: " + (e && e.message)); }
  return process.exit(0);
});
