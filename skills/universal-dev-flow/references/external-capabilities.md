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

## MCP per reviewer (opt-in, read-only)

MCP is high context cost, so it ships disabled. The plugin's `.mcp.json` has no active servers; each reviewer's `tools:` has its `mcp__*` allowlist line commented out. To enable: add the server to `.mcp.json` (see `mcp.example.json`), then uncomment the matching `mcp__*` line in the reviewer's frontmatter. Keep reviewers read-only — only grant read-type MCP tools.

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

Note: `ui-ux-pro-max` may run a Python helper (`scripts/search.py`). If Python is unavailable in the environment, the detect step will fail gracefully and the fallback applies.

## Optional external subagents

If a more specialized external subagent is installed (e.g. a dedicated `playwright-ui` evidence agent or a `migration-runner`), prefer delegating the matching step to it; otherwise the internal reviewer/implementer handles it locally. Same Detect → Use → Else-Disclose protocol. Do not hard-depend on any external subagent — udflow must run standalone.

## Codex (optional second-opinion / rescue)

Codex is an optional cross-model (OpenAI GPT-family) "second opinion / rescue" capability. It is NOT required and must never be a hard dependency. Use it only at high-leverage moments — primarily when the auto-fix loop is stuck — never as a routine step in every task. Follow Detect → Use → Else-Disclose exactly:

1. **Detect**: confirm the Codex capability is actually present in this environment (e.g. the `codex:rescue` skill or a `codex:codex-rescue` agent exists). If you cannot confirm it is installed, treat it as unavailable.
2. **Use** (only when available): when the repair loop is stuck (the same blocker category persists across two consecutive iterations and a Stuck Summary is imminent), or when a high-risk verdict genuinely needs an independent cross-model review, you MAY delegate one independent diagnosis / implementation attempt to Codex.
3. **Else**: if it is not available, do NOT call it and do NOT pretend it ran. Continue locally and disclose (capability unavailable → handled locally → remaining uncertainty). **Detecting it as absent must never raise an error or interrupt the workflow** — it is a silent, disclosed fallback.

**Data-egress disclosure (required before delegating):** Codex runs an external (OpenAI) model and sends the relevant code/context to a third-party runtime, and it incurs additional cost. Only delegate when that is acceptable for the repository's data-sensitivity; if third-party egress is questionable, do not send — handle locally and disclose. The `gatekeeper` treats an unavailable Codex as a non-blocking gap (udflow must reach a verdict without it).
