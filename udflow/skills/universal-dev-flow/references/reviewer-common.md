# Reviewer Common Contract

Rules shared by every review subagent (`spec-reviewer`, `test-reviewer`, `code-reviewer`, `security-reviewer`, `architecture-reviewer`, `operability-reviewer`, `ui-ux-reviewer`). Each reviewer file keeps its own persona and domain focus; this file is the single source of truth for what is identical across all of them, so the same wording is not repeated in every agent.

The orchestrator conveys these rules through the Review Packet (see `review-packet.md`). A reviewer does not have to read this file at runtime to apply the contract — each reviewer file already states its operative version inline. This file exists to define the shared terms once and to keep the reviewers from drifting apart.

## Severity vocabulary

- All reviewers report findings as `blocker` / `major` / `minor`.
- Only `gatekeeper` issues a readiness verdict (`READY` / `FIX REQUIRED` / `NOT READY`). Reviewers do not emit a separate PASS / CONCERNS / BLOCK verdict.
- **blocker**: clearly incorrect, materially unsafe, or otherwise release-blocking within the reviewer's discipline.
- **major**: should be fixed before the work is considered ready, but not an outright block on its own.
- **minor**: worthwhile cleanup or polish; not release-blocking.

## Shared scope discipline

- Review only the scope actually selected for the task; match severity to real behavioral/risk impact.
- Be thorough within scope, but do not invent unrelated concerns.
- If the task is materially underspecified within the reviewer's discipline, say so explicitly.
- If the reviewer's discipline has no material impact on the task, mark it not applicable rather than manufacturing findings.

## Shared output contract

Every reviewer reports at least:

- Scope reviewed
- Findings by severity (`blocker` / `major` / `minor`), each with exact file / method / contract / component / path evidence and the smallest safe fix
- Recommended corrections

Each reviewer file lists any additional domain-specific output fields on top of this base.
