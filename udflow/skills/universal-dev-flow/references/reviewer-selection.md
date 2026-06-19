# Reviewer Selection

Select the smallest sufficient panel that preserves release quality. Expand only when risk increases or evidence shows a missing discipline.

## Core Reviewers

Always include for non-trivial formal review:

- `spec-reviewer`
- `test-reviewer`

## Conditional Reviewers

Add `code-reviewer` when the task touches:
- non-trivial source-code changes
- maintainability-sensitive refactors
- framework or library usage
- async, concurrency, cancellation, or resource lifecycle handling
- error handling, logging, configuration patterns
- data access, serialization, mapping, or performance-sensitive paths
- code-quality or simplification claims on changed paths

Add `security-reviewer` when the task touches:
- authentication or authorization
- input validation, parsing, deserialization, or injection risk
- secrets, tokens, credentials, or unsafe logging
- trust boundaries, data exposure, external calls
- filesystem, system, privilege-sensitive, or destructive behavior

Add `architecture-reviewer` when the task touches:
- cross-module structure
- boundaries, layering, orchestration placement
- significant refactors or new abstractions
- dependency direction or structural maintainability

Add `operability-reviewer` when the task touches:
- background jobs
- retries, timeouts, cancellation, resilience
- logging, observability, diagnostics
- configuration, deployment, migration, rollback
- external dependency reliability
- encoding, locale, or runtime text-processing interoperability

Add `ui-ux-reviewer` when the task touches:
- UI/frontend rendering
- interaction flow, layout, styling
- user-facing states
- component behavior
- usability, accessibility, responsive behavior
- user-visible copy or presentation quality

Use `gatekeeper` after selected reviewers finish.

## Risk Matrix

- Low risk: narrow behavior change, no contracts, no security boundary, no UI. Use core reviewers plus `code-reviewer` if code changed.
- Medium risk: shared behavior, data flow, UI workflow, background behavior, or config changes. Add the directly relevant conditional reviewers.
- High risk: auth/authz, schema or migration, destructive operations, cross-module orchestration, deployment/rollback, external integration, or ambiguous user-facing UX. Add all directly relevant conditional reviewers and pause for user input when product or release safety depends on the answer.

## Repair Loop

- Rerun reviewers whose discipline is affected by the fix.
- Rerun `code-reviewer` after material code changes.
- Rerun `ui-ux-reviewer` after UI-related fixes.
- Rerun `security-reviewer` after trust-boundary or validation fixes.
- Rerun `architecture-reviewer` after boundary, layering, or abstraction changes.
- Rerun `operability-reviewer` after runtime, config, deployment, logging, or resilience fixes.
- Always rerun `gatekeeper` after reviewer findings are updated.

Do not rerun unrelated reviewers merely for ceremony. If a fix introduces a new risk category, add that reviewer for the next review pass.

## Model Tiers (single source of truth)

Most agents inherit the session model. Two run on `opus` because they are the highest-leverage, hardest-to-get-right roles: `security-reviewer` (adversarial reasoning where a miss is most costly) and `gatekeeper` (the release authority aggregating and adjudicating). If `opus` is unavailable, those steps fall back to the available model and must state the model used and that confidence may be reduced. Other files should reference this section rather than restating the rationale.

## Recall vs precision (benchmark-informed)

An internal cross-language blind benchmark indicates a consistent profile: the review is **precise** (near-zero false positives), but a **single** reviewer catches only a minority of subtle defects — language idioms (value/identity/receiver semantics, encoding, ownership/lifetimes, overflow), **omissions** ("what is missing vs the intent"), and spec/domain-dependent bugs. Recall improved materially only with **structure**, not with stronger wording to one reviewer:

- For correctness-critical changes, do not rely on a lone reviewer — include the directly-relevant **multi-lens panel** (a defect one discipline rationalizes as "fine", another flags).
- Give each reviewer the **requirement/intent**, not just the diff — omission and spec-dependent defects are invisible without it.
- Use **Deep Mode** (adversarial verification) for the hardest changes.

Breadth of lenses and intent context are what lift recall; precision stays high regardless. Do not try to raise recall by making a single reviewer "try harder" — that was measured to not help.

## Deep Mode

Deep mode (see `references/deep-mode.md`) does **not** change reviewer selection — the panel is still the smallest sufficient set chosen above. It only makes the selected panel run deterministically (as a Workflow `parallel` barrier), adds adversarial verification of blocker/major findings, runs the repair loop as loop-until-dry (still under the Auto-fix loop's hard iteration cap), and raises `gatekeeper`/`security-reviewer` to maximum reasoning effort. Depth, not breadth.
