# udflow - Universal Dev Flow (Claude Code plugin)

[![Validate](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

**English** · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md)

**udflow makes Claude Code behave like a cautious release engineer:** plan first, change only after approval, verify with evidence, then decide `READY` / `FIX REQUIRED` / `NOT READY`.

udflow is a plan-gated code-review and release-readiness workflow for Claude Code. It is not a bug scanner, linter, static analyzer, CI replacement, or zero-bug guarantee. Its job is to make AI-made changes traceable: stated intent, acceptance criteria, smallest safe implementation, real verification evidence, risk-selected review, and a gatekeeper verdict.

```text
Task -> Understand -> Plan (no code yet) -> YOU APPROVE plan + acceptance criteria
     -> smallest safe change -> build / test / lint / browser evidence
     -> risk-selected reviewers -> Gatekeeper verdict
            READY / FIX REQUIRED / NOT READY -> repair loop when needed
```

## 30-second version

udflow does three things:

| Moment | What udflow adds |
|---|---|
| **Before coding** | Claude restates the requirement, turns it into a plan and acceptance criteria, and waits for approval. |
| **During coding** | `implementer` makes the smallest safe change and does not self-certify. |
| **Before delivery** | Risk-selected reviewers inspect the change against your intent, then `gatekeeper` decides `READY` / `FIX REQUIRED` / `NOT READY`. |

Use udflow when "done" must mean release-ready: merging to `main`, shipping a user-facing change, or touching authentication, data, contracts, migrations, production behavior, or high-risk UI flow.

Skip udflow for typo fixes, pure formatting, very small no-risk edits, or quick looks. Use cheaper deterministic tools first when they fit.

> Live demo: [udflow-public-demo](https://github.com/kktu6507/udflow-public-demo) captures one `/udflow:run` end to end.

## Quick start

Prerequisites: **Claude Code** + `node` on `PATH`. The hooks are Node scripts; with no Node they silently no-op.

```text
# in your project directory, inside Claude Code:
/plugin marketplace add kktu6507/universal-dev-flow-plugin
/plugin install udflow@kktu
# udflow ships DISABLED - enable it: /plugin -> Installed -> toggle udflow on
#   or: claude plugin enable udflow@kktu
/reload-plugins

# hand it a task:
/udflow:run Fix the login flow so expired access tokens are refreshed once before retrying the failed request.
```

> New to udflow? Walk through [your first run, end to end](docs/tutorial-first-run.md).

- **Install does not enable the plugin.** Until enabled, udflow's hooks and skills do nothing.
- **Marketplace name is `kktu`.** The install id is `udflow@kktu`.
- **Update:** `/plugin marketplace update kktu` then `/reload-plugins`.
- **Health check:** run `/udflow:doctor` when the gate never blocks, hooks seem silent, or Node may be missing.

## Good tasks

udflow works best when the task includes intent, acceptance criteria, must-not-change scope, expected verification, and risk areas.

```text
/udflow:run <change request>

Requirement:
- ...

Acceptance criteria:
- ...

Must not change:
- ...

Verification expected:
- ...

Risk areas:
- auth / data / contract / UI / performance / rollback
```

See [`docs/task-writing-guide.md`](docs/task-writing-guide.md) for bad / better / best examples and task templates for auth, API contracts, UI states, and migrations.

## When to use it

| Use udflow for | Usually skip udflow for |
|---|---|
| auth / authz changes | typos |
| API or schema contract changes | pure formatting |
| DB migration / data-integrity work | trivial local copy edits |
| UI flow, accessibility, or browser-visible states | quick non-release review |
| release-bound work needing stronger evidence | mechanical checks already covered by CI/linter |

## Anti-goals

udflow is not:

- a replacement for CI
- a replacement for linters or static analysis
- a guarantee of zero bugs
- a tool for exhaustive mechanical scanning
- meant for every tiny edit

Use udflow with:

- unit and integration tests
- linters and formatters
- static analysis and dependency scanners
- human review for high-risk releases
- controlled live-environment evidence when external systems matter

Linters catch mechanical issues. Tests catch known expected behavior. Static analysis catches known vulnerability patterns. udflow judges whether the AI-made change satisfies the stated intent and is ready to ship.

## How it works

| Phase | What happens |
|---|---|
| **Understand** | Restate the requirement; ask only when ambiguity changes behavior, contracts, destructive operations, security, or UX. |
| **Plan** | Stay read-only, ground the approach in the repo, and produce acceptance criteria. |
| **Approval** | No code changes before you approve the plan and criteria. |
| **Implement** | `implementer` applies the smallest safe change and writes the per-run task contract (`output/udflow/contract.md`). |
| **Verify** | Run build / test / lint / typecheck / browser evidence as applicable; command exit status is authority. |
| **Review** | Only risk-relevant reviewers run, using a focused Review Packet instead of full thread history. |
| **Gatekeeper** | Aggregate findings, re-rate by impact, check each acceptance criterion, and decide `READY` / `FIX REQUIRED` / `NOT READY`. |

Verdicts are release-readiness decisions, not absolute truths. See [`docs/how-to-read-verdicts.md`](docs/how-to-read-verdicts.md).

## The 10 subagents

You do not select reviewers manually; udflow assembles the panel by **risk** — a typo engages none, an authentication change engages the security reviewer. The full roster:

| Agent | Role | When it's added | Model |
|---|---|---|---|
| `planner-creator` | grounds the plan in real code, drafts the approach, pre-selects the panel, detects/recommends `design.md` (bootstrap from an existing UI) (read-only; feeds plan approval, never replaces it) | high-risk / correctness-critical planning | inherit |
| `implementer` | smallest safe change; never self-certifies | after plan approval | inherit |
| `spec-reviewer` | requirement / business-rule / contract fidelity | core (non-trivial) | inherit |
| `test-reviewer` | missing tests, weak verification, edges, regressions | core (non-trivial); evidence-substitutable on low/medium risk (fast lane) | inherit |
| `code-reviewer` | local quality, maintainability, framework use, efficiency | non-trivial code | inherit |
| `security-reviewer` | auth/authz, input handling, secrets, trust boundaries | security-relevant risk | **opus** |
| `architecture-reviewer` | layering, boundaries, dependency direction, placement | structural concerns | inherit |
| `operability-reviewer` | observability, retries/timeouts, deploy, rollback | runtime/prod impact | inherit |
| `ui-ux-reviewer` | usability, interaction, layout, states, accessibility; consistency vs `design.md` when present | UI impact | inherit |
| `gatekeeper` | aggregates, re-rates by impact, decides readiness | after reviewers finish | **opus** |

- **Reviewers hold no editor tools** — `Read` / `Grep` / `Glob` / `Bash` for inspection; review-only behavior is enforced by policy and context isolation, not a hard read-only capability boundary (see [`ARCHITECTURE.md`](ARCHITECTURE.md)). They propose the fix; the `implementer` applies it.
- **Correctness-critical paths receive ≥2 independent lenses** — parsing, numeric / encoding / overflow, concurrency, security, and data integrity — because the benchmark shows that a second reviewer reliably recovers defects the first rationalizes away.

## Examples and evidence

- [`examples/ready-run.md`](examples/ready-run.md) - real `READY` example extracted from `EVIDENCE.md`.
- [`examples/fix-required-run.md`](examples/fix-required-run.md) - real `FIX REQUIRED -> READY` repair-loop example extracted from `EVIDENCE.md`.
- [`examples/not-ready-run.md`](examples/not-ready-run.md) - illustrative `NOT READY` example, clearly marked as not evidence.
- [`examples/review-packet.md`](examples/review-packet.md), [`examples/final-report-compact.md`](examples/final-report-compact.md), and [`examples/final-report-full.md`](examples/final-report-full.md) show contract-field examples for reviewer input and delivery output; they are illustrative, not verbatim transcripts.

Real-world validation is tracked manually because udflow ships **no telemetry**. `EVIDENCE.md` is the source of truth:

| Track-2 metric | Current status |
|---|---|
| Type-B verified live runs | 6 / 10 |
| Distinct real projects | 2 / 3 |
| Non-maintainer runs | 0 / 1 |

Most valuable contribution: run udflow on real work and open a [Verified udflow run issue](https://github.com/kktu6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml). Paste the `### Live run` block that udflow prints at the end. Keep misses, false alarms, cost, and follow-up outcome in the report; honest negatives are the point.

## Hooks and safety model

Six dependency-free Node hooks run in every enabled session. They are local-only, fail-open, and use only Node built-ins (`fs`, `os`, `path`, `crypto`).

| Hook | Event | Purpose |
|---|---|---|
| `plan-gate.js` | `PreToolUse` | Denies edit tools and obvious Bash writes while in plan mode. |
| `destructive-guard.js` | `PreToolUse` | Asks before narrow, unrecoverable destructive commands such as `rm -rf`, `git reset --hard`, `git push --force`, and PowerShell `Remove-Item -Recurse`. |
| `contract-guard.js` | `PreToolUse` | Asks before a Write/Edit/MultiEdit would remove/loosen a previously recorded `output/udflow/contract.md` acceptance criterion, `mustNotChange` entry, or scope path, downgrade `risk`, or wholesale-delete a `design.md` section. |
| `load-failure-memory.js` | `SessionStart` | Reads project `ai/FAILURE_MEMORY.md` or global `~/.claude/FAILURE_MEMORY.md` and injects a nonce-fenced, untrusted digest. |
| `compact-fidelity.js` | `SessionStart` · `compact` | Re-injects a concise workflow-continuity reminder after compaction. |
| `orchestration-check.js` | `Stop` | Advises when delivery claims contradict missing panel, blocking verdict, failed/unrun verification, or missing live-run evidence. |

Each hook that can prompt or restrict has a per-project opt-out — see [Configuration reference](#configuration-reference) below.

These hooks never delete files, change system settings, alter permissions, run subprocesses, download code, or transmit code/transcripts. They are guardrails, not a sandbox. See [`SECURITY.md`](SECURITY.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Configuration reference

Everything below is optional. udflow's default behavior needs no configuration at all.

**Persistent settings** — `.claude/settings.json` or `.claude/settings.local.json` (local takes precedence), all under an `"udflow": { ... }` object. Each is **on by default**; set to `false` to opt out for that project:

| Key | Disables |
|---|---|
| `planGate` | `plan-gate.js` — the edit-block enforced while in plan mode |
| `destructiveGuard` | `destructive-guard.js` — the ask before narrow, unrecoverable destructive commands |
| `contractGuard` | `contract-guard.js` — the ask before a Write/Edit/MultiEdit would weaken `output/udflow/contract.md` or delete a `design.md` section |
| `preserveOnCompact` | `compact-fidelity.js` — the post-compaction workflow-continuity reminder |

A malformed or unreadable settings file is treated as "not disabled" (fail-safe: the guard keeps running). Example — disable `contract-guard.js` for one project:

```json
// .claude/settings.json
{
  "udflow": { "contractGuard": false }
}
```

**Environment variables** — unset (empty) by default:

| Variable | Effect when set |
|---|---|
| `UDFLOW_ENFORCE_STOP` | any non-empty value makes the `orchestration-check.js` Stop hook hard-block delivery on a verdict/evidence mismatch, instead of only advising |
| `UDFLOW_HOOK_DEBUG` | `1` makes every hook append a one-line debug trace (used by [`/udflow:doctor`](#quick-start) and manual troubleshooting) |

```bash
# bash/zsh
UDFLOW_ENFORCE_STOP=1 claude
```

```powershell
# PowerShell
$env:UDFLOW_ENFORCE_STOP = "1"; claude
```

**Per-task capabilities** — off unless explicitly enabled for that task, never a hard dependency:

| Capability | How to enable |
|---|---|
| Codex cross-model second opinion | say so in the task (e.g. "use Codex if the repair loop gets stuck") — see [`references/external-capabilities.md`](udflow/skills/universal-dev-flow/references/external-capabilities.md) |
| MCP tools per reviewer | ships with an empty `.mcp.json`; add a server (see [`mcp.example.json`](udflow/mcp.example.json)) and uncomment the matching `mcp__*` line in that reviewer's frontmatter |

```text
/udflow:run Fix the login bug. Use Codex if the repair loop gets stuck.
```

**Per-run flags** — pass as arguments to `/udflow:run`:

| Flag | Effect |
|---|---|
| `--deep` (or a `deep:` / `ultra:` prefix) | opts into deep-mode Tier 2: adversarial verification of findings + maximum reasoning effort for `gatekeeper`/`security-reviewer` — raises cost, never auto-engaged |
| `--no-deep` / `--shallow` | opts out of deep-mode Tier 1's deterministic panel enforcement, which otherwise auto-engages on high-risk/correctness-critical work |
| `--lite` | forces the smallest sufficient review panel and skips Tier 2, keeping a directly-relevant safety reviewer when a high-risk signal is present |
| `--report full` | the detailed end-of-run report (per-agent activity, full token/cost table) instead of the compact default |

```text
/udflow:run --deep Refactor the payment retry logic so a network timeout retries once with backoff.
/udflow:run --lite Fix the typo in the error message copy.
/udflow:run --report full Add rate limiting to the public API.
```

## Compatibility

udflow targets Claude Code. It also degrades under GitHub Copilot CLI where the plugin format loads but some Claude-Code-only hook outputs are not surfaced.

Compatibility and conformance smoke details live in [`docs/compatibility.md`](docs/compatibility.md). The short version:

- Claude Code is the primary runtime.
- GitHub Copilot CLI loads skills, subagents, and some PreToolUse decisions, but injected `SessionStart` and `Stop` output may be no-op.
- `destructive-guard.js` has been live-verified under Copilot CLI 1.0.65.
- Claude Code hook/agent contracts are moving targets; release smoke is recorded in [`RELEASING.md`](RELEASING.md).

## Trust and releases

udflow hooks auto-execute once the plugin is enabled, so install integrity matters.

Recommended safe install:

1. Install from a tagged release or pinned commit.
2. Review the shipped plugin's `hooks/` directory before enabling (repo path: `udflow/hooks/`).
3. Run `/udflow:doctor` after install.
4. Verify release tags with `git verify-tag vX.Y.Z` when a signed tag is available.
5. Verify release archives against their published `.sha256` files when assets are available.

See [`SECURITY.md`](SECURITY.md) for the trust model and [`RELEASING.md`](RELEASING.md) for release checklist, live smoke, signed tag setup, and checksum verification.

The quick-start marketplace command is a convenience path and follows the marketplace/repo state. Release checksums integrity-check the published archive; authenticity still depends on a signed tag or pinned SHA. They do not authenticate the default clone path, so use a tagged/SHA checkout or compare the verified archive against the installed `udflow/` tree when you need pinning.

## Cost

Typical real-app runs cost more than a one-shot AI review because udflow plans, verifies, reviews, and may repair. Order-of-magnitude guidance:

| Task | Reviewers | New tokens | Wall-clock |
|---|---|---|---|
| Light | `--lite`, core only | ~0.5-2M | a few minutes |
| Typical | 3-5 reviewers + one repair pass | ~2-7M | ~5-15 minutes |
| Deep | `--deep`, several repair loops | >10M | ~20-40 minutes |

Use `/udflow:run --lite` for cheaper runs, `--deep` for maximum scrutiny, and `--report full` when you need detailed per-agent activity and cost. An automatic **fast lane** goes one step further on small low/medium-risk changes: when execution evidence already answers the reviewer's question (every behavior-changing criterion has a red→green test and the full required suite is green), `test-reviewer` is evidence-substituted and disclosed via `udflow:panel=substituted:test-reviewer` — fewer agents on the same evidence, never on high-risk / deep runs.

## Docs

- [`docs/tutorial-first-run.md`](docs/tutorial-first-run.md) - your first udflow run, end to end.
- [`docs/task-writing-guide.md`](docs/task-writing-guide.md) - how to write tasks udflow can verify.
- [`docs/how-to-read-verdicts.md`](docs/how-to-read-verdicts.md) - what `READY` / `FIX REQUIRED` / `NOT READY` mean.
- [`docs/compatibility.md`](docs/compatibility.md) - tested runtimes and conformance smoke checklist.
- [`docs/advanced/external-capabilities.md`](docs/advanced/external-capabilities.md) - optional MCP, Codex, browser, and design capabilities.
- [`EVIDENCE.md`](EVIDENCE.md) - real-world and benchmark evidence log.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - component map, stable contracts, and limits.
- [`SECURITY.md`](SECURITY.md) - trust model, safe install, and vulnerability reporting.
- [`RELEASING.md`](RELEASING.md) - release automation, live smoke, signed tags, and checksums.

## License

[MIT](LICENSE) · version history in [CHANGELOG.md](CHANGELOG.md).
