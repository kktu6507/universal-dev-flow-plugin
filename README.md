# udflow — Universal Dev Flow (Claude Code plugin)

[![Validate](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

**English** · [繁體中文](README.zh-TW.md)

**A plan-gated, risk-proportional code-review & release-readiness workflow for Claude Code.**

> Not for typos. Use udflow when "done" needs to mean release-ready.

```text
Task
  ↓
Understand requirement
  ↓
Plan mode — no code changes yet
  ↓
(high-risk) Ground the plan in the code + sharpen the intent
  ↓
User approval
  ↓
Smallest safe implementation
  ↓
Build / test / lint / browser evidence
  ↓
Risk-selected reviewers
  ↓
Gatekeeper verdict: READY / FIX REQUIRED / NOT READY
```

Use it for non-trivial engineering work where Claude Code should not self-certify completion.

> In one line: udflow makes Claude lay out a plan and get your approval before it touches code, has the right specialist reviewers check the work against your intent, auto-fixes what they raise, and ends with a ship/no-ship verdict — instead of just saying "done."

> 🎬 **See a real run:** [udflow-public-demo](https://github.com/simba6507/udflow-public-demo) — a captured `/udflow:run` walking through the plan gate, risk-selected reviewers, and the gatekeeper verdict end to end.

**What it is — and what it isn't.** udflow is a **review & release-readiness workflow**, not a bug scanner. Its measured edge (see Evidence) is **near-zero false positives + process discipline + a readiness gate** — *not* maximal bug recall. It does catch real, code-visible defects, but treat it as a low-noise reviewer plus a ship/no-ship gate, not a tool that finds every bug. For exhaustive scanning, pair it with linters / static analysis / a dedicated deep review.

> **Status: early / experimental.** The hooks are tested; the multi-agent orchestration is prompt-driven. A cross-language benchmark (6 languages, 100+ real bugs) shows a clear profile: **near-zero false positives throughout** (≈1 in ~110 reviews), and recall that **scales with how specifically you state the change's intent** — ~30% when a reviewer sees only the code, up to ~84% with contract-level intent (real udflow hands reviewers that intent via its Review Packet). See the Evidence note. Treat it as a disciplined scaffold, not a guarantee.

<details>
<summary><b>Evidence (field notes)</b> — measured, directional, and honest about its limits</summary>

udflow's reviewers were run *blind* on the pre-fix code of real historical bugs across **6 languages / many external repos** (C#, JavaScript, Python, Java, Go, Rust — all different from this plugin's own stack). Each reviewer saw only the buggy code; an independent judge scored its findings against the known fix.

**Headline numbers (two condition-controlled runs + one larger automated run):**

| Condition | Caught (hit) | Touched | False positives |
|---|---|---|---|
| Blind, **no intent** given (32 bugs) | ~34% | ~50% | **0** |
| Blind, **specific contract-level intent** given (same 32 bugs) | ~84% | — | **0** |
| Automated, **bug-blind native intent** (77 bugs, 12 repos) | ~29% | ~39% | **1 in 77** |

- **The robust, condition-independent strength is precision.** Across ~110 blind reviews there was **about one false positive** total. udflow does not cry wolf — when it raises a major/blocker, it is almost always real.
- **Recall depends on the *intent* you give it, and on how specific it is.** Given only code, reviewers catch concrete code-visible defects (resource leaks, a column overflow, a no-op validator) but miss subtle **language idioms** (a wrong `this`/receiver binding, char-vs-byte length, lifetimes, overflow) and **omissions** ("what's missing vs the intent"). Adding a *specific* contract-level intent took the same 32 bugs from 34% to 84% — but a stricter bug-blind check (intent written only from a function's own docs) scored far lower, so **84% is an optimistic upper bound** that needed contract-specific intent. Real-use recall sits in between and tracks the quality of your Review Packet.
- **Where the misses go (77-bug corpus):** omissions 36% (the #1 gap) · "found a *different* real bug" 18% (real-world value above the hit rate) · language idioms 16% · found-but-under-rated 15% · needs-external-spec 15%. The last two drove the v0.9.2 gatekeeper fixes (re-rate severity by impact; require an edge/boundary test for behavior changes). Subtle idiom/spec defects remain a genuine ceiling for any static review.

**Limits:** bugs drawn mostly from `fix` commits; concurrency/integration barely tested; many runs used a single reviewer with no plan context — all of which *understate* a full udflow run (panel + intent + verification). Full method, per-run results, and the honest walk-backs are logged in [`EVIDENCE.md`](EVIDENCE.md) (a manual log — udflow ships **no telemetry**). The "experimental" label stays until the log shows enough verified-ground-truth runs; the coverage criteria are met, but recall is intent-dependent and the strong claim is precision, so the honest label is a *characterized* early/beta — **directional, not a guarantee.**

</details>

---

## Quick start

Prerequisites: **Claude Code**, and `node --version` must work (the hooks are Node scripts — with no Node on PATH they silently do nothing).

**1. 🪟 In your terminal, go to your project and launch Claude Code**

    cd path/to/your-project
    claude

**2. 🤖 Inside Claude Code, install + enable**

    /plugin marketplace add simba6507/universal-dev-flow-plugin
    /plugin install udflow@kktmarketplace

udflow ships **opt-in (disabled)**, so installing is not enough — you must enable it. Open `/plugin` → **Installed** and toggle `udflow` on (or run `claude plugin enable udflow@kktmarketplace`), then reload:

    /reload-plugins

> The marketplace's name is `kktmarketplace` (not the repo name), so install is `udflow@kktmarketplace`.
> **Installing ≠ enabling.** Because the plugin is opt-in, the hooks and skills stay inactive until you enable it in `/plugin`.

**3. 🤖 Hand it a task**

    /udflow:run Fix the login flow so it refreshes when the token expires

You can also just describe the task in plain language — udflow takes over automatically when it judges the work to be non-trivial engineering.

> **Stays out of the way for small stuff.** udflow only engages for non-trivial engineering work; trivial edits and plain Q&A are left alone. Want to force the full workflow on anything? Use `/udflow:run`.

### Updating to a newer version

Already installed an older version? Refresh the marketplace and reload — no uninstall needed:

    /plugin marketplace update kktmarketplace
    /reload-plugins

Custom marketplaces do **not** auto-update, so run `marketplace update` manually. Check the installed version in `/plugin`.

### Troubleshooting

- **Install failed / can't find the plugin** — the marketplace is named **`kktmarketplace`**, not the repo name, so the install id is **`udflow@kktmarketplace`** (not `udflow@universal-dev-flow-plugin`). Confirm with `/plugin marketplace list`. Claude Code's own "not found" message is built in and can't be customized by the plugin, so this name mismatch is the usual cause.
- **Is the plan gate actually live?** Enter plan mode and ask Claude to edit a file — it should be blocked with a "udflow plan gate" message. If it isn't, the hook isn't firing (see next item).
- **Plan gate blocking a project you don't want it in?** Set `"udflow": { "planGate": false }` in that project's `.claude/settings.json` to opt it out; the gate stays on in every other project.
- **Nothing seems to happen / gate never blocks** — check `node --version`. With no Node on PATH the hooks no-op silently. For deeper insight, set `UDFLOW_HOOK_DEBUG=1` to make the hooks write a trace (stderr / temp file); unset, they stay silent.
- **opus unavailable** — `security-reviewer` and `gatekeeper` fall back to the available model and say so in their output; verdict confidence may be lower.
- **Failure memory shows up in an unrelated project?** With no project-local `ai/FAILURE_MEMORY.md`, udflow falls back to the global `~/.claude/FAILURE_MEMORY.md` and injects its digest into *every* session — this is intended (global lessons travel with you). To scope it per project, add a project-local `ai/FAILURE_MEMORY.md`; to stop it entirely, remove the global file. Injected content is wrapped in a per-run nonce fence and role-marker–neutralized, so a repo's memory file is treated as untrusted reference data, not instructions — defense-in-depth, not an absolute guarantee.

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
        [verify] runs tests/lint; exercises the unchecked + checked paths; confirms the session persists.
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

## What you're opting into

- **More tokens than a normal chat.** A task spawns the `implementer`, the risk-selected reviewers, and the `gatekeeper` (two of them on `opus`). One task (implement → review → fix → gate) is typically a few minutes and a few million tokens of *actual work* (new tokens processed); the number you see in `/cost` is much larger, because the cached context is re-read every turn by every agent. Simple tasks cost less; multi-increment features stack several runs. Full breakdown under [Cost per run](#cost-per-run).
- **Three always-on hooks, invisible during normal work** — a plan-mode write gate, failure-memory injection at session start, and a best-effort orchestration check at session end. They run in *every* session while the plugin is **enabled** (not only udflow tasks; installing without enabling does nothing); with no Node they no-op. Details under [Plan gate](#plan-gate) and [Failure memory](#failure-memory).
- **It writes failure-memory files** — `ai/FAILURE_MEMORY.md` in your repo and `~/.claude/FAILURE_MEMORY.md` at home (commit the project one or add it to `.gitignore`).
- **External models are off unless you ask** — Codex and MCP are opt-in; udflow runs standalone otherwise, and discloses any gap.
- **It can engage on its own — and you can stop it.** It auto-starts for non-trivial engineering work; to keep it manual-only, just don't describe engineering tasks in plain language and call `/udflow:run` when you want it. The repair loop has a hard cap (Stuck Summary after the same blocker persists two iterations) and asks before any deeper/opus-heavy pass.

---

## How it works

```
understand → plan (plan mode) → you approve → implement → verify → selected review → gatekeeper verdict
                                                                  ↑________ repair loop ________↓
```

- **Understand / plan** happen in plan mode (read-only); the plan is presented via ExitPlanMode for your approval. On **high-risk / correctness-critical** work, before that approval udflow grounds the plan in the code's reality and sharpens the requirement into a contract-level intent plus an edge-input checklist (see [Plan grounding](#plan-grounding-high-risk)) — to inform your approval, not replace it.
- **Only after approval** does the `implementer` write code.
- **Verify** runs build / test / lint / typecheck / browser evidence as applicable — and is expected to **exercise the change's risky edge inputs** (empty / overflow / multibyte / duplicate / malformed / by-value / concurrent), because a boundary that actually runs is the oracle a code read lacks.
- **Review** selects only the reviewers relevant to this change's risk (no ceremony), and reviews against the change's stated intent (the more specific the intent, the more they catch).
- **gatekeeper** aggregates the findings, **re-rates each by its real impact** (a demonstrated wrong-result / crash / contract violation is not left as "minor"), treats a missing edge-test on behavior-changing code as a verification gap, and returns `READY` / `FIX REQUIRED` / `NOT READY`. A fix enters a repair loop until ready or clearly blocked.

---

## Components

The plugin lives in the [`udflow/`](udflow/) subdirectory (only that subdir is installed; `test/`, `.github/`, and `package.json` stay at the repo root and are not shipped).

- `udflow/skills/universal-dev-flow/` — the auto-invoked orchestrator (with `references/`).
- `udflow/skills/run/` — manual entry point: `/udflow:run <task>`.
- `udflow/agents/` — 9 subagents: `implementer` (writes) + 7 inspection-only reviewers + `gatekeeper`. Reviewers and the gatekeeper get `Read`/`Grep`/`Glob`/`Bash` (Bash for inspection — `git diff`, `rg`, running checks) but **not** the editor tools (`Write`/`Edit`/`MultiEdit`); they are non-mutating by role and instruction, not by sandbox. `security-reviewer` and `gatekeeper` run on `opus`; the rest inherit the current session model.
- `udflow/hooks/` — three Node hooks (same behavior on Windows, macOS, Linux; all fail-open):
  - `plan-gate.js` (PreToolUse) — blocks structured edits while in plan mode, and trips on the *obvious* Bash writes; exempts Claude Code's own plan files under `~/.claude/plans/`.
  - `load-failure-memory.js` (SessionStart) — injects a failure-memory digest.
  - `orchestration-check.js` (Stop) — best-effort, non-blocking: warns if a `READY` verdict is claimed without the full core review panel running, **or** if the gatekeeper's last verdict was `FIX REQUIRED`/`NOT READY` but the session ends claiming the work is done (an unhonored verdict), **or** if the verification sentinel `udflow:verify=` reports a required check failed/never-ran while the session is delivering. Advisory only — a Stop hook can't block delivery.
- `udflow/.mcp.json` — empty by default (zero context cost). `udflow/mcp.example.json` is a copy-in template.

### Hooks — safety posture

The full footprint in one place, for a security reviewer or a cautious user:

- **Opt-in.** The plugin ships `defaultEnabled: false` — installing it does **nothing** until you explicitly enable it in `/plugin`.
- **Local-only, no network.** The hooks make **no network calls** and send nothing off your machine — they require only Node's built-in `fs` / `os` / `path` / `crypto`, spawn no subprocess, and run no downloaded code.
- **Fail-open.** On any error the hook catches it and exits 0 — it does nothing. And if Node isn't on `PATH` the hook process never starts; Claude Code treats a failed hook spawn as non-fatal and continues the session. Either way nothing is blocked, so a session can't break.
- **What each can do:** `plan-gate` can *deny* a Write/Edit/obvious-Bash-write **only while you are in plan mode** (per-project opt-out via `"udflow": { "planGate": false }`); `load-failure-memory` *reads* your local `FAILURE_MEMORY.md` and injects a nonce-fenced, role-marker-neutralized digest into your own session; `orchestration-check` only *emits an advisory message* at session end — it can never block delivery.
- **What they never do:** change system or security settings, alter file permissions, delete anything, or transmit your code or transcript anywhere.

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
| `gatekeeper` | Aggregates, re-rates severity by impact, decides: READY / FIX REQUIRED / NOT READY | after selected reviewers finish | opus |

For correctness-critical paths (parsing, numeric/encoding/overflow, concurrency, security, data integrity), udflow prefers **at least two independent reviewer lenses** rather than a lone reviewer — the benchmark showed a second lens recovers defects the first rationalizes as fine.

---

## Advanced

### Plan gate

The read-only enforcement is a hook that **only fires while you're in plan mode**. udflow drives Claude Code's native plan mode itself for its planning phase, so the gate is live even when your default mode isn't plan. If the runtime can't switch modes programmatically, udflow proceeds read-only by discipline and **discloses** that the hook isn't enforcing this session; for a hard, every-session guarantee, set a default plan mode in `~/.claude/settings.json` or the project's `.claude/settings.json` (the plugin doesn't force it).

```
you> add a promo-code field to the checkout page
udflow> [enters plan mode] tries to edit checkout.tsx → ✗ blocked ("udflow plan gate")
        → plans instead, presents the plan via ExitPlanMode
you> approve
udflow> [exits plan mode] now edits checkout.tsx ✓
```

Two honest limits:
- **It's global — but a project can opt out.** The hook runs in every session while the plugin is enabled, so if you're in plan mode in an unrelated project, edits there are blocked too (it can't tell whether the session is a udflow task). To turn the plan gate off for one project, set `"udflow": { "planGate": false }` in that project's `.claude/settings.json` (or `.claude/settings.local.json`, which takes precedence); the gate stays on everywhere else. A missing or malformed setting keeps the gate **on** (fail-safe), so a broken config can never silently drop the guard.
- **Bash is only partly covered.** The hook blocks the structured edit tools and the *obvious* Bash writes (`>`/`>>` to a file, `tee`, `sed -i`, `perl -i`, `truncate`, `dd of=`, `ln`, `git apply`), but deliberately allows read-only Bash and won't catch non-obvious writes — notably interpreter one-liners (`node -e "fs.writeFileSync(...)"`, `python -c "open(...,'w')"`) and `xargs`-driven writes. Treat the tripwire as a safety net, not a guarantee — udflow's rules still forbid any Bash working-tree write while planning, and a default plan mode in settings is the hard guard.

### Plan grounding (high-risk)

Before it asks you to approve the plan, on **high-risk or correctness-critical** work udflow runs one extra read-only step (see [`plan-grounding.md`](udflow/skills/universal-dev-flow/references/plan-grounding.md)): it **grounds** the plan in the code's reality (a read-only exploration pass — real call sites, what edge handling already exists) and **sharpens** the requirement into a contract-level intent plus the change's implied edge-input checklist. The sharpened contract feeds the Review Packet (the measured recall lever), the edge checklist feeds the verification gate, and any product ambiguity is surfaced via AskUserQuestion — so you approve with the real picture in front of you. It **assists** the approval, never replaces it; it adds depth, not more reviewers; and it's skipped for low/medium-risk work. With no exploration subagent it falls back to a local grounding and discloses the gap.

### Verification gate

Before any readiness claim, udflow runs the narrowest meaningful checks (build / test / lint / typecheck, browser evidence for UI). For behavior-changing code it expects a **focused test that exercises the change's risky edge inputs** — empty / zero / overflow / large, multibyte, null / empty / duplicate / multiple values, malformed input, by-value vs receiver, concurrency — because a test that reproduces the boundary catches the idiom/encoding/overflow/omission bugs a code read rationalizes as "looks fine." The `gatekeeper` treats a missing edge-test as a verification gap and withholds `READY`. It also surfaces a structured per-check rollup — `udflow:verify=pass|fail|unrun|na` — and treats the **real command exit status as authority over reviewer prose** (a red or unrun required check blocks `READY` no matter how clean the review reads), then ends substantial runs with a user-visible **Run Card** (verdict + checks + reviewers + top findings + auto-fixed + remaining + approximate cost). For non-trivial work it also turns the requirement into a short **acceptance criteria** checklist you approve at the plan gate, and the `gatekeeper` checks each item — an unmet, non-deferred criterion blocks `READY` (the deepest release signal isn't "no bugs," it's *did what you asked, and confirmed it*). At the end a **Run Report** lays out — in tables — what each agent did / found / fixed, a requirement → change → effect map, a per-agent **token & cost breakdown** with a grand total and an approximate dollar estimate (no telemetry: subagent figures are observed, the orchestrator figure and cost are estimates), and an after-change screenshot for UI work.

### Failure memory

udflow records "execution abnormalities that blocked, disrupted, or forced repair of the intended method" as plain Markdown, so future sessions read past lessons on startup. Two files (either or both): project `ai/FAILURE_MEMORY.md`, global `~/.claude/FAILURE_MEMORY.md`.

- **Startup digest (automatic).** The SessionStart hook injects a condensed digest (each entry's **title + tags**, newest first, capped — the prevention-rule text is read on demand during planning, not injected) — project first → global fallback. It's a small index, not the whole file; injected content is fenced as untrusted reference data. (An unstructured file with no `###` entries falls back to injecting its raw content, role-marker-neutralized and fenced — a best-effort limit.) No file → nothing happens.
- **Targeted recall (during planning).** The workflow retrieves the full entries relevant to the affected files / area / language / `Tags` — only relevant lessons surface.
- **Writes** are routed by the lesson's nature (project-specific → project, cross-project → global, both → both), always rereading the global file first to merge instead of duplicating, and performed by a single writer (the main thread / `gatekeeper`) to avoid concurrent corruption. Size is kept down by consolidation, not truncation. A filled-in example: [`udflow/examples/FAILURE_MEMORY.sample.md`](udflow/examples/FAILURE_MEMORY.sample.md).

### Deep mode

udflow's deterministic Workflow comes in two tiers:

- **Tier 1 — enforcement (may auto-engage).** On **high-risk / correctness-critical** work, when your session has a Workflow/ultracode capability, udflow runs the **same** selected reviewers and gatekeeper as a deterministic Workflow — so the panel *actually* runs and gatekeeper only runs after it, instead of trusting the model to self-orchestrate. Same reviewers, same effort, so cost ≈ a normal run. It's **opt-out**: pass `--no-deep` (or `--shallow`), or just run in a session without the capability.
- **Tier 2 — deeper verification (opt-in).** Prefix a task with `--deep` (e.g. `/udflow:run --deep <task>`) to *additionally* give blocker/major findings adversarial verification and run the highest-leverage agents at maximum effort. This raises tokens/time, so it stays explicit opt-in.

**Depth, not more reviewers** — reviewer *selection* is identical in both tiers. Honest limit: the deterministic guarantee only exists in a **Workflow-capable session**; without that capability the panel still runs but is model-orchestrated (and udflow discloses that). Never a hard dependency.

### Cost per run

Ballpark from our own runs — varies a lot by task size, risk, repo size, and number of fix iterations; treat as orders of magnitude, not guarantees. Two very different numbers matter:

- **New tokens** — tokens processed for the first time (input + cache-creation + output). This tracks the real work and is the stable figure to plan around.
- **Billable total** — what `/cost` sums. It *also* counts cache-read tokens, which the cached context re-contributes on *every* turn of *every* agent, so it runs **~20–30× the new-token figure** (and grows with repo size and turn count). Cache reads bill at roughly a tenth of the input rate, so the dollar cost scales much closer to the new-token figure than that 20–30× multiple implies.

| Task (one run) | Reviewers | New tokens | Wall-clock |
|------|-----------|------------|------------|
| Light | `--lite` — core only | ~0.5–2M | a few min |
| Typical | 3–5 + one repair pass | ~2–7M | ~5–15 min |
| Deep | `--deep`, several repair loops | >10M | 20–40 min |

This table is **per run** — one `/udflow:run` that goes implement → review → fix → gate. A multi-increment feature stacks several runs: a full P0–P3 build in our own use came to **~47M new / ~1B billable tokens** across ~7 gate cycles and ~94 subagents over a day.

Cost driver: **≈ context/repo size × turns × number of subagents.** `opus` reviewers, `--deep`, and extra repair loops multiply it; running reviewers in parallel shortens wall-clock but not token count.

**Adjustable.** Cost is risk-proportional by default; dial it with `--lite` (force the smallest panel + skip the costly deep tier, primarily for small low-risk changes — a directly-relevant safety reviewer is kept and disclosed if a high-risk signal is present), `--deep` (adversarial verification + max effort), or `--no-deep` (opt out of the deterministic Workflow). The chosen panel + cost tier is stated up-front at the plan gate and recapped in the Run Card, so you can see what a run will cost and adjust before approving.

### Optional external capabilities (Detect → Use → Else-Disclose)

MCP tools, external subagents, and external skills are all **optional**. If present, they're used; if absent, the work is done locally and the gap is disclosed.

- **ui-ux-pro-max**: if the `ui-ux-pro-max` skill is installed, udflow uses it first for UI design decisions; otherwise it falls back to a built-in baseline and discloses that.
- **MCP per reviewer** and **Codex** (cross-model second opinion / rescue) are both **off by default** and opt-in. Their setup, the read-only MCP-to-reviewer mapping, and Codex's data-egress disclosure are in **[`docs/advanced/external-capabilities.md`](docs/advanced/external-capabilities.md)** (reader guide) — udflow's own operational rules live in the shipped [`references/external-capabilities.md`](udflow/skills/universal-dev-flow/references/external-capabilities.md).

---

## Project status & maintenance

udflow is **early / experimental** and **solo-maintained** (one author, in spare time). It's dogfooded on real work, but it has a short track record and a **bus factor of one** — weigh that before depending on it for release gating. Issues and PRs are welcome and read, but response time is best-effort, not guaranteed. The most valuable contribution is a **[verified run report](.github/ISSUE_TEMPLATE/verified-run.yml)** — see [`CONTRIBUTING.md`](CONTRIBUTING.md) and the evidence log in [`EVIDENCE.md`](EVIDENCE.md).

### Contribute a verified run

udflow ships **no telemetry**, so a real run only counts toward dropping the "experimental" label if it's written down. If you've run it on real work, please add yours:

**→ [Open a "Verified udflow run" issue](https://github.com/simba6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml)** — the form mirrors the evidence template; the maintainer curates accepted runs into [`EVIDENCE.md`](EVIDENCE.md).

- **Misses and false alarms are wanted too**, not just wins — honest data is the point, and more credible.
- Sanitize private code and secrets first; a sanitized stack + outcome is fine for private repos.
- udflow prints a paste-ready "Live run" block at the end of a real run — drop it straight into the issue.

The open gate is in [`EVIDENCE.md`](EVIDENCE.md): **≥10 verified runs, across ≥3 projects, with ≥1 not by the maintainer.**

---

## License

[MIT](LICENSE) · See [CHANGELOG.md](CHANGELOG.md) for version history.
