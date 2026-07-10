# Consolidation freeze (v0.27.x)

> Status: **COMPLETE — freeze LIFTED (2026-06-28).** The consolidation phase achieved its
> goal (harden + align + prove what exists). Un-freeze decision: the four exit criteria are
> accepted as met — the re-test criterion is satisfied by the **provenance stamp + a
> documented re-test attempt** (a publishable rate needs a validated extraction harness,
> deferred as a bounded future project; see the criteria below). **But un-freeze ≠ "resume
> adding features": the standing finding holds — the real bottleneck is adoption + evidence,
> not capability.** The next lever is a **non-maintainer real run** + marketplace listing,
> not new agents/hooks. Treat this doc as the record of what the phase did.

## Why

The plugin's surface area (10 agents, 6 hooks, 13 references, design contract, deep-mode
tiers, MCP seams, browser/app-launch capabilities) has outgrown its **validated** value:
the real-world evidence is still thin (a handful of logged runs, all by the maintainer),
and at least one shipped feature (`compact-fidelity`, 0.27.0–0.27.2) was silently broken
for three releases because the prompt-driven core has no regression net. The
complexity-to-validated-value ratio is the project's top risk. So: stop widening, start
deepening.

## The freeze policy

**Blocked during the freeze**
- New agents, hooks, references, run flags, or deep-mode capabilities.
- Any change whose primary effect is *more behavior*.

**Allowed during the freeze**
- Bug fixes.
- Test / regression hardening.
- Documentation alignment and dead-prose / dead-flag removal (surface shrink).
- Evidence work (re-tests, logging real runs).

A change that adds capability "while we're in here" is exactly what this freeze exists to
stop. When in doubt, it's blocked.

## Workstreams

1. **Shrink surface area.** Audit every agent / hook / reference / flag against evidence of
   use; consolidate overlaps; remove what isn't earning its keep. Align SKILL.md ↔
   references ↔ README ↔ agents so they cannot contradict each other.
2. **Regression-test the core.** The prompt-driven workflow cannot be unit-tested, so test
   the deterministic seams instead, in layers:
   - **L1 (every commit, no model):** reviewer-selection rules; a *prose-invariant* guard
     that fails CI if an agent file loses its load-bearing contract phrases (the fix for
     "prose drift caught by luck"). Extends `validate-structure.mjs`.
   - **L2 (version bumps, cheap model):** a few fixed-diff golden fixtures → run the
     workflow → assert *structure* (right reviewers, verdict literal, sentinel present, no
     crash), not verbatim output.
   - **L3 (periodic / major changes):** the 32-bug curated benchmark subset on the current
     build + model, repo-native intent, **independent** judge → catch/FP vs baseline.
3. **Make value & cost legible.** Keep the 60-second value framing and the public demo
   up front; keep the per-run cost ballparks honest and reconciled with the logged runs;
   default to the leanest useful panel, heavy panels as explicit opt-in.
4. **Thicken the evidence — honestly.** Publish a current-build re-test number (L3); the
   binding goal is **≥1 real run not by the maintainer**. Never add features to compensate
   for thin evidence.

## Exit criteria

**Un-freeze (may resume capability work) when ALL hold:** — **all accepted as met 2026-06-28 (freeze lifted).**
- [x] L1 regression guards are in CI and green (prose drift is caught automatically). — `validate-structure.mjs` **5f contract-invariant guard**: asserts the verbatim machine literals (verdict / severity / sentinel tokens) survive in the files that own them (gatekeeper, reviewer-common, reviewer-selection, SKILL.md).
- [ ] README 60-second value + reconciled cost section shipped.
- [x] Surface-area audit complete (consolidation pass done). — Phase 2 audit (6 auditors): 0 removals, 0 real dedups, doc-alignment applied (0.27.7); behavior-add suggestions parked below.
- [x] A current-build re-test number is published in `EVIDENCE.md`. — **attempted 2026-06-28; NOT publishable.** A bounded fresh blind benchmark ran (current `udflow:code-reviewer`, repo-native intent, independent judge), but ad-hoc web-extraction was too noisy for an honest rate (2/10 defects landed outside the extracted function; the apparent FPs were excerpt artifacts). Cleanly-extracted cases re-confirmed the profile (0 FP on clean code; misses the known security/soundness/omission classes as a lone reviewer). A publishable rate needs the original's **validated** extraction harness (a bounded future project); the provenance stamp handles the staleness meanwhile. **Decision (recorded 2026-07-10):** the provenance stamp + documented re-test attempt was **accepted** as satisfying this criterion — the mechanism is now live (`eval/check-model-provenance.mjs` + `eval/baseline.md`'s provenance lines), and as of 2026-07-10 a full committed-fixture re-run on the current model (`claude-fable-5`) scored 5/5 hit recall + 2/2 clean precision (`eval/baseline.md`). Criterion closed.

