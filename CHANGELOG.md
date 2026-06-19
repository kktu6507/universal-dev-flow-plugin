# Changelog

All notable changes to this plugin are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.9.0]

Outcome of a cross-language blind benchmark (6 languages / 6 external repos / 32 real bugs; recorded in `EVIDENCE.md`). The changes are **language-neutral** by design — they target failure modes seen across C#, JS, Python, Java, Go, and Rust, never one language.

### Added
- **Reviewer defect-detection discipline** in the shared reviewer contract (`reviewer-common.md` + the delivered `review-packet.md` block): judge code on its merits, not its pedigree (do not assume idiomatic/canonical/"intentional" code is correct — a defect is real only with a concrete failure case); rate severity by impact (do not downgrade a demonstrated defect to `minor`); look for **omissions** against the implied contract; and reason in the **target language's real semantics**. Validated to add **zero** false positives (clean-code controls stayed clean).
- **Recall-vs-precision guidance** (`reviewer-selection.md`): for correctness-critical changes, prefer the multi-lens **panel** + requirement/intent context + **Deep Mode** over a single reviewer. The benchmark showed a single reviewer catches only a minority of subtle defects and that stronger wording alone does not lift recall, whereas a panel recovers defects a lone reviewer misses — at high precision.

### Notes (honest characterization from the benchmark)
- udflow's measured edge is **precision (near-zero false positives — 1 across ~90 blind reviews) + structural depth (panel / Deep Mode / intent)**, not single-pass recall (~34% hit / 50% touched on the blind set). Recall is bounded for subtle idiom/omission/domain defects; structure and intent are the levers, not reviewer prose.

## [0.8.1]

### Changed
- **Verification gate now warns about backgrounding build/test commands.** A lingering child process (a build server, file watcher, or dev server) that inherits a backgrounded command's output pipe keeps the background task stuck "running" long after the command finished. `verification-gate.md` now says to prefer foreground, and for the common .NET case (MSBuild node-reuse workers + the Roslyn `VBCSCompiler` server persist for minutes) to add `/p:UseSharedCompilation=false /nr:false` (or `MSBUILDDISABLENODEREUSE=1`) when backgrounding. Surfaced by a real session where a `dotnet test` that finished in ~2s left a background task wedged behind orphaned build servers. Root cause is the .NET SDK + harness background-pipe semantics (not udflow); this is a guard-rail, not a fix.

## [0.8.0]

Closes the documented plan-gate Bash gap with a narrow, low-false-positive tripwire (informed by an independent cross-model second opinion from Codex, then trimmed for usability).

### Added
- **Plan gate now also blocks *obvious* Bash working-tree writes** in plan mode: redirect-to-file (`>`, `>>`, `&>`), `tee` to a file, `sed -i` (including `-i.bak` and `--in-place`), and `git apply` (dry-run flags `--check`/`--stat`/`--numstat`/`--summary` are exempt — they write nothing). `Bash` is added to the `PreToolUse` matcher; the check (`bashLooksLikePlanWrite`) strips quoted strings first and **defaults to allow** — it deliberately does **not** block read-only Bash, `git checkout`/`git restore` (branch navigation), `/dev/null` / `NUL` redirects, or fd dups like `2>&1`. It is a safety net for the common cases, **not** full shell classification: by design it also lets no-space redirects (`echo x>f`), `>|`, and `$VAR`/`~` targets through, because tightening those would false-positive on arithmetic like `$((a>b))` — false positives are ranked worse than a documented miss. The workflow rule against Bash tree-writes during planning remains the real guarantee. Bash denials get a distinct, honest reason message (names the heuristic and the ExitPlanMode escape hatch). Covered by new behavioral tests including a documented-miss block that pins the intentional boundary.

### Changed
- README (EN/zh), `SKILL.md`, `implementer.md`, and `external-capabilities.md` updated from "Bash slips past it / not covered" to the accurate "obvious Bash writes are blocked; it's a narrow tripwire, not complete enforcement."

## [0.7.2]

Follow-ups surfaced by a `--deep` (deterministic-Workflow) dogfood review; all minor, no behavior change.

### Fixed
- `spec-reviewer`'s commented MCP example now matches the documented mapping (a PM tracker, e.g. `mcp__linear__*`, instead of `mcp__github__*` which is the code-reviewer's diff/PR server).

### Added
- A behavioral test that `Edit`/`MultiEdit` are denied in plan mode (previously only the static `hooks.json` matcher covered them; a regression dropping them from `plan-gate.js` would have passed the suite). Also normalized line endings to LF (`.gitattributes`) and isolated the plan-gate tests' `HOME` (set both `HOME` and `USERPROFILE`) so they don't touch the real `~/.claude/plans`.

## [0.7.1]

A pragmatic dogfood-review follow-up (udflow reviewing its own 0.7.0): usability-weighted fixes, no new complexity.

