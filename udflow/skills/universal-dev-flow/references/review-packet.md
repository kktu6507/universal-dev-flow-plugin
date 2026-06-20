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

On high-risk work where the plan-grounding step ran (`references/plan-grounding.md`), populate Success criteria and Reviewer scope from its **sharpened contract**, and seed Verification evidence / expected tests from its **implied edge checklist**. This contract-level intent is the dominant recall lever (see `references/reviewer-selection.md`, *Recall vs precision*), so carry it into the packet rather than re-deriving a vaguer version.

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

Shared reviewer contract:
- Report findings as `blocker` / `major` / `minor`; do NOT emit a PASS/CONCERNS/BLOCK verdict — only `gatekeeper` issues `READY` / `FIX REQUIRED` / `NOT READY`.
- Review only the selected scope; be thorough within it but do not invent unrelated concerns; if your discipline has no material impact, mark it not applicable.
- Judge code on its merits, not its pedigree: do NOT assume it is correct because it looks idiomatic/canonical/"intentional"/like a well-known library. A defect is real if you can name a concrete input or condition that yields a wrong result, leak, crash, or contract violation — then report it.
- Rate severity by the impact of that failure case (data loss / security / crash / wrong result ⇒ `blocker`/`major`); do not downgrade a demonstrated defect to `minor` just because the code looks established or "accepted".
- Look for omissions, not only wrong lines: compare behavior to what the name/signature/docstring/requirement imply, and flag what is missing (unhandled case, cleanup that should pair with a create/delete, a required guard/limit/validation, a value like length/default/header that should be set) — anchored to that implied contract, not speculation.
- Reason in the target language's real semantics (truthiness/equality, value-vs-reference and receiver semantics, string/byte/encoding, ownership/lifetimes, numeric overflow), not as generic pseudocode.
- Enumerate; do not stop at the first finding — finding one real issue is not a reason to conclude the rest of the scope is correct.
- Output at least: scope reviewed; findings by severity with exact file/method/contract/component/path evidence and the smallest safe fix; recommended corrections.
```

The "Shared reviewer contract" block above must be filled into every reviewer handoff verbatim — a spawned reviewer cannot reach `reviewer-common.md` by path, so this is how the contract is delivered. Keep it in sync with `reviewer-common.md`.

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
