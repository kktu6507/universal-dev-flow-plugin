# External Capabilities (MCP / external skills / external subagents)

Optional external capabilities are not guaranteed to be present in the user's environment. They follow ONE protocol.

## The Detect → Use → Else-Disclose protocol

For any MCP tool, external skill, or external subagent:

1. **Detect** availability before relying on it.
   - MCP: confirm the relevant server is connected (the `mcp__<server>__*` tools are present; the user can check with `/mcp`).
   - External skill: confirm the skill is installed/available (e.g. `ui-ux-pro-max`).
   - External subagent: confirm the subagent type exists in `/agents`.
2. **Use** it if available.
3. **Else**: do NOT call it and do NOT pretend it ran. Perform the best internal/local equivalent yourself, then **explicitly disclose to the user**:
   - which capability was unavailable,
   - what was therefore done locally instead,
   - the remaining uncertainty / verification gap.

Never present an external-assisted result as done when the capability was unavailable. The `gatekeeper` treats an unavailable *required* capability as a review/verification gap that blocks `READY` until addressed or justified.

**Absent vs. present-but-failing — disclose the right one.** A capability that is installed/detected but then *fails when invoked* — a runtime, sandbox, permission, authentication, non-zero-exit, or process-spawn error — is NOT "not installed". Disclose it as **"detected but could not execute, with the reason"**, and point at the likely fix (configuration, authentication, or sandbox/permission), not at (re)installation. Do not relay a tool's own "not installed / run the installer" message when the tool is actually present but mis-executing: that sends the user to a useless reinstall and hides the real cause. When an underlying error is reported (e.g. a spawn failure), surface it verbatim instead of re-labeling it as missing.

## Native plan mode (drive the gate, don't assume it)

The plan gate's read-only enforcement comes from the PreToolUse hook, which only denies while `permission_mode === "plan"`. So udflow must *drive* native plan mode rather than assume the user is in it. Apply Detect → Use → Else-Disclose at the start of a non-trivial task:

1. **Detect**: is the session already in plan mode? does the runtime expose a plan-mode entry (e.g. `EnterPlanMode`)?
2. **Use**: if already in plan mode, proceed. Else, if an entry exists, enter plan mode, then do requirement understanding and planning read-only and present via `ExitPlanMode`.
3. **Else**: if no programmatic switch is available, proceed read-only by discipline and **disclose** that the hook is not enforcing read-only this session; recommend setting a default plan mode in `~/.claude/settings.json` (or the project `.claude/settings.json`) for a hard guarantee.

Never hard-depend on a plan-mode entry tool and never claim "always enforces read-only" when running in branch 3. Keep the `~/.claude/plans/` exemption in `plan-gate.js` so entering plan mode can still write its own plan file. The hook catches only *obvious* `Bash` writes (a narrow tripwire); do not rely on it — do not modify the working tree via Bash during planning.

## MCP per reviewer (opt-in, read-only)

MCP is high context cost, so it ships disabled. The plugin's `.mcp.json` has no active servers; each reviewer's `tools:` has its `mcp__*` allowlist line commented out. To enable: add the server to `.mcp.json` (see `mcp.example.json`), then uncomment the matching `mcp__*` line in the reviewer's frontmatter. Keep reviewers read-only — only grant read-type MCP tools.

