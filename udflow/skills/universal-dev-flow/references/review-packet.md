# Review Packet

Use a Review Packet before handing work to any reviewer. The packet is the reviewer source of truth. Do not use full thread history as the default reviewer input.

## Required Fields

- Task summary: one concise statement of the requested change.
- Success criteria: observable outcomes that define done.
- In scope: workflows, files, modules, or user-visible behavior reviewed.
- Out of scope: adjacent behavior intentionally not changed.
- Assumptions: only assumptions that affected implementation or verification.
- Implementation summary: what changed and why.
- Changed files: paths and short purpose for each relevant changed area.
- Verification evidence: commands/checks, status, outputs summarized, and blockers.
- Known risks: remaining uncertainty, migration/rollback concern, external dependency, or runtime limitation.
- Reviewer scope: exact question each selected reviewer should answer.
- Context exclusions: stale decisions, abandoned approaches, or old logs that reviewers should not treat as current.
- External-capability notes: which optional MCP/skills/subagents were used or were unavailable, and any resulting verification gaps.

## Handoff Template

```markdown
## Review Packet

Task:

Success criteria:

In scope:

Out of scope:

Assumptions:

Implementation summary:

Changed files:

Verification evidence:

Known risks:

Reviewer scope:

Context exclusions:

External-capability notes:
```

## Reviewer-Specific Scope

All reviewers report findings as `blocker` / `major` / `minor` (unified vocabulary). Only `gatekeeper` issues a `READY` / `FIX REQUIRED` / `NOT READY` verdict.

- `spec-reviewer`: requirement fidelity, business rules, contract behavior, hidden behavior-changing assumptions.
- `test-reviewer`: missing tests, weak verification, regression risk, edge/failure paths, browser evidence gaps for UI.
- `code-reviewer`: local implementation quality, maintainability, framework usage, resource handling, efficiency on changed paths.
- `security-reviewer`: auth/authz, input handling, secrets, trust boundaries, data exposure, unsafe external or filesystem behavior.
- `architecture-reviewer`: layering, boundaries, dependency direction, orchestration placement, structural drift.
- `operability-reviewer`: logs, observability, retries, timeouts, cancellation, deployment, rollback, diagnosability.
- `ui-ux-reviewer`: usability, interaction flow, layout, states, accessibility basics, responsive behavior.
- `gatekeeper`: aggregate findings, resolve conflicts, judge readiness, decide failure-memory need.

## Full-History Rule

Full thread history is not a review packet. It can contain stale assumptions, abandoned designs, unrelated logs, and sensitive context. Prefer a concise packet with file references and current evidence.

Note: in Claude Code, each subagent runs in its own isolated context window and does not inherit the main thread's history by default, so the "concise packet over full history" discipline is reinforced structurally. Still give each reviewer a focused packet; do not paste raw history.
