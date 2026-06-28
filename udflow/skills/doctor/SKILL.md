---
name: doctor
description: Self-check udflow's hooks + environment and print a paste-able health report. Only runs when the user invokes /udflow:doctor. No telemetry — local, on-demand, user-initiated.
disable-model-invocation: true
---

# udflow doctor — local self-check

Run an on-demand diagnostic of udflow's own hooks and environment, then print a **paste-able
health report**. This exists because udflow ships **no telemetry**: when a hook fails open in a
real session, nothing surfaces (the `compact-fidelity` bug was invisible for three releases). This
is the opt-in, local substitute — never a background or network call.

Be concise; this is a diagnostic, not a workflow. Run read-only checks only; do **not** modify the
project. If a step can't run, say why and continue.

## Steps

1. **Plugin root.** Resolve `$CLAUDE_PLUGIN_ROOT` (else `$COPILOT_PLUGIN_ROOT`, else `$PLUGIN_ROOT`).
   If none is set, report that hooks can't be located from here and stop with that finding.

2. **Node.** Run `node --version`. If `node` is **absent**, this is the single most common silent
   failure — **all five hooks no-op** (fail-open by design). Report it as the top finding.

3. **Hook files present.** Confirm `hooks/plan-gate.js`, `destructive-guard.js`,
   `load-failure-memory.js`, `compact-fidelity.js`, `orchestration-check.js` all exist under the root.

4. **Each hook fires + fails open.** Pipe a synthetic event to each hook with `UDFLOW_HOOK_DEBUG=1`
   and capture the **exit code** and **stderr** (the debug trace writes a `[udflow <hook>] …` line to
   stderr). For each: confirm **exit 0** (the fail-open invariant) and that a `[udflow …]` line shows
   it actually **processed** the event (not a silent no-op). Suggested probes (adapt to the shell;
   `$R` = the resolved root):
   - `printf '{"tool_name":"Write","tool_input":{},"permission_mode":"plan"}' | UDFLOW_HOOK_DEBUG=1 node "$R/hooks/plan-gate.js"` — expect a `permissionDecision` of `deny` (a plan-mode write).
   - `printf '{"tool_name":"Bash","tool_input":{"command":"git reset --hard"}}' | UDFLOW_HOOK_DEBUG=1 node "$R/hooks/destructive-guard.js"` — expect `permissionDecision: "ask"`.
   - `printf '{"source":"compact"}' | UDFLOW_HOOK_DEBUG=1 node "$R/hooks/compact-fidelity.js"` — expect **valid JSON** with `hookSpecificOutput.additionalContext` (the exact shape that broke under `PreCompact`), and a `[compact-fidelity] emitted preservation block` line.
   - `printf '{}' | UDFLOW_HOOK_DEBUG=1 node "$R/hooks/load-failure-memory.js"` — exit 0; emits a digest only if a `FAILURE_MEMORY.md` exists.
   - `printf '{}' | UDFLOW_HOOK_DEBUG=1 node "$R/hooks/orchestration-check.js"` — exit 0 (advisory/silent on an empty event).

   On Windows PowerShell, use `'{"source":"compact"}' | node "$R\hooks\compact-fidelity.js"` with
   `$env:UDFLOW_HOOK_DEBUG='1'`.

5. **Enabled?** Note that hooks only run when the plugin is **enabled** (`/plugin` → Installed →
   udflow on); if the user reports nothing happening in real sessions, confirm enablement and that
   `node` is on the PATH **the editor/agent launched with** (not just the terminal's).

## Report

Print a compact table — one row per hook: `OK` (fired, exit 0) / `no-op` (exit 0 but never processed
— usually no Node) / `FAIL` (non-zero exit, or wrong output shape) — plus the Node and plugin-root
status. End with a one-line verdict (**healthy** / **degraded** / **broken**) and, if degraded/broken,
the most likely cause and fix. Tell the user they can paste this report into a
[`Verified udflow run`](.github/ISSUE_TEMPLATE/verified-run.yml) issue or a bug report — it is the
only health signal udflow has, since it sends none on its own.
