# Review Packet

Use a Review Packet before handing work to any reviewer. The packet is the reviewer source of truth. Do not use full thread history as the default reviewer input.

## Required Fields

- Task summary: one concise statement of the requested change.
- Acceptance criteria (user-approved): a numbered checklist of observable, verifiable outcomes that define done — approved by the user at the plan gate. The `gatekeeper` checks each item (met / unmet / deferred; see `agents/gatekeeper.agent.md`), and an unmet, non-deferred criterion blocks `READY`. They are approved as part of the plan at ExitPlanMode — not a separate approval step. On high-risk work these are the plan-grounding **sharpened contract**.
- In scope: workflows, files, modules, or user-visible behavior reviewed.
- Out of scope: adjacent behavior intentionally not changed.
- Assumptions: only assumptions that affected implementation or verification.
- Implementation summary: what changed and why.
- Changed files: paths and short purpose for each relevant changed area.
- Changed diff (filtered): a filtered, capped unified diff produced once by the orchestrator, given to every reviewer as a shared starting point so each reviewer need not re-run the base diff. State a **retrieval pointer** alongside it — what was trimmed (the cap, the path scope, excluded paths, any truncated hunks) and the exact command to regenerate the *same-scoped* untrimmed diff — so a reviewer who needs more follows a pointer instead of reconstructing what was dropped or running a bare `git diff` that yields a differently-scoped view.
- Verification evidence: a structured per-check table — one row per check with command, check type (build / test / typecheck / lint / …), required? (yes/no), ran? (yes/no), real exit status (0 / non-zero / —), and blocked-with-reason when not run — plus a one-line summary. The `gatekeeper` reads the real exit status as authority over reviewer prose (see `agents/gatekeeper.agent.md`, "Command-evidence authority"); a single rollup is surfaced as `udflow:verify=pass|fail|unrun|na`.
- Known risks: remaining uncertainty, migration/rollback concern, external dependency, or runtime limitation.
- Reviewer scope: exact question each selected reviewer should answer.
- Context exclusions: stale decisions, abandoned approaches, or old logs that reviewers should not treat as current.
- External-capability notes: which optional MCP/skills/subagents were used or were unavailable, and any resulting verification gaps.

On high-risk work where the plan-grounding step ran (`references/plan-grounding.md`), populate the Acceptance criteria and Reviewer scope from its **sharpened contract**, and seed Verification evidence / expected tests from its **implied edge checklist**. This contract-level intent is the dominant recall lever (see `references/reviewer-selection.md`, *Recall vs precision*), so carry it into the packet rather than re-deriving a vaguer version.

## Handoff Template

```markdown
## Review Packet

Task:

Acceptance criteria (user-approved, numbered; gatekeeper checks each):

In scope:

Out of scope:

Assumptions:

Implementation summary:

Changed files:

Changed diff (filtered): <diff>
— Trimmed: <what was capped / path scope / excluded paths / truncated hunks>
— Regenerate (same scope): `<exact command, e.g. git diff <base>..<head> -- <paths>>`

Verification evidence (per-check table: command / type / required? / ran? / exit status / blocked-reason, + one-line summary):

Known risks:

Reviewer scope:

Context exclusions:

External-capability notes:

Shared reviewer contract:
- Report findings as `blocker` / `major` / `minor`; do NOT emit a PASS/CONCERNS/BLOCK verdict — only `gatekeeper` issues `READY` / `FIX REQUIRED` / `NOT READY`.
- Review only the selected scope; be thorough within it but do not invent unrelated concerns; if your discipline has no material impact, mark it not applicable.
- Judge on merits, not pedigree: looking idiomatic/canonical/"intentional"/like a well-known library is not evidence of correctness. A defect is real only if you can name a concrete input or condition that yields a wrong result, leak, crash, or contract violation; then report it.
- Rate severity by that failure case's impact (data loss / security / crash / wrong result ⇒ `blocker`/`major`); never downgrade a demonstrated defect to `minor` because the code looks established or "accepted".
- Look for omissions, not only wrong lines: compare behavior to what the name/signature/docstring/requirement imply and flag what is missing (unhandled case, unpaired create/delete cleanup, a required guard/limit/validation, a value like length/default/header that should be set) — anchored to that implied contract, not speculation.
- When the packet lists numbered acceptance criteria, evaluate coverage against each within your discipline and flag any not demonstrably met (the `gatekeeper` makes the final per-criterion ruling).
- Reason in the target language's real semantics (truthiness/equality, value-vs-reference and receiver semantics, string/byte/encoding, ownership/lifetimes, numeric overflow), not as generic pseudocode.
- Enumerate; do not stop at the first finding — one real issue does not make the rest of the scope correct.
- A filtered diff is provided as a starting point; you keep full Read/Grep freedom — read the surrounding code whenever the diff is insufficient to judge (omissions and cross-file issues usually require it). The packet states what was trimmed and the exact command to regenerate the same-scoped full diff, so reading more is following a pointer, not guessing. The diff saves a redundant base read; it does not cap your investigation.
- When inspecting, filter noise, not signal — run at minimal verbosity and pull only the decision-relevant output for the content type (diffs → the changed hunks; tests/builds → the failing assertion + first failing frame; logs → error lines + context; searches → `rg -l`/`-c` to locate, then pull context); never drop detail you need to judge correctness.
- Output: scope reviewed; each finding as one compact line — `severity` · `file:line` (or contract/component/path) · the concrete failure or violated contract · smallest safe fix — not a prose paragraph; reference code by `path:line` rather than restating it, and do not echo the diff or file contents already provided in the packet; recommended corrections. Expand a finding to prose only where one line would lose evidence.
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
