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
- **Correctness-critical logic** — parsing, numeric / encoding / overflow handling, concurrency, security or trust boundaries, data integrity, or any path with non-obvious edge cases — gets **at least two independent lenses** (not a lone reviewer), since single-reviewer recall on subtle defects is low and a second lens recovers defects the first rationalizes as fine (see *Recall vs precision*).

## Lite path (cost floor)

The Risk Matrix above auto-scales the panel to the task's risk — that *is* the default cost control. For a change the user knows is small, `--lite` (passed to `/udflow:run`) forces the **smallest sufficient panel** explicitly and skips deep mode: core `spec-reviewer` + `test-reviewer` only (plus `code-reviewer` when code changed), no other conditional reviewers, and skips the costly deep-mode **Tier 2** (adversarial verification / maximum effort). (Tier 1 deterministic enforcement costs ≈ the standard flow and only auto-engages on high-risk work — which `--lite` is not for.) It is the downward counterpart to `--deep` (the upward knob); the unflagged default stays risk-proportional.

**Safety floor — `--lite` does not hide real risk.** When a genuine high-risk signal is present (auth/authz, secrets, schema/migration, destructive operations, or other Risk-Matrix High signals), keep the one directly-relevant safety reviewer (`security-reviewer` / `architecture-reviewer` / `operability-reviewer`) even under `--lite`, and disclose it (e.g. "kept `security-reviewer` despite `--lite` — auth touched; the rest ran lite"). `--lite` lowers cost for genuinely low-risk work; it is a **disclosed** recall/cost tradeoff, not a license to skip a discipline the risk demands. If the task is High risk overall, tell the user `--lite` is not appropriate here rather than silently dropping coverage. When the safety floor retains a reviewer on a high-risk signal, Tier-1 deterministic enforcement still applies to that minimal retained panel — `--lite` lowers breadth and cost, not enforcement.

## Plan Grounding (high-risk, pre-approval)

The same risk signals above also gate the conditional **plan-grounding & intent-sharpening** step (`references/plan-grounding.md`), which runs *before plan approval* — it is not a reviewer. Run it when the task is High risk or correctness-critical (or already triggers `security-reviewer` / `architecture-reviewer` / `operability-reviewer`); skip it for low/medium-risk work. It adds depth at the plan stage — grounding the plan in the code's reality and sharpening the intent into a contract plus an edge checklist — **not** breadth: reviewer selection is unchanged.

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

**Tiering down (cost, bounded — policy, not a frontmatter pin).** The cheap tier *is* the session model, reached via `model: inherit` — already the default for every agent except the two above, so on any non-`opus` session the leaf reviewers already run the cheaper session model with nothing extra to do. Do **not** pin a cheaper-than-session model (`model: haiku`/`sonnet`) in agent frontmatter: that would force a sub-session model even on a Sonnet session and make a leaf a permanent cheap single reviewer — which *Recall vs precision* below says lowers recall. The one place a deliberate down-tier helps is an **`opus` session run with `--lite`**: there the panel is already just `spec-reviewer` + `test-reviewer` (+ `code-reviewer` when code changed), and `test-reviewer` / `code-reviewer` MAY run at the session's default (non-`opus`) tier to cut cost. Keep `spec-reviewer` at `inherit` (omission/intent is the recall-critical lens), keep `security-reviewer` + `gatekeeper` up-tiered unconditionally, and **disclose** the per-reviewer model whenever a non-default tier was applied.

## Recall vs precision (benchmark-informed)

An internal cross-language blind benchmark indicates a consistent profile: the review is **precise** (near-zero false positives), but a **single** reviewer catches only a minority of subtle defects — language idioms (value/identity/receiver semantics, encoding, ownership/lifetimes, overflow), **omissions** ("what is missing vs the intent"), and spec/domain-dependent bugs. Recall improved materially only with **structure**, not with stronger wording to one reviewer:

- For correctness-critical changes, do not rely on a lone reviewer — include the directly-relevant **multi-lens panel** (a defect one discipline rationalizes as "fine", another flags).
- Give each reviewer the **requirement/intent**, not just the diff — omission and spec-dependent defects are invisible without it.
- Use **Deep Mode** (adversarial verification) for the hardest changes.

Breadth of lenses and intent context are what lift recall; precision stays high regardless. Do not try to raise recall by making a single reviewer "try harder" — that was measured to not help.

## Deep Mode

Deep mode (see `references/deep-mode.md`) does **not** change reviewer selection — the panel is still the smallest sufficient set chosen above. It has two tiers. **Tier 1** makes the selected panel run deterministically (a Workflow `parallel` barrier, with `gatekeeper` as a `pipeline` barrier after it) using the **same reviewers at the same reasoning effort** — so it **auto-engages on high-risk / correctness-critical work when the Workflow capability is present** (opt-out via `--no-deep`), because enforcement costs ≈ the standard flow. **Tier 2** adds adversarial verification of blocker/major findings, loop-until-dry repair (still under the Auto-fix loop's hard iteration cap), and maximum reasoning effort for `gatekeeper` / `security-reviewer` — this raises cost and stays **explicit opt-in** (`--deep`). Depth, not breadth, in both tiers.