### Changed
- **README restructured for onboarding.** Quick start and the example transcript now come first; the wall of caveats is collapsed into a short "What you're opting into" and the deep-dive (plan gate, failure memory, deep mode, cost table, external capabilities) moved under a single "Advanced" section. The status banner is tightened (honest, not self-discouraging), and the plan-gate/Bash caveat is stated once instead of three times. Same honesty, far less to read before installing.
- **Docs corrected to match the shipped hooks:** the READMEs now say **three** hooks (the 0.7.0 `orchestration-check` Stop hook was missing from the count and the Components list). Deep mode (`/udflow:run --deep`) is now documented.
- **`orchestration-check` is now conservative:** it only warns when a `READY` verdict is asserted **and none** of the core panel agents appear in the transcript — eliminating false reminders on correct sessions without adding any transcript-format machinery.

### Added
- A junction-based test (EPERM-skip-guarded) for the plan-gate symlink/realpath exemption, and a "panel partially ran → stay silent" test for `orchestration-check`.
- CI prevention: `validate-structure.mjs` now asserts every hook wired in `hooks.json` is named in `README.md`, so a future hook can't ship with stale docs.

## [0.7.0]

A large honesty + hardening pass from a fresh-eyes multi-agent review (all findings A–M), plus native plan-mode integration and an optional ultracode/Workflow deep mode.

### Changed
- **Plan gate honesty + native plan mode.** udflow now drives Claude Code's native plan mode for its planning phase (Detect → Use → Else-Disclose) so the read-only hook is live even when your default mode isn't plan; if the runtime can't switch modes it proceeds read-only by discipline and discloses that the hook isn't enforcing. README/docs no longer claim an unconditional "no files changed before approval", and now state the gate covers structured edit tools only — **not `Bash`**.
- **Cost guardrails.** The repair loop's iteration cap is now consistent (Stuck Summary after the same blocker persists two iterations — not "no fixed cap"); escalation to a deeper/opus pass asks first; docs explain manual-only operation.
- **Failure memory is written by a single actor** (main thread / gatekeeper after the verdict); reviewers/implementer only propose entries — avoids concurrent lost-update corruption.
- **`opus` use is disclosed at the agent level** (gatekeeper/security-reviewer state the model actually used and reduced confidence on fallback). `ui-ux-reviewer` gained a concrete fallback baseline (WCAG AA contrast, ≥44px targets, required states).

