# Task Contract (`output/udflow/contract.md` — the per-run, persisted plan contract)

The contract externalizes the constructs udflow already produces at the plan gate (sharpened
intent, acceptance criteria, scope, implied edge checklist) into one re-runnable, diff-able
artifact. It is the UI-less counterpart to `references/design-spec.md`: a durable statement the
Review Packet derives from and the deterministic `scripts/contract-check.mjs` reads. It adds no new
ceremony — the content is what the plan already contains; this just writes it down.

## Where it lives (per-run scratch, gitignored — NOT committed)

`output/udflow/contract.md`, under the top-level `output/udflow/.gitignore` (`*` then `!.gitignore`,
`references/verification-gate.md`, Artifact Hygiene). Unlike `design.md` (a committed cross-task
contract), this is one run's scratch — it must never be committed into the consuming repo.

## Machine block (JSON — dependency-free, parsed by contract-check.mjs)

The FIRST ` ```json ` fenced block is the machine-readable contract. JSON (not YAML) so it parses
with zero dependencies. All fields optional except as noted; an absent block ⇒ the checker makes no
deterministic claim (fail-open).

```json
{
  "udflowContract": 1,
  "risk": "high",
  "acceptanceCriteria": [
    { "id": "AC-1", "text": "expired access token is refreshed once before retry", "behaviorChanging": true, "verification": "test/auth/refresh.test.mjs::refreshes once" }
  ],
  "allowedPaths": ["src/auth/**", "test/auth/**"],
  "forbiddenPaths": ["src/billing/**"],
  "mustNotChange": ["public signature of AuthService.request"]
}
```

- `risk` — `high` | `medium` | `low` (reuse `references/reviewer-selection.md` Risk Matrix).
- `acceptanceCriteria[].behaviorChanging` — `true` ⇒ a `verification` mapping is required (the
  checker flags an empty/missing one; the `gatekeeper` makes the final per-criterion ruling).
- `acceptanceCriteria[].verification` — a test id, `command: …`, or `observed: …` (UI/copy/config
  with no red-green, per `references/verification-gate.md`).
- `allowedPaths` / `forbiddenPaths` — glob lists (`**` crosses segments, `*` is segment-local).
  Empty `allowedPaths` ⇒ no allow-list claim (forbidden is still checked).

## Body (human-readable, follows the user's language)

Requirement · In scope · Out of scope (incl. deferred) · Implied edge checklist · Risk flags ·
Open decisions. On high-risk work these mirror the `references/plan-grounding.md` sharpened
contract — do not duplicate, route the same content here.

## Risk-proportional fill

- **High risk:** full machine block + full body (allowedPaths/forbiddenPaths/mustNotChange populated).
- **Low / medium risk:** reduced subset — Requirement, acceptanceCriteria, and verification only;
  scope globs optional. Do not force a heavy form onto a small change (the usability-over-strictness
  axiom; a false-heavy contract makes the user wait for no gain).

## Lifecycle (read/write split — same rule as design.md / asset generation)

1. **Detect / draft** *(plan, read-only)* — assembled from the plan + `plan-grounding` outputs.
2. **Bless** *(ExitPlanMode)* — approved as part of the plan; no separate approval step.
3. **Write** *(post-approval implementation)* — the `implementer` writes `output/udflow/contract.md`
   so plan mode stays read-only (`hooks/plan-gate.js` still applies).
4. **Consume** — the Review Packet points at it (`references/review-packet.md`); `contract-check.mjs`
   reads the machine block; the `gatekeeper` reads the checker's report.

## Invariants

- **Never a hard dependency.** No contract ⇒ checker makes no claim, gatekeeper uses prose judgment.
- **Gitignored, never committed** into the consuming repo.
- **Language.** Body follows the user's language; identifiers, paths, JSON keys, and the
  machine-checked tokens stay verbatim (`SKILL.md`, Language And Text Integrity).
