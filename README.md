# udflow - Universal Dev Flow (Claude Code plugin)

[![Validate](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

**English** · [繁體中文](README.zh-TW.md)

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

Five dependency-free Node hooks run in every enabled session. They are local-only, fail-open, and use only Node built-ins (`fs`, `os`, `path`, `crypto`).

| Hook | Event | Purpose |
|---|---|---|
| `plan-gate.js` | `PreToolUse` | Denies edit tools and obvious Bash writes while in plan mode. |
| `destructive-guard.js` | `PreToolUse` | Asks before narrow, unrecoverable destructive commands such as `rm -rf`, `git reset --hard`, `git push --force`, and PowerShell `Remove-Item -Recurse`. |
| `load-failure-memory.js` | `SessionStart` | Reads project `ai/FAILURE_MEMORY.md` or global `~/.claude/FAILURE_MEMORY.md` and injects a nonce-fenced, untrusted digest. |
| `compact-fidelity.js` | `SessionStart` · `compact` | Re-injects a concise workflow-continuity reminder after compaction. |
| `orchestration-check.js` | `Stop` | Advises when delivery claims contradict missing panel, blocking verdict, failed/unrun verification, or missing live-run evidence. |

These hooks never delete files, change system settings, alter permissions, run subprocesses, download code, or transmit code/transcripts. They are guardrails, not a sandbox. See [`SECURITY.md`](SECURITY.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).

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

Use `/udflow:run --lite` for cheaper runs, `--deep` for maximum scrutiny, and `--report full` when you need detailed per-agent activity and cost.

## Docs

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
