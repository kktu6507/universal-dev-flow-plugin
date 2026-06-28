# udflow — Universal Dev Flow (Claude Code plugin)

[![Validate](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

**English** · [繁體中文](README.zh-TW.md)

**A plan-gated, risk-proportional code-review & release-readiness workflow for Claude Code.** Not for typos — use it when "done" must mean release-ready.

```text
Task → Understand → Plan mode (no code yet) → [high-risk] ground in code + sharpen intent
     → YOU APPROVE → smallest safe change → build / test / lint / browser evidence
     → risk-selected reviewers → Gatekeeper: READY / FIX REQUIRED / NOT READY
                                      ⟲ auto-fix repair loop (hard cap)
```

> In one line: Claude lays out a plan and gets **your approval before touching code**, the right specialist reviewers check the work **against your intent**, findings are auto-fixed and re-reviewed, and it ends with a **ship/no-ship verdict** — not just "done."

> 🎬 **Live demo:** [udflow-public-demo](https://github.com/simba6507/udflow-public-demo) — a captured `/udflow:run` end to end.

---

## What it is

- **A review & release-readiness workflow** — a low-noise reviewer **+** a ship/no-ship gate. **Not** a bug scanner; pair it with linters / static analysis for exhaustive coverage.
- **Measured edge = precision + process discipline + a readiness gate** — near-zero false positives, *not* maximal recall.
- **Status: early / experimental** — the hooks are tested; the multi-agent orchestration is prompt-driven. A disciplined scaffold, not a guarantee.

| Blind benchmark · 6 languages, 100+ real bugs | Caught | False positives |
|---|---|---|
| No intent given (32 bugs) | ~34% | **0** |
| Contract-level intent given (same 32 bugs) | ~84% | **0** |
| Automated, bug-blind intent (77 bugs / 12 repos) | ~29% | **1 in 77** |

- **Precision is the robust strength** — ≈1 false positive across ~110 blind reviews. When it raises a `major`/`blocker`, it's almost always real.
- **Recall scales with how specifically you state intent** — code-only ≈30%; contract-level intent up to ~84%. Real udflow feeds reviewers that intent via its **Review Packet**, so recall tracks the quality of your requirement.

<details>
<summary><b>Evidence — method &amp; limits</b></summary>

Reviewers were run **blind** on the pre-fix code of real historical bugs across 6 languages / many external repos; an independent judge scored findings against the known fix. Top miss categories (77-bug corpus): omissions 36% · found a *different* real bug 18% · language idioms 16% · under-rated 15% · needs-external-spec 15%. Limits: bugs mostly from `fix` commits; concurrency/integration barely tested; many runs used a single reviewer with no plan context — all of which *understate* a full run. Full method + per-run logs in [`EVIDENCE.md`](EVIDENCE.md) (manual log — udflow ships **no telemetry**). Honest label: a *characterized* early/beta — directional, not a guarantee.

</details>

---

## Quick start

Prerequisites: **Claude Code** + `node` on PATH (the hooks are Node scripts; with no Node they silently no-op).

```text
# in your project directory, inside Claude Code:
/plugin marketplace add simba6507/universal-dev-flow-plugin
/plugin install udflow@kktmarketplace
# udflow ships DISABLED — enable it: /plugin → Installed → toggle udflow on
#   (or: claude plugin enable udflow@kktmarketplace), then:
/reload-plugins
# hand it a task:
/udflow:run Fix the login flow so it refreshes when the token expires
```

- **Install ≠ enable.** It ships **opt-in (disabled)**; until enabled, the hooks and skills do nothing. Once enabled it **auto-engages on non-trivial work**; trivial edits and plain Q&A are left alone (force the full flow with `/udflow:run`).
- **Marketplace name is `kktmarketplace`** (not the repo) → the install id is `udflow@kktmarketplace`.
- **Update:** `/plugin marketplace update kktmarketplace` then `/reload-plugins` (custom marketplaces don't auto-update).

**Troubleshooting**

| Symptom | Fix |
|---|---|
| Install "not found" | use `udflow@kktmarketplace` (marketplace name, not repo); confirm with `/plugin marketplace list` |
| Gate never blocks / nothing happens | check `node --version`; set `UDFLOW_HOOK_DEBUG=1` for a hook trace |
| Plan gate firing in the wrong project | `"udflow": { "planGate": false }` in that project's `.claude/settings.json` |
| `opus` unavailable | `security-reviewer` / `gatekeeper` fall back to the session model and say so (lower verdict confidence) |
| Failure memory in an unrelated project | global `~/.claude/FAILURE_MEMORY.md` is injected everywhere by design; add a project `ai/FAILURE_MEMORY.md`, or remove the global file |

---

## How it works

| Phase | What happens |
|---|---|
| **Understand** | restate the requirement; `AskUserQuestion` on real ambiguity (business behavior, contracts, destructive ops, UX) |
| **Plan** (plan mode, read-only) | on high-risk work: ground the plan in the code's reality + sharpen the requirement into a **contract-level intent** + edge-input checklist; present via `ExitPlanMode` |
| **You approve** | nothing is written before this — you also approve the **acceptance criteria** |
| **Implement** | `implementer` makes the **smallest safe change** |
| **Verify** | build / test / lint / typecheck + browser evidence; **exercise the change's risky edge inputs**; real command **exit status is authority** |
| **Review** | only the **risk-relevant** reviewers run, reviewing against your stated intent |
| **Gatekeeper** | aggregates findings, **re-rates by real impact**, checks each acceptance criterion → `READY` / `FIX REQUIRED` / `NOT READY` → **repair loop** until ready or clearly blocked (hard cap: same blocker twice → Stuck Summary) |

Key disciplines:

- **Plan gate** — a hook denies edits while in plan mode, so code can't change before you approve (global; per-project opt-out; see [Hooks](#hooks)).
- **Acceptance criteria** — the deepest signal isn't "no bugs", it's *did what you asked, and confirmed it*; an unmet, non-deferred criterion blocks `READY`.
- **Verification sentinels** — substantial runs end with one final report + machine-readable `udflow:verify=pass|fail|unrun|na` and `udflow:delivery=held|shipped` (read by the Stop hook).
- **Failure memory** — past lessons in `ai/FAILURE_MEMORY.md` (project) / `~/.claude/FAILURE_MEMORY.md` (global); a **title+tags digest** is injected at session start (retire an entry by ending its `###` title with `(expired)` / `(superseded …)`). Prevention-rule prose is read on demand, not injected.
- **Design contract** — for UI work, the project's design language lives in a committed `design.md` that `ui-ux-reviewer` judges consistency against (citing the violated token/section) instead of re-inferring it each run; `planner-creator` detects it and can bootstrap one from an existing UI. A hard accessibility safety floor overrides it; `ui-ux-pro-max` feeds net-new patterns into it.
- **Deep mode** — **Tier 1** (auto on high-risk, Workflow-capable sessions): run the *same* panel + gatekeeper as a deterministic graph so it actually runs in order (≈ normal cost; opt out `--no-deep`). **Tier 2** (`--deep`): adversarial verification of blocker/major + max effort + required live-browser evidence for UI. When a needed live process (web app or backend/API) isn't running, Tier 2 also **brings the app up** — delegating to the built-in `/run` skill, then tearing down only what it started (auto + disclosed; never in standard mode). Depth, not more reviewers.

---

## The 10 subagents

| Agent | Role | When it's added | Model |
|---|---|---|---|
| `planner-creator` | grounds the plan in real code, drafts the approach, pre-selects the panel, detects/recommends `design.md` (bootstrap from an existing UI) (read-only; feeds plan approval, never replaces it) | planning | inherit |
| `implementer` | smallest safe change; never self-certifies | after plan approval | inherit |
| `spec-reviewer` | requirement / business-rule / contract fidelity | core (non-trivial) | inherit |
| `test-reviewer` | missing tests, weak verification, edges, regressions | core (non-trivial) | inherit |
| `code-reviewer` | local quality, maintainability, framework use, efficiency | non-trivial code | inherit |
| `security-reviewer` | auth/authz, input handling, secrets, trust boundaries | security-relevant risk | **opus** |
| `architecture-reviewer` | layering, boundaries, dependency direction, placement | structural concerns | inherit |
| `operability-reviewer` | observability, retries/timeouts, deploy, rollback | runtime/prod impact | inherit |
| `ui-ux-reviewer` | usability, interaction, layout, states, accessibility; consistency vs `design.md` when present | UI impact | inherit |
| `gatekeeper` | aggregates, re-rates by impact, decides readiness | after reviewers finish | **opus** |

- **Reviewers are read-only by role** — `Read` / `Grep` / `Glob` / `Bash` (inspection only), **no** editor tools.
- **Correctness-critical paths** (parsing, numeric/encoding/overflow, concurrency, security, data integrity) get **≥2 independent lenses** — the benchmark showed a second lens recovers defects the first rationalizes as fine.

---

## Hooks

Five Node hooks — **all fail-open** (any error, or no Node on PATH → they do nothing, never break a session) and **local-only** (no network, no subprocess, no downloaded code; built-in `fs`/`os`/`path`/`crypto` only). They run in *every* enabled session, not only udflow tasks.

| Hook (event) | What it can do | Default · opt-out |
|---|---|---|
| `plan-gate.js` (PreToolUse) | **deny** edits + *obvious* Bash writes **while in plan mode**; exempts `~/.claude/plans/` | on · `"udflow":{"planGate":false}` |
| `destructive-guard.js` (PreToolUse) | **ask** (never deny) before unrecoverable Bash in **any** mode: `rm -rf` (incl. separated `rm -r -f`), `git reset --hard`, `git push --force`, `find -delete`, `dd of=`, `mkfs`, `shred` — plus the PowerShell forms `Remove-Item -Recurse` / `Format-Volume` / `Clear-Disk` (Windows / Copilot) | on · `"udflow":{"destructiveGuard":false}` |
| `load-failure-memory.js` (SessionStart) | **read** your `FAILURE_MEMORY.md` and inject a nonce-fenced, role-neutralized digest into your own session | on · no file → no-op |
| `compact-fidelity.js` (SessionStart · `compact`) | right **after** a context compaction, **inject** a concise instruction so the fresh context re-establishes udflow's own constructs (reviewer verdicts, acceptance-criteria state, `[unverified]` flags, Run Card numbers, subagent findings, unanswered requirements) — instruction only, no file read. Relocated from `PreCompact` in 0.27.3 (Claude Code rejects a `PreCompact` hook's injected output) | on · `"udflow":{"preserveOnCompact":false}` |
| `orchestration-check.js` (Stop) | **advise** at session end: warns on a `READY` claim without the panel, an unhonored block verdict, or a red/unrun required check while delivering | advisory · hard-blocks only with `UDFLOW_ENFORCE_STOP` |

- **What they never do:** change system/security settings, alter file permissions, delete anything (`destructive-guard` only *prompts before* your own delete/wipe commands — it never deletes), or transmit your code or transcript anywhere.
- **Best-effort, not a sandbox.** `destructive-guard` and the plan-gate Bash tripwire are narrow, high-confidence deny-lists; obfuscated forms (interpreter one-liners like `node -e`/`python -c`, `bash -c`, piped deletes `… | Remove-Item`, cmd.exe `rd /s`/`del /s`, a word-internal apostrophe) can slip — they `ask`/`deny`, never the sole protection. For a hard plan-mode guarantee, set a default plan mode in settings.

---

## Options & opt-ins

Everything is **off / risk-proportional by default** — you only opt in.

**Enable / disable**

| Option | Effect | Default |
|---|---|---|
| Enable in `/plugin` (or `claude plugin enable udflow@kktmarketplace`) | turns hooks + skills on | **disabled** |
| `"udflow": { "planGate": false }` in `.claude/settings.json` | this project's plan-mode write gate off | gate **on** (missing/malformed → on) |
| `"udflow": { "destructiveGuard": false }` in `.claude/settings.json` | this project's destructive-command prompt off | guard **on** (missing/malformed → on) |
| `"udflow": { "preserveOnCompact": false }` in `.claude/settings.json` | this project's compaction-fidelity nudge off | nudge **on** (missing/malformed → on) |
| `{ "enabledPlugins": { "udflow@kktmarketplace": false } }` in `~/.copilot/settings.json` | disable under **Copilot CLI only** | enabled if installed |
| `{ "disableAllHooks": true }` in `~/.copilot/settings.json` | all plugin hooks off under Copilot | hooks on |

**Run flags** — `/udflow:run <flags> <task>`

| Flag | Effect | Default |
|---|---|---|
| `--deep` (also `deep:` / `ultra:`) | Tier-2: adversarial verification of blocker/major + max effort; with UI, drives live browser evidence; **auto-launches the app** (web or backend/API) via `/run` when not already running, then tears down what it started | off (Tier-1 still auto-engages on high-risk) |
| `--no-deep` / `--shallow` | opt out of Tier-1 deterministic enforcement (panel still runs, model-orchestrated) | Tier-1 auto on high-risk |
| `--lite` | smallest sufficient panel + skip deep mode (keeps one safety reviewer on a high-risk signal) | off (panel is risk-proportional) |
| `--report full` | detailed report: per-agent activity, Files Changed, full cost table (Input/Output/Cache-write/Cache-read), after-screenshots | off (compact report) |

**Environment**

| Variable | Effect | Default |
|---|---|---|
| `UDFLOW_HOOK_DEBUG=1` | hooks write a trace (stderr / temp file) for troubleshooting | unset (silent) |
| `UDFLOW_ENFORCE_STOP=1` | upgrade the Stop advisory to a hard **block** — only with a real gatekeeper block verdict **and** `udflow:delivery=shipped` (never prose); escape via `udflow:delivery=held`. Claude-Code-only (see [Compatibility](#compatibility)) | unset (advisory only) |

**Optional external capabilities** (Detect → Use → Else-Disclose — used if present, gap disclosed if absent)

| Capability | Effect | Default |
|---|---|---|
| Per-reviewer MCP (`udflow/.mcp.json`; template `mcp.example.json`) | read-only MCP tools for a reviewer | off (empty `.mcp.json`) |
| Codex | cross-model second opinion / rescue pass (data egress to the external model) | off (opt-in) |
| `ui-ux-pro-max` skill | design intelligence for UI; **required consult** for design-system / design-generation scope (else disclosed fallback) | used if installed |
| `design.md` (project design contract) | the project's design language as a committed contract; `ui-ux-reviewer` judges UI consistency against it; `planner-creator` detects/recommends it and can bootstrap one from an existing UI | used if present (else baseline) |
| Claude in Chrome (`mcp__Claude_in_Chrome__*`; alt `mcp__Claude_Preview__*` / `mcp__playwright__*`) | live browser evidence; required in `--deep` + UI. **Drives your real authenticated browser** — may expose secrets/PII; prefer a non-prod target | used if connected |
| `/run` skill (sibling) | in `--deep`, starts the app (web or backend/API) for verification when it isn't already running; udflow delegates here instead of hardcoding launch commands, and tears down only what it started | used if available |
| `output/udflow/` (consuming project) | kept run artifacts: `evidence/` screenshots, `review/diff.patch`, `progress.md` ledger — recommend you `.gitignore` it | created on demand |
| `ai/FAILURE_MEMORY.md` / `~/.claude/FAILURE_MEMORY.md` | past-failure lessons read at startup + planning | created on demand |

---

## Cost per run

Two very different numbers — ballparks from our own runs (orders of magnitude, not guarantees):

- **New tokens** — first-time-processed (input + cache-creation + output). Tracks the real work; plan around this.
- **Billable total** (`/cost`) — *also* counts cache-reads re-contributed every turn by every agent → **~20–30× the new-token figure**. But cache reads bill at ~⅒ the input rate, so **dollars scale much closer to new tokens** than that multiple implies.

| Task (one run) | Reviewers | New tokens | Wall-clock |
|---|---|---|---|
| Light | `--lite` — core only | ~0.5–2M | a few min |
| Typical | 3–5 + one repair pass | ~2–7M | ~5–15 min |
| Deep | `--deep`, several repair loops | >10M | 20–40 min |

- **Per run** = one implement → review → fix → gate cycle. A multi-increment feature stacks runs (a full P0–P3 build in our use: **~47M new / ~1B billable** over ~7 cycles / ~94 subagents / one day).
- **Driver ≈ context/repo size × turns × subagents.** `opus`, `--deep`, extra repair loops multiply it; parallel reviewers cut wall-clock, not token count.
- **Adjustable** — `--lite` (cheapest), `--deep` (max depth), `--no-deep`; the panel + cost tier is stated at the plan gate and recapped in the final report. `--report full` itemizes spend by billable component.

---

## Compatibility

udflow targets **Claude Code**; its **subagents** and **skills** also load under **GitHub Copilot CLI** (live-verified 1.0.65 — `plugin list`, `skill list`, all subagents enumerated, the hooks observed firing). The **0.27.x** hook set was live-verified to **install and load** under Copilot 1.0.65: `copilot plugin update` to v0.27.1 succeeded ("Updated 2 skills"), both skills enumerate, the compaction-fidelity hook (`compact-fidelity.js`, wired under `SessionStart`·`compact` since 0.27.3 — relocated from `PreCompact`, whose injected output Claude Code rejects) loads in the same class as the already-verified failure-memory `SessionStart` hook; its injected output is a no-op under Copilot (see the table). Cross-harness loading is derived from each tool's documented plugin format.

**Claude-Code-only** (degrade gracefully elsewhere — never an error):

| Feature | Under Copilot CLI |
|---|---|
| Plan-gate enforcement | no-op (Copilot has no `plan` permission mode) |
| Deep-mode Workflow | no-op (no Workflow capability) |
| Failure-memory auto-digest | no-op — Copilot runs hooks but **doesn't surface injected output**; falls back to manual retrieval during planning |
| Compaction-fidelity (`SessionStart`·`compact`) hook | no-op — same class as the digest: the hook **loads** but Copilot doesn't surface `SessionStart` injected output; it fails open, never errors. (On Claude Code it now works — relocated from `PreCompact` in 0.27.3, whose injected output Claude Code rejected with a validation error.) The `output/udflow/progress.md` ledger is the continuity fallback |
| `UDFLOW_ENFORCE_STOP` block | no-op (Stop output not surfaced) |
| `destructive-guard` prompt | **applies** — a PreToolUse decision, not injected output (live-verified: it gated `git reset --hard` under 1.0.65). On Windows the deny-list also covers the PowerShell forms the model emits |

Disable under Copilot only: `{ "enabledPlugins": { "udflow@kktmarketplace": false } }` (or `{ "disableAllHooks": true }`) in `~/.copilot/settings.json`.

---

## Project status & contributing

- **Early / experimental, solo-maintained** (bus factor of one) — dogfooded on real work, but weigh that before depending on it for release gating. Issues/PRs welcome, response best-effort.
- **Most valuable contribution: a verified run.** udflow ships **no telemetry**, so a real run only counts if written down — udflow prints a paste-ready `Live run` block at the end. **→ [Open a "Verified udflow run" issue](https://github.com/simba6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml)** (misses & false alarms wanted too; sanitize secrets first). See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`EVIDENCE.md`](EVIDENCE.md).
- **Open gate to drop "experimental":** ≥10 verified runs, across ≥3 projects, with ≥1 not by the maintainer.

---

## License

[MIT](LICENSE) · version history in [CHANGELOG.md](CHANGELOG.md).
