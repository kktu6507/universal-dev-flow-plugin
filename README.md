# udflow — Universal Dev Flow (Claude Code plugin)

[![Validate](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

**English** · [繁體中文](README.zh-TW.md)

A risk-proportional, plan-gated multi-agent engineering workflow.
Understand → plan → **approve** → implement → verify → selected review → gatekeeper readiness verdict, with failure memory and optional external capabilities.

> **Status: early / experimental.** The two session hooks are tested; the orchestration is model-followed prose, and its value has not yet been measured against alternatives on external repos. Treat it as a disciplined scaffold, not a proven quality gate.

> In one line: udflow makes Claude Code lay out a plan and get your approval before it changes code, then has the right specialist reviewers check the work, and finishes with a gatekeeper verdict on whether it's shippable — instead of just saying "done."

---

## Good to know (read before installing)

What you're opting into:

- **It uses more tokens than a normal chat.** One task can spawn the `implementer`, several reviewers, and the `gatekeeper`, and `security-reviewer` + `gatekeeper` run on `opus`. Expect noticeably higher token/cost usage than a one-shot edit, and reviewers are chosen by risk so simple tasks cost less. See the rough per-run estimate below.
- **`opus` access:** `security-reviewer` and `gatekeeper` request `opus`; if your account/session can't use it, those steps fall back to the available model and verdict quality may vary.
- **The plan-gate guarantee depends on plan mode.** The read-only enforcement is a hook that only fires while you're in plan mode. udflow drives Claude Code's native plan mode itself for its planning phase (so the gate is live even if your default mode isn't plan); if the runtime can't switch modes programmatically, it proceeds read-only by discipline and **tells you** the hook isn't enforcing this session. For a hard guarantee, set a default plan mode in your settings. Note the gate covers **structured edit tools (Write/Edit/MultiEdit/NotebookEdit) only — not `Bash`**, so a shell write could bypass it; udflow's rules forbid Bash working-tree writes during planning, but that part is convention, not enforcement.
- **Installing adds hooks that run in *every* session — not only on udflow tasks:**
  - `plan-gate` (PreToolUse) is invisible during normal work; it only blocks structured edits while in plan mode (Claude Code's own plan files are exempt, so the native plan flow still works).
  - `load-failure-memory` (SessionStart) reads your recorded past-mistake notes at the start of every session and injects a short **digest** so Claude avoids repeating them; if there is no such file, it does nothing.
- **It writes files.** The workflow may create `ai/FAILURE_MEMORY.md` in your repo (a new `ai/` folder) and `~/.claude/FAILURE_MEMORY.md` in your home directory. Decide whether to commit `ai/FAILURE_MEMORY.md` or add it to `.gitignore`.
- **Codex is off by default (opt-in).** udflow does **not** use Codex unless you explicitly ask for it in a task (e.g. say to use Codex when stuck). When you enable it, it *may* — on a stuck fix — delegate one independent diagnosis to **Codex**, which runs an **external (OpenAI) model** and sends the relevant code/context to a **third party**, at **extra cost**. If you don't enable it (or it isn't installed), udflow never calls it and does not error.
- **It can engage on its own — and you can stop it.** udflow auto-starts for non-trivial engineering work even if you don't call `/udflow:run`, and stays out of trivial edits and plain Q&A. For cost control: the repair loop has a hard cap (a Stuck Summary after the same blocker persists two iterations, not unbounded), it asks before escalating to a deeper/opus-heavy pass, and you can run it manual-only by simply not describing engineering tasks in plain language and invoking `/udflow:run` when you want it.

**Rough cost per run** (ballpark from real runs — varies a lot by task size, risk, and number of fix iterations; treat as orders of magnitude, not guarantees):

| Task | Reviewers | Tokens | Wall-clock |
|------|-----------|--------|------------|
| Light | core only | ~100–250k | a few min |
| Typical | 3–5 + one repair pass | ~300–700k | ~5–15 min |
| Deep | several repair loops | >1M | 20–40 min |

`opus` reviewers and extra fix iterations raise both; running reviewers in parallel shortens wall-clock.

---

## Quick start

Prerequisites: **Claude Code** installed, and **Node.js on your PATH** (the two hooks are Node scripts — verify with `node --version`). If Node is missing, the hooks silently no-op: the plan gate won't fire and failure memory won't inject.

**1. 🪟 In your terminal, go to your project and launch Claude Code**

    cd path/to/your-project
    claude

**2. 🤖 Inside Claude Code, install (run these three lines in order)**

    /plugin marketplace add simba6507/universal-dev-flow-plugin
    /plugin install udflow@kktmarketplace
    /reload-plugins

> The first line adds the marketplace by its GitHub `owner/repo`; the second installs the `udflow` plugin from that marketplace, whose name is `kktmarketplace` (the `name` field in `marketplace.json`, not the repo name). They differ on purpose.

**3. 🤖 Hand it a task**

    /udflow:run Fix the login flow so it refreshes when the token expires

You can also just describe the task in plain language — udflow takes over automatically when it judges the work to be non-trivial engineering.

It then runs: understand → plan → present via **ExitPlanMode** for your approval → implement only after approval → verify → review → `gatekeeper` verdict. udflow enters plan mode for its planning phase so structured edits are blocked until you approve (or, if the runtime can't switch modes, it proceeds read-only by discipline and tells you the hook isn't enforcing — see [Good to know](#good-to-know-read-before-installing)).

> **Stays out of the way for small stuff.** udflow only engages for non-trivial engineering work; trivial edits and plain Q&A are left alone. Want to force the full workflow on anything? Use `/udflow:run`.

### Updating to a newer version

Already installed an older version? Refresh the marketplace and reload — no uninstall needed:

    /plugin marketplace update kktmarketplace
    /reload-plugins

Custom marketplaces do **not** auto-update, so run `marketplace update` manually. Check the installed version in `/plugin`.

### Troubleshooting

- **Install failed / can't find the plugin** — confirm the marketplace name: `/plugin marketplace list` should show `kktmarketplace`. Install is `udflow@kktmarketplace`, not `udflow@<repo>`.
- **Is the plan gate actually live?** Enter plan mode and ask Claude to edit a file — it should be blocked with a "udflow plan gate" message. If it isn't, the hook isn't firing (see next item).
- **Nothing seems to happen / gate never blocks** — check `node --version`. With no Node on PATH the hooks no-op silently. For deeper insight, set `UDFLOW_HOOK_DEBUG=1` in your environment to make the hooks write a trace (stderr / temp file); unset, they stay silent.
- **opus unavailable** — `security-reviewer` and `gatekeeper` fall back to the available model and say so in their output; verdict confidence may be lower.

---

## How it works

```
understand → plan (plan mode) → you approve → implement → verify → selected review → gatekeeper verdict
                                                                  ↑________ repair loop ________↓
```

- **Understand / plan** happen in plan mode (read-only); the plan is presented via ExitPlanMode for your approval.
- **Only after approval** does the `implementer` write code.
- **Verify** runs build / test / lint / typecheck / browser evidence as applicable.
- **Review** selects only the reviewers relevant to this change's risk (no ceremony).
- **gatekeeper** returns `READY` / `FIX REQUIRED` / `NOT READY`; if a fix is needed it enters a repair loop until ready or clearly blocked.

---

## Example: roughly what a run looks like

Say you ask: "Add a *Remember me* checkbox to the login page." udflow walks you through it like this:

```
you> /udflow:run Add a "Remember me" checkbox to the login page

udflow> [understand] Restating: add a persisted "remember me" option on the login form.
        Clarifying: how long should the session be remembered? → asks via AskUserQuestion.
you> 30 days.

udflow> [plan / plan mode]  (read-only — no files changed yet)
        - Affected: login form component + the auth/session module
        - Approach: add checkbox → on submit, set a longer-lived session when checked
        - Verify: auth unit tests + open the page and confirm the checkbox works
        Presents the plan via ExitPlanMode and waits for approval.
you> approve

udflow> [implement] implementer makes the smallest change for the plan.
        [verify] runs tests/lint; opens the page and confirms the checkbox persists the session.
        [review] risk is UI + auth behavior → spec / test / ui-ux (+ security).
        [findings] test: missing a test for the unchecked default (major).
        [repair loop] adds the test → re-runs the affected reviewers → all pass.
        [gatekeeper] READY: requirement met, behavior verified, tests cover both paths.
```

Three things worth remembering:
- **Your files aren't touched before approval** — the plan is yours to approve.
- **Reviewers are selected by risk** — it doesn't spawn all of them every time.
- **Findings are auto-fixed and re-reviewed** — until the verdict is `READY` or it's clearly blocked.

---

## Components

The plugin lives in the [`udflow/`](udflow/) subdirectory (only that subdir is installed; `test/`, `.github/`, and `package.json` stay at the repo root and are not shipped).

- `udflow/skills/universal-dev-flow/` — the auto-invoked orchestrator (with `references/`).
- `udflow/skills/run/` — manual entry point: `/udflow:run <task>`.
- `udflow/agents/` — 9 subagents: `implementer` (writes) + 7 read-only reviewers + `gatekeeper`. `security-reviewer` and `gatekeeper` run on `opus`; the rest inherit the current session model.
- `udflow/hooks/` — `plan-gate.js` (PreToolUse: blocks writes while in plan mode, but exempts Claude Code's own plan files under `~/.claude/plans/` so it doesn't interfere with the native plan flow) and `load-failure-memory.js` (SessionStart: injects FAILURE_MEMORY). Both are Node scripts, so they behave the same on Windows PowerShell, macOS, and Linux.
- `udflow/.mcp.json` — empty by default (zero context cost). `udflow/mcp.example.json` is a copy-in template.

### The 9 subagents

| Agent | Role | When it's added | Model |
|-------|------|-----------------|-------|
| `implementer` | Implements the smallest safe change; never self-certifies | after the plan is approved | inherit |
| `spec-reviewer` | Requirement / business-rule / contract fidelity | core; always for non-trivial work | inherit |
| `test-reviewer` | Missing tests, weak verification, regression risk, edges | core; always for non-trivial work | inherit |
| `code-reviewer` | Local implementation quality, maintainability, framework usage, efficiency | non-trivial code changes | inherit |
| `security-reviewer` | Auth/authz, input handling, secrets, trust boundaries | security-relevant risk | opus |
| `architecture-reviewer` | Layering, boundaries, dependency direction, placement | structural/boundary concerns | inherit |
| `operability-reviewer` | Observability, retries/timeouts, deploy, rollback | runtime/production impact | inherit |
| `ui-ux-reviewer` | Usability, interaction, layout, states, accessibility | UI impact | inherit |
| `gatekeeper` | Aggregates and decides: READY / FIX REQUIRED / NOT READY | after selected reviewers finish | opus |

---

## Plan gate (approve before any change)

Steps 1–2 run in plan mode; the plan is presented via ExitPlanMode and **`implementer` only runs after approval**. udflow enters plan mode for its planning phase, so the PreToolUse hook enforces read-only (for Write/Edit/MultiEdit/NotebookEdit — not `Bash`) even when your default mode isn't plan. The hook exempts Claude Code's own plan files so it never blocks the native plan flow.

If the runtime can't switch modes programmatically, udflow proceeds read-only by discipline and discloses that the hook isn't enforcing this session. For a hard, every-session guarantee, set a default plan mode in your own `~/.claude/settings.json` or the project's `.claude/settings.json` (the plugin does not force it).

---

## Failure memory

udflow records "execution abnormalities that blocked, disrupted, or forced repair of the intended method" as plain Markdown, so future sessions read past lessons on startup. It uses two files (either or both):

- Project-level: `ai/FAILURE_MEMORY.md`
- Global: `~/.claude/FAILURE_MEMORY.md`

### How it's loaded and used (three stages)

1. **Startup digest (automatic, via hook).** The `SessionStart` hook (`udflow/hooks/load-failure-memory.js`) runs on every start/resume/clear and injects a **condensed digest** — each entry's title + prevention rule + tags, newest first, capped — using **project first → global fallback**. It's a small index, not the whole file; if neither file exists it skips silently. (Files that don't follow the template fall back to an entry-aware excerpt of the newest content.)
2. **Targeted recall (during planning).** Once the task is known, the workflow searches the file for entries relevant to the affected files / area / language / `Tags` and reads those full entries — so only relevant lessons surface, not the entire history or a blind dump.
3. **Consolidation (keeps the file small).** Size is controlled by merging duplicates, folding recurrences, and pruning obsolete entries — by entry count, not by truncation. The startup cap is only a safety net.

### Write (driven by the workflow, routed by the lesson's nature)

The write target depends on **what kind of lesson it is**, not a fixed order:

- **Project-specific** lesson (only relevant to this repo) → `ai/FAILURE_MEMORY.md`.
- **Cross-project** lesson (tooling, process, reviewer coordination — applies elsewhere too) → `~/.claude/FAILURE_MEMORY.md`.
- **Both apply** → write the project file and also update the global file when the prevention rule is reusable across repos.
- `gatekeeper` decides whether an entry is needed: prefer the project file when it exists/applies, otherwise the global file.

Whichever side it writes, it **rereads the global `~/.claude/FAILURE_MEMORY.md` first** to merge with a similar existing entry (marking recurrences) instead of creating scattered duplicates. A filled-in example lives at [`udflow/examples/FAILURE_MEMORY.sample.md`](udflow/examples/FAILURE_MEMORY.sample.md).

> In one line: **read = a small digest at startup + targeted recall during planning (project-first, global-fallback); write = routed by the lesson's nature (project-specific → project, general → global, both → both), always rereading global first; size is kept down by consolidation, not truncation.**

---

## Optional external capabilities (Detect → Use → Else-Disclose)

MCP tools, external subagents, and external skills are all **optional**. If present, they're used; if absent, the work is done locally and the gap is disclosed. See `udflow/skills/universal-dev-flow/references/external-capabilities.md`.

- **MCP per reviewer**: disabled by default. To enable, copy a server from `udflow/mcp.example.json` into `udflow/.mcp.json`, then uncomment the matching `mcp__*` line in that reviewer's `tools:`. Keep reviewers read-only.
- **ui-ux-pro-max**: if the `ui-ux-pro-max` skill is installed, udflow uses it first for UI design decisions and in `ui-ux-reviewer`; otherwise it falls back to built-in guidance and discloses that.
- **Codex (second opinion / rescue)**: **off by default** — used only when you explicitly enable it for a task. When enabled and installed, udflow may delegate an independent diagnosis on a stuck fix (Detect → Use → Else-Disclose). It is optional, never a hard dependency, and sends code/context to an external (OpenAI) model at extra cost (see the disclosure above). If not enabled or not installed, udflow continues locally without error.

---

## License

[MIT](LICENSE) · See [CHANGELOG.md](CHANGELOG.md) for version history.