**Prefer specific tool names over a `mcp__<server>__*` wildcard.** The wildcard grants *every* tool that server exposes — including any mutating ones (e.g. a GitHub MCP's create-PR / comment / merge tools), which silently breaks the read-only contract. For a server that has write tools, list only the read tools the reviewer needs (e.g. `mcp__github__get_pull_request`, `mcp__github__get_pull_request_diff`) instead of `mcp__github__*`.

Suggested mapping (all read-only):
- `security-reviewer`: `mcp__semgrep`, `mcp__osv` (SAST, CVE/dependency) — never let it touch secrets.
- `test-reviewer` / `ui-ux-reviewer`: `mcp__playwright` (browser evidence).
- `code-reviewer`: `mcp__github` (diff/PR context).
- `operability-reviewer`: observability MCP (Sentry/Datadog/Grafana) — production data is sensitive; read-only, minimal scope.
- `spec-reviewer`: issue/PM tracker MCP (Jira/Linear/GitHub Issues).

## ui-ux-pro-max (preferred external skill for UI work)

`ui-ux-pro-max` is a model-invoked design-intelligence skill (UI styles, color palettes, font pairings, UX guidelines, accessibility checks). When ANY task involves UI/frontend rendering, layout, styling, components, or user-facing states:

- **If `ui-ux-pro-max` is available**: invoke it FIRST for design decisions during planning and before UI implementation, and incorporate its guidance in `ui-ux-reviewer`. This is what keeps generated UI from looking poor.
- **If it is unavailable**: fall back to internal `ui-ux-reviewer` guidance and standard responsive/accessibility defaults, and disclose that ui-ux-pro-max was not used.

Note: `ui-ux-pro-max` may run a Python helper (`scripts/search.py`) locally. If Python is unavailable, the detect step fails gracefully and the fallback applies. Disclosure: that helper executes local code and, depending on its implementation, may perform network/data egress — treat it like any optional external capability and only use it when that is acceptable for the repository's data sensitivity.

## Optional external subagents

If a more specialized external subagent is installed (e.g. a dedicated `playwright-ui` evidence agent or a `migration-runner`), prefer delegating the matching step to it; otherwise the internal reviewer/implementer handles it locally. Same Detect → Use → Else-Disclose protocol. Do not hard-depend on any external subagent — udflow must run standalone.

## Codex (optional second-opinion / rescue)

Codex is an optional cross-model (OpenAI GPT-family) "second opinion / rescue" capability. It is **off by default**, is NOT required, and must never be a hard dependency. Follow Detect → Use → Else-Disclose, gated by an explicit per-task opt-in:

0. **Opt-in (off by default).** Do NOT use Codex unless the user explicitly enabled it for this task (e.g. the request says to use Codex, or to allow Codex when stuck). Without that explicit opt-in, do not use Codex **even if it is installed and even if the repair loop is stuck** — continue locally, and note that Codex was available but not enabled when relevant.
1. **Detect** (only after opt-in): confirm the Codex capability is actually present (e.g. the `codex:rescue` skill or a `codex:codex-rescue` agent exists). If you cannot confirm it is installed, treat it as unavailable.
2. **Use** (opted in AND available): at high-leverage moments only — primarily when the repair loop is stuck (the same blocker category persists across two consecutive iterations and a Stuck Summary is imminent), or when a high-risk verdict genuinely needs an independent cross-model review — you MAY delegate one independent diagnosis / implementation attempt to Codex. Never a routine step.
3. **Else** (not opted in, or opted in but unavailable): do NOT call it and do NOT pretend it ran. Continue locally and disclose (not enabled / unavailable → handled locally → remaining uncertainty). **Neither a missing opt-in nor an absent Codex may raise an error or interrupt the workflow** — it is a silent, disclosed fallback.

**Data-egress disclosure:** enabling Codex means consenting to send the relevant code/context to an external (OpenAI) model runtime (a third party), at additional cost. Only opt in when that is acceptable for the repository's data-sensitivity. The `gatekeeper` treats a not-enabled or unavailable Codex as a non-blocking gap (udflow must reach a verdict without it).

**Installed-but-cannot-execute (the common Codex case).** If Codex is installed but a `codex` invocation *fails to run* — e.g. a Windows `CreateProcessAsUserW` / process-spawn error caused by `[windows] sandbox = "elevated"` in `~/.codex/config.toml`, or an auth/`codex login` problem — that is an **execution** failure of an installed Codex, not a missing install. Disclose it as "Codex detected but could not execute (sandbox / exec / auth error: <reason>)" and point the user at `~/.codex/config.toml` (`[windows] sandbox`) and `codex login`. Do **not** report it as "`@openai/codex` not installed" or tell the user to `npm install -g @openai/codex` when the CLI is actually present — that is misleading and fixes nothing. If the Codex helper/subagent itself returns a "not installed → reinstall" message while the CLI is in fact present, do not propagate that wording uncritically; state that Codex is present but failed to execute and give the config/auth pointer instead.
