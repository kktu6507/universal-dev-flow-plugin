# udflow — Universal Dev Flow (Claude Code plugin)

[![Validate](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

**English** · [繁體中文](README.zh-TW.md)

**A plan-gated code-review and release-readiness workflow for Claude Code.** udflow has Claude plan and obtain your approval before any code is written, reviews the change against your stated intent, and concludes with an explicit ship/no-ship verdict — not merely a report that the work is "done."

```text
Task → Understand → Plan (no code yet) → YOU APPROVE the plan + acceptance criteria
     → smallest safe change → build / test / lint / browser evidence
     → risk-selected reviewers (against your intent) → Gatekeeper verdict
            READY  /  FIX REQUIRED  /  NOT READY   ⟲ auto-fix & re-review (hard cap)
```

**What a single run delivers**

- **An approval gate** — no code changes until you approve the plan *and* its acceptance criteria.
- **Intent-grounded review** — only the risk-relevant specialist reviewers run, each assessing whether the change meets your stated requirement, not merely whether bugs are present.
- **An explicit verdict** — every run concludes with `READY` / `FIX REQUIRED` / `NOT READY`, auto-fixing and re-reviewing until ready or clearly blocked.

**Intended for work where "done" must mean release-ready** — merging to `main`, shipping, or changes to authentication, data, or contracts. It is deliberate overkill for a typo or a quick look; pair it with a linter for exhaustive mechanical coverage. udflow is the judgment and readiness layer, not a bug scanner.

> 🎬 **Live demo:** [udflow-public-demo](https://github.com/kktu6507/udflow-public-demo) — a captured `/udflow:run` end to end.

---

## What it is

- **A review & release-readiness workflow** — a low-noise reviewer **+** a ship/no-ship gate. **Not** a bug scanner; pair it with linters / static analysis for exhaustive coverage.
- **Measured edge = precision + process discipline + a readiness gate** — near-zero false positives, *not* maximal recall.
- **Status: early / experimental** — the hooks are tested; the multi-agent orchestration is prompt-driven. A disciplined scaffold, not a guarantee.

**What the benchmarks show** — blind reviews across 6 languages of real historical bugs, scored by an independent judge (full method, per-run logs, and limits in [`EVIDENCE.md`](EVIDENCE.md)):

- **A trustworthy verdict.** udflow is tuned so that a confident `major`/`blocker` is almost always a real defect; the gate adjudicates over-eager findings, so what it blocks on holds up — the precision that makes a verdict worth gating a release on.
- **The panel and gate are the lever.** A risk-selected panel catches materially more than any single reviewer and **strictly dominates** a lone pass — recovering real defects a single reviewer rationalizes away while losing none. The improvement is **structural** — multiple lenses and an aggregating gate, not stronger prompts — and is repeatable across passes. This is the principle udflow is built on.
- **Recall scales with the intent you provide.** A clear contract delivered through the **Review Packet** materially increases what reviewers catch, and udflow carries that intent end-to-end. For exhaustive mechanical coverage, pair it with a linter; udflow is the judgment and readiness gate, not a bug scanner.

<details>
<summary><b>Evidence — method &amp; limits</b></summary>

Reviewers run **blind** on the pre-fix code of real historical bugs across 6 languages and many external repos; an **independent judge** scores findings against the known fix. The repeatable signals: confident findings are high-precision, and a **panel** recovers real defects a single reviewer misses — the structural recall lift udflow is designed around, including a current-build (Opus 4.8) **2×2 refresh** over 121 bugs / 13 repos / 3 passes. Blind isolated-code recall is a *proxy* for a full run (which adds plan context, intent, and the gate), so these characterize the reviewers' **reach**, not the workflow's outcome. Full method, per-run logs, and honest limits in [`EVIDENCE.md`](EVIDENCE.md) (manual log — udflow ships **no telemetry**). Honest label: a *characterized* early/beta — directional, not a guarantee.

</details>

---

## Quick start

Prerequisites: **Claude Code** + `node` on PATH (the hooks are Node scripts; with no Node they silently no-op).

```text
# in your project directory, inside Claude Code:
/plugin marketplace add kktu6507/universal-dev-flow-plugin
/plugin install udflow@kktu
# udflow ships DISABLED — enable it: /plugin → Installed → toggle udflow on
#   (or: claude plugin enable udflow@kktu), then:
/reload-plugins
# hand it a task:
/udflow:run Fix the login flow so it refreshes when the token expires
```

- **Install ≠ enable.** udflow ships **opt-in (disabled)**: until enabled, its hooks and skills do nothing. Once enabled, it **auto-engages on non-trivial work** and leaves trivial edits and plain Q&A alone (force the full flow with `/udflow:run`).
- **Marketplace name is `kktu`** (not the repo) → the install id is `udflow@kktu`.
- **Update:** `/plugin marketplace update kktu` then `/reload-plugins` (custom marketplaces don't auto-update).

**Troubleshooting**

| Symptom | Fix |
|---|---|
| Install "not found" | use `udflow@kktu` (marketplace name, not repo); confirm with `/plugin marketplace list` |
| Gate never blocks / nothing happens | run **`/udflow:doctor`** for a hook health report; check `node --version` (no Node → all hooks no-op); set `UDFLOW_HOOK_DEBUG=1` for a raw trace |
| Plan gate firing in the wrong project | `"udflow": { "planGate": false }` in that project's `.claude/settings.json` |
| `opus` unavailable | `security-reviewer` / `gatekeeper` fall back to the session model and say so (lower verdict confidence) |
| Failure memory in an unrelated project | global `~/.claude/FAILURE_MEMORY.md` is injected everywhere by design; add a project `ai/FAILURE_MEMORY.md`, or remove the global file |

---

## How it works

A run proceeds through seven phases; the approval gate in the middle is the point past which nothing advances without you.

| Phase | What happens |
|---|---|
| **Understand** | restate the requirement; `AskUserQuestion` on real ambiguity (business behavior, contracts, destructive ops, UX) |
| **Plan** (plan mode, read-only) | on high-risk work: ground the plan in the code's reality + sharpen the requirement into a **contract-level intent** + edge-input checklist; present via `ExitPlanMode` |
| **You approve** | nothing is written before this — you also approve the **acceptance criteria** |
| **Implement** | `implementer` makes the **smallest safe change** |
| **Verify** | build / test / lint / typecheck + browser evidence; **exercise the change's risky edge inputs**; real command **exit status is authority** |
| **Review** | only the **risk-relevant** reviewers run, reviewing against your stated intent |
| **Gatekeeper** | aggregates findings, **re-rates by real impact**, checks each acceptance criterion → `READY` / `FIX REQUIRED` / `NOT READY` → **repair loop** until ready or clearly blocked (hard cap: same blocker twice → Stuck Summary) |

**The disciplines behind the verdict:**

- **Plan gate** — a hook blocks edits while in plan mode, so nothing changes before you approve (on by default; per-project opt-out; see [Hooks](#hooks)).
- **Acceptance criteria** — the decisive signal is not "no bugs" but *whether it did what you asked, confirmed*; an unmet, non-deferred criterion blocks `READY`.
- **Verification sentinels** — a substantial run ends with a single final report carrying machine-readable `udflow:verify=pass|fail|unrun|na` and `udflow:delivery=held|shipped` (read by the Stop hook).
- **Failure memory** — past lessons live in `ai/FAILURE_MEMORY.md` (project) or `~/.claude/FAILURE_MEMORY.md` (global); a concise title+tags digest is injected at session start, and the full prevention-rule prose is read on demand (retire an entry by ending its `###` title with `(expired)` / `(superseded …)`).
- **Design contract** — for UI work, the project's design language is recorded in a committed `design.md`; `ui-ux-reviewer` judges consistency against it (citing the specific token or section) rather than re-inferring it each run, and `planner-creator` can bootstrap one from an existing UI. A hard accessibility floor always overrides it; `ui-ux-pro-max` contributes net-new patterns back to it.
- **Deep mode** — greater depth, not additional reviewers. **Tier 1** (automatic on high-risk sessions capable of running a Workflow) executes the *same* panel and gatekeeper as a deterministic graph, so the steps run in order (≈ normal cost; opt out with `--no-deep`). **Tier 2** (`--deep`) adds adversarial verification of every blocker/major, maximum effort, and required live-browser evidence for UI; when the needed application is not running, it starts it via the built-in `/run` skill and tears down only what it started (disclosed; never in standard mode).

---

## The 10 subagents

You do not select reviewers manually; udflow assembles the panel by **risk** — a typo engages none, an authentication change engages the security reviewer. The full roster:

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

- **Reviewers are read-only by role** — they hold `Read` / `Grep` / `Glob` / `Bash` for inspection only, with **no** editor tools; they propose the fix, and the `implementer` applies it.
- **Correctness-critical paths receive ≥2 independent lenses** — parsing, numeric / encoding / overflow, concurrency, security, and data integrity — because the benchmark shows that a second reviewer reliably recovers defects the first rationalizes away.

---

## Hooks

Five Node hooks. All are **fail-open** — on any error, or with no Node on PATH, they do nothing and never break a session — and **local-only**: no network, no subprocess, no downloaded code, only the built-in `fs` / `os` / `path` / `crypto`. They run in *every* enabled session, not only udflow tasks.

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
| Enable in `/plugin` (or `claude plugin enable udflow@kktu`) | turns hooks + skills on | **disabled** |
| `"udflow": { "planGate": false }` in `.claude/settings.json` | this project's plan-mode write gate off | gate **on** (missing/malformed → on) |
| `"udflow": { "destructiveGuard": false }` in `.claude/settings.json` | this project's destructive-command prompt off | guard **on** (missing/malformed → on) |
| `"udflow": { "preserveOnCompact": false }` in `.claude/settings.json` | this project's compaction-fidelity nudge off | nudge **on** (missing/malformed → on) |
| `{ "enabledPlugins": { "udflow@kktu": false } }` in `~/.copilot/settings.json` | disable under **Copilot CLI only** | enabled if installed |
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
| `output/udflow/` (consuming project) | kept run artifacts: `evidence/` screenshots, `review/diff.patch`, `progress.md` ledger — **auto-creates a top-level `output/udflow/.gitignore`** so the whole tree self-protects (a screenshot can carry secrets/PII); warns if it's somehow not ignored | created on demand |
| `ai/FAILURE_MEMORY.md` / `~/.claude/FAILURE_MEMORY.md` | past-failure lessons read at startup + planning | created on demand |

---

## Cost per run

Two very different numbers, given as order-of-magnitude estimates for **typical real-app** work rather than guarantees. The figures logged in [`EVIDENCE.md`](EVIDENCE.md) run *lower* — those are scoped edits on udflow's own small Markdown/Node repo (~0.1–1.5M new tokens, the floor of this table). Scale up for larger codebases, more complex logic, and additional repair loops; the ~47M figure below is an entire P0–P3 build across ~7 runs, not a single one.

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

## When udflow earns its cost

udflow is **precision + process + a gate**, not exhaustive bug-finding. Reach for the cheaper tool first when it fits:

- **A linter / static analysis** is cheaper, deterministic, and catches mechanical / style / known-pattern issues — udflow does **not** replace it; pair them.
- **A one-shot AI review** (e.g. an editor's review command) gives findings fast, but with no plan gate, no intent-grounded reviewer selection, no acceptance-criteria check, no repair loop, and no ship/no-ship verdict.
- **udflow** is for *"this must be release-ready"*: low-noise, intent-grounded review behind a plan gate, a defensible `READY` / `FIX REQUIRED` / `NOT READY` verdict, and a bounded repair loop. It costs more tokens and time — overkill for a typo or a quick look.

Honest framing: a linter + tests catch more *mechanical* bugs, more cheaply; udflow's edge is **near-zero false positives on judgment-level findings + the gate**, and recall that scales with the intent you give it. A quantitative head-to-head (vs a linter / a one-shot review) needs the validated benchmark harness ([`EVIDENCE.md`](EVIDENCE.md)) and is not yet run.

---

## Compatibility

udflow targets **Claude Code**, and its **subagents** and **skills** also load under **GitHub Copilot CLI** (live-verified on 1.0.65: `plugin list`, `skill list`, all subagents enumerated, and the hooks observed firing). The **0.27.x** hook set was live-verified to install and load on Copilot 1.0.65 — `copilot plugin update` to v0.27.1 succeeded ("Updated 2 skills"), both skills enumerate, and the compaction-fidelity hook (`compact-fidelity.js`, wired under `SessionStart`·`compact` since 0.27.3, relocated from `PreCompact` whose injected output Claude Code rejects) loads in the same class as the already-verified failure-memory `SessionStart` hook. Its injected output is a no-op under Copilot (see the table). Cross-harness loading is derived from each tool's documented plugin format.

**Claude-Code-only** (degrade gracefully elsewhere — never an error):

| Feature | Under Copilot CLI |
|---|---|
| Plan-gate enforcement | no-op (Copilot has no `plan` permission mode) |
| Deep-mode Workflow | no-op (no Workflow capability) |
| Failure-memory auto-digest | no-op — Copilot runs hooks but **doesn't surface injected output**; falls back to manual retrieval during planning |
| Compaction-fidelity (`SessionStart`·`compact`) hook | no-op — same class as the digest: the hook **loads** but Copilot doesn't surface `SessionStart` injected output; it fails open, never errors. (On Claude Code it now works — relocated from `PreCompact` in 0.27.3, whose injected output Claude Code rejected with a validation error.) The `output/udflow/progress.md` ledger is the continuity fallback |
| `UDFLOW_ENFORCE_STOP` block | no-op (Stop output not surfaced) |
| `destructive-guard` prompt | **applies** — a PreToolUse decision, not injected output (live-verified: it gated `git reset --hard` under 1.0.65). On Windows the deny-list also covers the PowerShell forms the model emits |

Disable under Copilot only: `{ "enabledPlugins": { "udflow@kktu": false } }` (or `{ "disableAllHooks": true }`) in `~/.copilot/settings.json`.

---

## Project status & contributing

- **Early / experimental, solo-maintained** (bus factor of one) — dogfooded on real work, but weigh that before relying on it for release gating. Issues and PRs are welcome; responses are best-effort.
- **Most valuable contribution: a verified run.** udflow ships **no telemetry**, so a real run only counts if written down — udflow prints a paste-ready `Live run` block at the end. **→ [Open a "Verified udflow run" issue](https://github.com/kktu6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml)** (misses & false alarms wanted too; sanitize secrets first). See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`EVIDENCE.md`](EVIDENCE.md).
- **Open gate to drop "experimental":** ≥10 verified runs, across ≥3 projects, with ≥1 not by the maintainer.

---

## License

[MIT](LICENSE) · version history in [CHANGELOG.md](CHANGELOG.md) · how it fits together + honest limits in [ARCHITECTURE.md](ARCHITECTURE.md) · trust model + reporting in [SECURITY.md](SECURITY.md).
