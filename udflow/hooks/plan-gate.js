#!/usr/bin/env node
// udflow plan gate: deny structured edits (Write/Edit/MultiEdit/NotebookEdit) while
// permission mode is "plan", except Claude Code's own plan files under ~/.claude/plans/.
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
    const blocked = tool === "Write" || tool === "Edit" || tool === "MultiEdit" || tool === "NotebookEdit";

    const ti = input.tool_input || {};
    const targetPath = ti.file_path || ti.path || ti.notebook_path || "";
    let isPlanFile = false;
    if (targetPath) {
      try {
        let resolved = path.resolve(String(targetPath));
        try { resolved = realpathDeepest(resolved); } catch (e) {}
        resolved = resolved.replace(/\\/g, "/").toLowerCase();
        const planRoot = path.join(os.homedir(), ".claude", "plans").replace(/\\/g, "/").toLowerCase() + "/";
        isPlanFile = resolved.startsWith(planRoot);
      } catch (e) { isPlanFile = false; }
    }

    debug("tool=" + tool + " mode=" + mode + " blocked=" + blocked + " isPlanFile=" + isPlanFile);

    if (mode === "plan" && blocked && !isPlanFile) {
      const out = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "udflow plan gate: file modifications are blocked while in plan mode. Present the plan via ExitPlanMode and get approval before implementing."
        }
      };
      debug("DENY");
      // write-then-exit: flush the deny JSON before exiting so a full buffer can't truncate it
      return process.stdout.write(JSON.stringify(out), () => process.exit(0));
    }
  } catch (e) { debug("error: " + (e && e.message)); }
  return process.exit(0);
});