**Drop the "experimental" label (a separate, higher bar — adoption-driven, not code):**
- [ ] ≥10 verified real runs, across ≥3 projects, **with ≥1 not by the maintainer**.

## Tooling note (how each item is executed)

- **udflow's own behavioral changes** (surface removal, regression-test code) → run them
  *through udflow* (dogfood; each run is also an evidence data point).
- **Docs / config alignment** → plain edits + the normal PR/CI flow (running udflow's full
  panel on prose would violate its own pragmatism axiom).
- **Audits / benchmark evals** → read-only exploration / a verification workflow with an
  independent judge — not udflow.

## Post-unfreeze backlog (from the Phase 2 surface audit, 2026-06-28)

The Phase 2 audit (6 read-only auditors over 10 agents / 12 references / 5 hooks) found
**0 dead weight to remove** and 17 "keep" — the surface is large but every piece earns its
keep. It produced doc-alignment fixes (applied: SKILL.md Tier-1/Tier-2 + core-reviewer
wording) and the following **behavior-add candidates**, which were BLOCKED by the freeze
(they add new rules, not align docs) and parked here for the un-freeze (per-item status
annotated 2026-07-10):

- gatekeeper: treat a behavior-changing acceptance criterion with **no fail-first→pass test**
  as a blocking omission. — **SHIPPED (0.27.0):** the bidirectional criterion↔test↔change
  traceability rule; live at `udflow/agents/gatekeeper.agent.md:61` ("treat the missing test as a
  **blocking omission** (withhold `READY`)").
- implementer: document **rollback steps** for deploy/schema/config changes. — **STILL OPEN**
  (2026-07-10: no rollback guidance in `udflow/agents/implementer.agent.md`). *(The co-listed "emit test
  output with **parseable test IDs** to feed the regression ratchet" candidate is **superseded by 0.38.0** —
  the ratchet now diffs each runner's NATIVE output via `regression-delta.mjs`; no project-side test-id
  contract, by design.)*
- spec-reviewer: an explicit **exported-API / contract-break** check on changed paths. — **SHIPPED
  (0.34.0, B2):** `udflow/agents/spec-reviewer.agent.md:38` "## Exported-API / contract-break lens".
- planner-creator: flag **vague/unmeasurable acceptance criteria**; surface `design.md`
  presence in the grounding output. — **SHIPPED:** the un-measurable-criteria flag in 0.34.0 (B3;
  `udflow/agents/planner-creator.agent.md:51`); the `design.md`-presence detection shipped with the agent
  itself in 0.25.3 (`planner-creator.agent.md:21`, `:50` — "design.md detection: present / absent /
  not-applicable").
- code-reviewer ↔ architecture-reviewer: make the **local-vs-structural duplication &
  maintainability boundary** explicit in each file. — **SHIPPED (0.34.0, B4):** `## Boundary with other
  reviewers` now in both files (`architecture-reviewer.agent.md:35`, added mirroring
  `code-reviewer.agent.md:52`'s existing section).
- destructive-guard: parenthesized POSIX forms (`(rm -rf …)`) slip the deny-list while the
  PowerShell patterns already match `(` — closing it is a regex (behavior) change. — **DONE:**
  `destructive-guard.js`'s POSIX patterns gained `(` in 0.34.0; the remaining half (the `plan-gate.js`
  `dd of=` sibling anchor, which 0.34.0 left drifted) was closed 2026-07-10 in 0.39.0 (P0-4),
  red→green tested.

**Investigated → kept as-is (NOT duplication; the audit's two "consolidation candidates" did not survive a read of the actual content):**
- `deep-mode.md` ↔ `runtime-policy.md` are **two complementary angles**, not a copy: deep-mode
  describes *what the Workflow graph runs*; runtime-policy's *Deep Mode Enforcement* (~3 stable
  sentences) describes *which thread-hygiene rules the graph enforces*, and already cross-links.
- the per-reference `## Detect → Use → Else-Disclose` sections are the protocol **applied** to a
  specific capability — `browser-evidence` (the detection order), `app-launch` (the probe/launch
  steps), `design-spec` (`design.md` presence) — i.e. capability-specific content, NOT copies of
  the generic protocol (which lives once in `external-capabilities.md`; `plan-grounding.md`
  already uses a one-line pointer). Consolidating would lose point-of-use clarity (usability > DRY).

**Net WS1 finding:** the surface is large but has **no dead weight to remove and no real
redundancy to merge** — every agent / hook / reference earns its keep and is non-duplicative.