### Added
- **Optional deep mode** (`references/deep-mode.md`): when an ultracode/Workflow capability is detected or opted in (`/udflow:run --deep`), the selected panel, gatekeeper barrier, and repair loop run as a deterministic Workflow (the panel actually runs), with adversarial verification of blocker/major findings and raised effort — depth, not breadth, and never a hard dependency.
- **`orchestration-check` Stop hook** (best-effort, non-blocking, fail-open): warns if a READY verdict is asserted without the core panel actually running as subagents.
- **Hook hardening**: stdin size cap + write-then-exit flush (so a deny can't be truncated), `UDFLOW_HOOK_DEBUG` opt-in trace, `permission_mode`/`permissionMode` alias, large-file read cap, and plan-gate symlink/realpath hardening.
- **Failure-memory injection is fenced for real** (per-run nonce delimiter + neutralization of role-marker/instruction-tag lines), with tests — replacing the prior prose-only fence.
- CI: reference/agent/hook existence checks, `metadata.version` + CHANGELOG-entry validation, a `compact` SessionStart trigger, Windows test matrix, pinned actions, and CODEOWNERS.
- README onboarding: Node prerequisite, marketplace-name explanation, and a troubleshooting section; an "early / experimental" status label.

### Fixed
- `gatekeeper` Inputs list now includes `code-reviewer`; `reviewer-common.md` no longer falsely claims each reviewer inlines the contract (it is delivered via the Review Packet's "Shared reviewer contract" block).

## [0.6.0]

### Changed
- **Plugin moved into the `udflow/` subdirectory; only that subdir is distributed.** The marketplace `source` is now `./udflow`, so installs no longer pull dev/CI files (`test/`, `.github/`, `package.json`) into the user's plugin cache. Install/update commands are unchanged.

### Removed
- `ai/FAILURE_MEMORY.md` — it was a runtime output accidentally committed during dogfooding and should never ship in a distributed plugin. Added `.gitignore` so workflow runtime output and scratch/process files can't be committed again.

### Added
- Distribution-hygiene checks in CI (`validate-structure.mjs` fails if runtime/dev artifacts or scratch files appear in the shipped tree).
- An "Artifact Hygiene" rule in the workflow: delete temporary verification scaffolding before finishing, and never commit the workflow's runtime output (e.g. `FAILURE_MEMORY.md`) into a distributed tool/plugin repo.

## [0.5.2]

### Fixed
- **Failure-memory digest no longer over-reports omissions.** The "(N older entries omitted)" note counted skipped template placeholders; it now counts only real dropped entries (was firing on the shipped sample). [dogfood review]
- **Failure-memory digest never collapses to an empty note.** An oversized newest entry previously dropped every entry via an early `break`; the newest entry is now always kept (bounded) and the note is suppressed when nothing is shown.
- **Plan-gate exemption is anchored to the user home.** Previously any path containing `/.claude/plans/` (incl. a repo-local one) bypassed the plan-mode write block; it now requires the resolved path under `~/.claude/plans/`. `NotebookEdit` is now gated too.
- Prevention-rule extraction regex anchored (won't capture a stray body line); `validate-structure.mjs` now fails explicitly on a plugin name mismatch / missing marketplace version instead of silently comparing the wrong entry.

### Added
- Committed hook test suite (`test/hooks.test.mjs`, `node --test`) locking in the above fixes; CI now `node --check`s both hooks and runs the tests (previously CI never executed the hook JS).
- `ai/FAILURE_MEMORY.md` recording the three lessons from this review.
- Injected failure-memory content carries a prose disclaimer marking it untrusted reference data (a real nonce-delimited fence + line neutralization landed later in 0.7.0); CI workflow adds `permissions: contents: read` and concurrency.

## [0.5.1]

### Changed
- **Codex is now off by default (explicit per-task opt-in).** udflow no longer escalates to Codex on its own; it only delegates when the user explicitly enables Codex for the task — even if Codex is installed and the repair loop is stuck. This makes third-party (OpenAI) code/context egress a conscious, consented choice. A missing opt-in or absent Codex never errors.

## [0.5.0]

### Added
- **Optional Codex escalation.** When the auto-fix loop is stuck, udflow may delegate one independent cross-model diagnosis to Codex (the OpenAI GPT-family rescue plugin) — strictly optional, detected via Detect → Use → Else-Disclose. If Codex is not installed it is never called and does not error.

### Docs
- README (EN + zh-TW): disclosed that Codex use sends code/context to an external (OpenAI) model at extra cost and only runs if the Codex plugin is installed; listed Codex under optional external capabilities.

## [0.4.0]

### Changed
- **Failure memory redesigned into three stages.** The SessionStart hook now injects a compact **digest** (entry title + prevention rule + tags, newest first, capped) instead of dumping the whole file with a blind ~12000-char truncation. Relevant full entries are retrieved during planning by affected files/area/language/tags, and file size is kept down by consolidation (merge duplicates, fold recurrences, prune obsolete) rather than truncation.
- Truncation is now entry-aware (never cuts mid-entry) and only a safety net; non-template files fall back to an entry-aware excerpt of the newest content.

### Added
- `Tags` field in the failure-memory entry template (and the sample), used by the digest and targeted retrieval.

### Docs
- Moved the "Good to know" disclosures to the top of the README (before Quick start) so risks are seen first, and reworded the plan-gate / failure-memory bullets to make clear the hooks are invisible during normal work.
- Rewrote the README "Failure memory" section to describe the three-stage read/recall/consolidation flow.

## [0.3.0]

### Changed
- **Language is now neutral.** Human-readable output follows the file/repo/user language and defaults to English instead of Traditional Chinese.
- **Framework-neutral quality bar.** `implementer` and `code-reviewer` no longer prefer Microsoft/.NET by default; they follow the project's language/framework and its official best practices (with .NET as just one example).
- The workflow now identifies the repo's architecture and primary language/framework first, implements to that language's official best practices, and — when existing code diverges materially — raises corrections at the plan gate instead of silently refactoring.

### Added
- English `README.md` (primary) and `README.zh-TW.md` (Traditional Chinese), cross-linked.
- A realistic example transcript and a "stays out of the way for small tasks" note in the README.
- A "Good to know" section disclosing token/cost, `opus` use, the always-on hooks, file writes, and auto-trigger behavior.
- CI workflow that validates plugin structure on push/PR, plus a status badge.
- This `CHANGELOG.md`.
- `keywords` in `plugin.json` for discoverability.
- `examples/FAILURE_MEMORY.sample.md` showing a filled-in entry.

## [0.2.1]

### Fixed
- `plan-gate` hook now exempts Claude Code's own plan files (`~/.claude/plans/`), so blocking writes in plan mode no longer interferes with the native plan workflow.

## [0.2.0]

### Added
- `LICENSE` (MIT).
- Failure-memory Entry Template in `references/verification-gate.md`.
- `references/reviewer-common.md` as the shared reviewer contract.

### Changed
- Trimmed the skill description and all 9 agent descriptions to cut per-session context cost while preserving triggering semantics.
- Deduplicated the 7 reviewers against the shared contract (kept each reviewer's domain content).

## [0.1.0]

### Added
- Initial release: plan-gated multi-agent workflow (`implementer` + 7 reviewers + `gatekeeper`), `plan-gate` and `load-failure-memory` hooks, opt-in MCP, and optional external capabilities.
