# udflow — Universal Dev Flow (Claude Code plugin)

Risk-proportional, plan-gated multi-agent engineering workflow. Understand → plan → **approve** → implement → verify → selected review → gatekeeper readiness verdict, with failure memory and optional external capabilities.

## Components
- `skills/universal-dev-flow/` — auto-invoked orchestrator (+ `references/`).
- `skills/run/` — manual entry: `/udflow:run <task>`.
- `agents/` — 9 subagents: `implementer` (writes) + 7 read-only reviewers + `gatekeeper`. `security-reviewer` and `gatekeeper` run on `opus`; the rest inherit the session model.
- `hooks/` — `plan-gate.js` (PreToolUse: blocks writes while in plan mode) and `load-failure-memory.js` (SessionStart: injects FAILURE_MEMORY). Both are Node scripts, so they run the same on Windows PowerShell, macOS, and Linux.
- `.mcp.json` — empty by default (zero context cost). `mcp.example.json` is a copy-in template.

## Plan gate
Steps 1–2 run in plan mode; the plan is presented with ExitPlanMode and must be approved before `implementer` runs. The PreToolUse hook enforces read-only during plan mode. To start every session in plan mode, set a default mode in your own `~/.claude/settings.json` or project `.claude/settings.json` (the plugin does not force it).

## Optional external capabilities (Detect → Use → Else-Disclose)
MCP tools, external subagents, and external skills are all optional. If present, they're used; if absent, the work is done locally and the gap is disclosed. See `skills/universal-dev-flow/references/external-capabilities.md`.

- **MCP per reviewer**: disabled by default. To enable, copy a server from `mcp.example.json` into `.mcp.json`, then uncomment the matching `mcp__*` line in that reviewer's `tools:`. Keep reviewers read-only.
- **ui-ux-pro-max**: if the `ui-ux-pro-max` skill is installed, udflow uses it first for UI design decisions and in `ui-ux-reviewer`; otherwise it falls back and discloses.

## Local test
    claude --plugin-dir ./udflow
Try `/udflow:run <task>`, confirm agents in `/agents`, edit + `/reload-plugins` to hot-reload.

## Validate / distribute
    claude plugin validate .
Push to GitHub, then others: `/plugin marketplace add simba6507/universal-dev-flow-plugin` then `/plugin install udflow@kktmarketplace`.
