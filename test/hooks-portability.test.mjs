// Cross-harness portability of the WIRED hook commands (the 0.19.0 fix). Hook launch
// must NOT depend on POSIX ${VAR} shell expansion: the GitHub Copilot CLI runs hooks
// via PowerShell on Windows, where ${CLAUDE_PLUGIN_ROOT} is an empty PowerShell variable
// (env vars are $env:), not the path — so node got an unresolved path, the hook
// "errored", and Copilot fail-closed denied every Bash/edit, bricking the session.
// These tests lock in (1) the command SHAPE (node -e bootstrap reading process.env, no
// bare ${...}-as-path) and (2) its BEHAVIOR under each shell available on this machine
// (allow non-plan, deny plan-write, launch the other hooks, and fail OPEN when the root
// is unresolvable). We run the exact wired command via `<shell> -c`, the way a harness does.
import { test } from "node:test";
import assert from "node:assert";
import cp from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = path.join(root, "udflow");
const HOOKS = JSON.parse(fs.readFileSync(path.join(PLUGIN, "hooks", "hooks.json"), "utf8")).hooks;

const WIRED = [
  { event: "PreToolUse", file: "plan-gate.js" },
  { event: "SessionStart", file: "load-failure-memory.js" },
  { event: "Stop", file: "orchestration-check.js" },
];
const cmdFor = (event) => HOOKS[event][0].hooks[0].command;

const NONPLAN = JSON.stringify({ tool_name: "Bash", tool_input: { command: "echo hi" } });
const PLANWRITE = JSON.stringify({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: "/tmp/x.txt" } });

// Which `<shell> -c` shells exist here? bash is everywhere; pwsh/powershell typically only on Windows.
function shellOK(sh) {
  const r = cp.spawnSync(sh, ["-c", "exit 0"], { stdio: "ignore" });
  return r.error == null && r.status === 0;
}
const BASH = shellOK("bash") ? "bash" : null;
const PWSH = ["pwsh", "powershell"].find(shellOK) || null;

function runVia(shell, command, input, extraEnv, cwd) {
  const r = cp.spawnSync(shell, ["-c", command], { input, encoding: "utf8", cwd, env: { ...process.env, ...extraEnv } });
  return { status: r.status, stdout: r.stdout || "" };
}

// (1) Static shape — the regression guard for the exact bug.
for (const { event, file } of WIRED) {
  test(`${event} command is a portable, fail-open node -e bootstrap (${file})`, () => {
    const c = cmdFor(event);
    assert.match(c, /^node -e /, "must launch via `node -e` so node — not the shell — resolves the path");
    assert.ok(c.includes("process.env.CLAUDE_PLUGIN_ROOT"), "must resolve the plugin root from process.env at runtime");
    assert.ok(c.includes("catch") && c.includes("process.exit(0)"), "must fail open (try/catch -> exit 0)");
    assert.ok(c.includes("hooks/" + file), `must require hooks/${file}`);
    // the bricking form was `node "${CLAUDE_PLUGIN_ROOT}/hooks/<file>"` — the var used directly as the path,
    // which PowerShell does not expand. The portable form must never reintroduce it.
    assert.ok(!/\$\{[A-Z_]*ROOT\}\/hooks\//.test(c), "must not use any ${...ROOT} directly as the script path (the bricking form)");
  });
}

// (2) Behavior under each available shell — both harnesses export CLAUDE_PLUGIN_ROOT as an env var.
function shellSuite(label, shell) {
  const env = { CLAUDE_PLUGIN_ROOT: PLUGIN };

  test(`[${label}] plan-gate ALLOWS a non-plan Bash (exit 0, no deny)`, () => {
    const r = runVia(shell, cmdFor("PreToolUse"), NONPLAN, env);
    assert.strictEqual(r.status, 0, "must launch and exit 0");
    assert.ok(!r.stdout.includes('"deny"'), "a non-plan command must be allowed");
  });

  test(`[${label}] plan-gate DENIES a plan-mode Write (logic intact)`, () => {
    const r = runVia(shell, cmdFor("PreToolUse"), PLANWRITE, env);
    assert.strictEqual(r.status, 0);
    assert.ok(r.stdout.includes('"deny"'), "a plan-mode write must be denied");
  });

  test(`[${label}] SessionStart and Stop hooks launch without error`, () => {
    assert.strictEqual(runVia(shell, cmdFor("SessionStart"), JSON.stringify({ hook_event_name: "SessionStart" }), env).status, 0);
    assert.strictEqual(runVia(shell, cmdFor("Stop"), JSON.stringify({ hook_event_name: "Stop" }), env).status, 0);
  });

  test(`[${label}] resolves the Copilot fallbacks (COPILOT_PLUGIN_ROOT / PLUGIN_ROOT)`, () => {
    // These two are the literal reason this is a "Copilot" fix; assert each resolves the hook on its own.
    for (const v of ["COPILOT_PLUGIN_ROOT", "PLUGIN_ROOT"]) {
      const e = { ...process.env };
      delete e.CLAUDE_PLUGIN_ROOT; delete e.COPILOT_PLUGIN_ROOT; delete e.PLUGIN_ROOT;
      e[v] = PLUGIN;
      const r = cp.spawnSync(shell, ["-c", cmdFor("PreToolUse")], { input: PLANWRITE, encoding: "utf8", cwd: os.tmpdir(), env: e });
      assert.strictEqual(r.status, 0, `${v}: must launch`);
      assert.ok((r.stdout || "").includes('"deny"'), `${v}: the fallback must resolve the hook (plan-write denied)`);
    }
  });

  test(`[${label}] fail-open: unresolvable plugin root -> exit 0 (never bricks the session)`, () => {
    // No plugin-root env vars + run from a dir with no ./hooks, so require() fails -> catch -> exit 0.
    const e = { ...process.env };
    delete e.CLAUDE_PLUGIN_ROOT; delete e.COPILOT_PLUGIN_ROOT; delete e.PLUGIN_ROOT;
    const r = cp.spawnSync(shell, ["-c", cmdFor("PreToolUse")], { input: NONPLAN, encoding: "utf8", cwd: os.tmpdir(), env: e });
    assert.strictEqual(r.status, 0, "an unresolvable root must fail open, not error");
  });
}

if (BASH) shellSuite("bash", BASH);
else test("bash unavailable on this platform -> shell suite skipped", { skip: true }, () => {});

if (PWSH) shellSuite("powershell", PWSH);
else test("powershell unavailable on this platform -> shell suite skipped", { skip: true }, () => {});
