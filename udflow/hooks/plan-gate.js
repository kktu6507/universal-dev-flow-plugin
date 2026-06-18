#!/usr/bin/env node
// udflow plan gate: block Write/Edit/MultiEdit while permission mode is "plan".
// Cross-platform (runs on Node, which Claude Code already requires).
// Read-only/allow on any error so the hook never breaks a session.
const os = require("os");
const path = require("path");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("error", () => process.exit(0));
const _watchdog = setTimeout(() => process.exit(0), 5000); _watchdog.unref();
process.stdin.on("data", (c) => { raw += c; });
process.stdin.on("end", () => {
  let allow = function () { process.exit(0); };
  try {
    const input = JSON.parse(raw || "{}");
    const tool = input.tool_name || "";
    const mode = input.permission_mode || "";
    const blocked = tool === "Write" || tool === "Edit" || tool === "MultiEdit" || tool === "NotebookEdit";

    // Exempt ONLY Claude Code's own plan files under the user home (~/.claude/plans/).
    // Plan mode itself writes the plan there, so blocking it would break the native flow.
    // Anchor to the resolved home path (not a bare substring) so a repo-local
    // ".claude/plans/" directory cannot be used to bypass the plan-mode write gate.
    const ti = input.tool_input || {};
    const targetPath = ti.file_path || ti.path || ti.notebook_path || "";
    let isPlanFile = false;
    if (targetPath) {
      try {
        const resolved = path.resolve(String(targetPath)).replace(/\\/g, "/").toLowerCase();
        const planRoot = path.join(os.homedir(), ".claude", "plans").replace(/\\/g, "/").toLowerCase() + "/";
        isPlanFile = resolved.startsWith(planRoot);
      } catch (e) { isPlanFile = false; }
    }

    if (mode === "plan" && blocked && !isPlanFile) {
      const out = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "udflow plan gate: file modifications are blocked while in plan mode. Present the plan via ExitPlanMode and get approval before implementing."
        }
      };
      process.stdout.write(JSON.stringify(out));
      return process.exit(0);
    }
  } catch (e) { /* fall through to allow */ }
  return allow();
});
