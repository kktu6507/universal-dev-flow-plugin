# Changelog

All notable changes to this plugin are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
