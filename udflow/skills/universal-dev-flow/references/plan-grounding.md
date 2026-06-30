# Plan Grounding & Intent Sharpening

A conditional, read-only step that runs **before plan approval** on high-risk work. It strengthens the plan with two kinds of *new information* — the code's reality and a sharpened contract — and surfaces them at the plan gate so the user approves with the full picture. It does **not** replace the human approval, and it does **not** add reviewers.

This step exists for two benchmark-grounded reasons (see `references/reviewer-selection.md`, *Recall vs precision*, and `EVIDENCE.md`): the #1 miss category is **omission** ("missing behavior vs the intent", ~36%), whose root cause is in the plan; and the dominant recall lever is **contract-level intent in the Review Packet**, not more reviewers on the same content. An omission is cheapest to fix at the plan, before any code is written; sharpening the intent before approval pushes exactly that lever.

## When it runs (risk gate)

Run this step only when the task is high-risk, **reusing the existing risk definitions** in `references/reviewer-selection.md` — do not invent a new standard. Trigger when any of these holds:

- the task is in the **High risk** row of the Risk Matrix (auth/authz, schema/migration, destructive operations, cross-module orchestration, deploy/rollback, external integration, ambiguous user-facing UX); or
- the task is **correctness-critical** (parsing, numeric/encoding/overflow handling, concurrency, security/trust boundaries, data integrity, or any non-obvious-edge path); or
- the selection already triggers a correctness- or safety-relevant conditional reviewer (`security-reviewer` / `architecture-reviewer` / `operability-reviewer`) — that is itself a high-risk signal.

Default to **skipping** it for low/medium-risk work (a checkbox, a copy edit, a rename). A false trigger does not just cost tokens — it makes the user wait before approval — so bias toward not running it, consistent with the usability-over-strictness principle. This reuses the same risk taxonomy the orchestrator applies when selecting reviewers (the `references/reviewer-selection.md` Risk Matrix), evaluated here at plan time — not a second, separate standard.

## Stage A — Grounding (bring the code's reality)

Follow `Detect → Use → Else-Disclose` (see `references/external-capabilities.md`).

- **Use** a single, focused read-only grounding subagent — **prefer the dedicated `planner-creator`** (`agents/planner-creator.agent.md`; it runs this Stage A and also returns a draft plan, an advisory panel pre-selection, and a `design.md` detection), else a generic `Explore` pass — not a fan-out, because the user is waiting to approve.
- **Inputs**: the restated requirement plus the affected area/files.
- **Outputs (Grounding Findings, each anchored to `file:line` evidence)**:
  - the real call sites and entry points of the code being changed;
  - the edge/boundary handling that **already exists** (so the plan does not redo what is covered);
  - the real contracts, types, and data shapes touched;
  - adjacent code that constrains the change (invariants, locks, transaction boundaries);
  - the unknowns the scout could **not** confirm (state them honestly; do not guess);
  - for UI / design-system / interaction scope, whether a `design.md` design contract exists and applies (`references/design-spec.md`) — and, when one is needed but absent, a recommendation to establish one (the scout detects and recommends; it does not author it).
- **Anti-hallucination**: a claim about the code is usable only with concrete `file:line` evidence; mark anything unverified as unverified and do not fold it into the contract (the same evidence discipline as `references/reviewer-common.md`).
- **Else** (no grounding subagent capability — neither `planner-creator` nor `Explore`): the main thread does a best-effort local grounding (read the key files, locate call sites) and **discloses** that grounding ran without an independent subagent, with the resulting lower coverage and remaining uncertainty. Never hard-depend on the subagent; never error on its absence.

## Stage B — Intent Sharpening + Edge Enumeration (main thread)

The main thread synthesizes the following from Stage A's facts plus the requirement. Its job is to **produce artifacts** (a contract and checklists), **not** to issue an opinion or a verdict — a second opinion on the same plan brings no new information and is the failure mode this step avoids.

Produce:

1. **Sharpened contract** — replace each vague verb in the requirement with a checkable must-do, anchored to the requirement or Stage A evidence. (E.g. "refresh when the token expires" → "expired = within 30s of expiry; refresh before the call, not after a 401; if refresh itself fails, route to login; concurrent refreshes serialize under a lock and fire once".)
2. **Implied edge checklist** — enumerate the boundary inputs this change implies (empty / zero / overflow / very-large, multibyte / non-ASCII, null / empty / duplicate / multiple, malformed, by-value vs receiver, concurrent), each tagged with the expected result **or** "needs user decision".
3. **Open product decisions** — every ambiguity the contract surfaces becomes an `AskUserQuestion` option at the plan gate. Do **not** decide product behavior unilaterally.
4. **Gaps vs intent** — anything the requirement implies that the draft plan does not yet cover; fold these into the plan before presenting it.
5. **Contract-readiness check (high-risk, soft).** Before presenting the plan, assert the contract has (a) at least one *observable* acceptance criterion, (b) a `must-not-change` / scope statement, and (c) a verification path for each behavior-changing criterion. If any is missing, surface a `not contract-ready` disclosure at the plan gate naming the gap, e.g.:

   `This task is not contract-ready. Missing: observable AC · must-not-change scope · verification path.`

   This is a **disclosure + request to fill**, not a hard block — the user may still approve with the gap disclosed (usability-over-strictness). It runs **only** on the high-risk path this step already gates; low/medium-risk work never triggers it.

## Where the outputs go

| Output | Routed to | Effect |
|--------|-----------|--------|
| Sharpened contract | the Review Packet's Task / Acceptance criteria / Reviewer scope (`references/review-packet.md`) — on high-risk work it **is** the user-approved acceptance criteria the gatekeeper checks per-item | delivers the contract-level intent the benchmark shows lifts recall — the actual lever |
| Implied edge checklist | the Verification Gate's "exercise the change's risky inputs" (`references/verification-gate.md`) and the `test-reviewer` scope (`references/review-packet.md`) | the edge tests are enumerated at plan time, not improvised at verification time |
| Open product decisions | `AskUserQuestion` at the plan gate | the user decides the product behavior |
| Gaps vs intent | the plan itself, before `ExitPlanMode` | omissions are closed before any code is written |
| All of the above | presented at `ExitPlanMode` | the user approves seeing the real call sites, the precise contract, the implied edges, and the open decisions |

## Invariants

- **Read-only.** This step runs in plan mode and writes nothing to the working tree; the `plan-gate.js` hook still applies.
- **Assists, never replaces, human approval.** Its outputs are material for the user's decision at `ExitPlanMode`; ambiguities become `AskUserQuestion`; it never auto-decides product behavior.
- **Depth, not breadth.** It does not change reviewer selection (still the smallest sufficient set) and adds **no new reviewer** — Stage A runs as a single focused grounding subagent (`planner-creator`, else `Explore`), not a fan-out, and Stage B runs on the main thread. `planner-creator` is a *planning* agent (it only *recommends* the panel), never a reviewer added to it.
- **Never a hard dependency.** With no exploration subagent, the main thread falls back to local grounding and discloses; absence never raises an error.
- **Language.** Outputs surfaced to the user follow the user's language (see `SKILL.md`, Language And Text Integrity); identifiers, file names, commands, and the machine-checked tokens (`READY` / `FIX REQUIRED` / `NOT READY`, `blocker` / `major` / `minor`) stay verbatim.

## Deep mode

In a detected/opted-in deep mode (`references/deep-mode.md`), Stage A grounding may run as a read-only Workflow agent node; Stage B and the open-decision gate are unchanged. This step does not change reviewer selection in either mode.
