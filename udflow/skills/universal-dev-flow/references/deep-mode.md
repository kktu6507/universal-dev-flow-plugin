---
name: deep-mode
description: Optional deeper review/repair that runs the selected panel as a deterministic Workflow when an ultracode/Workflow capability is detected or explicitly opted in.
---

# Deep Mode (ultracode / Workflow leverage)

Deep mode makes the review/repair core **deterministic** instead of model-followed prose: the selected reviewer panel, the gatekeeper barrier, and the repair loop are expressed as a Workflow so they actually run. It is **optional and off by default**, follows udflow's Detect → Use → Else-Disclose protocol, and never becomes a hard dependency. A skill cannot enable ultracode (it is a harness mode); deep mode only detects the signal and adapts.

Deep mode raises **depth, not breadth.** The reviewer *selection* is unchanged — still the smallest sufficient set from `reviewer-selection.md`. Deep mode does not add reviewers; it only makes the already-selected panel run deterministically, adds adversarial verification of blocker/major findings, and raises reasoning effort at the highest-leverage points. This keeps it consistent with udflow's risk-proportional ethos.

## Detect

Three independent signals (none a hard dependency):

1. A session-level ultracode signal (e.g. a SessionStart `additionalContext` / system-reminder indicating ultracode is on).
2. An explicit per-task opt-in: `/udflow:run` arguments beginning with `--deep`, `deep:`, or `ultra:`.
3. The Workflow capability actually exists in this runtime.

Priority: signals 1–2 set the *intent*; signal 3 decides whether it can really run. Intent without capability → fall back and disclose.

## Use (when opted in AND the Workflow capability is available)

Express the core as a deterministic Workflow:

1. **Panel as a `parallel` barrier** — the selected reviewers each run as a Workflow agent that returns a schema-validated finding set. Reuse the existing output contract in `reviewer-common.md`; do not invent a new schema. Each agent still receives only its own focused Review Packet, preserving reviewer independence.
2. **Gatekeeper as a `pipeline` barrier** — gatekeeper runs only after the panel barrier completes (encoding the `runtime-policy.md` rule as control flow, not prose).
3. **Adversarial verification** — for each blocker/major finding, fan out 2–3 independent verifiers and keep only findings supported by a majority.
4. **Loop-until-dry repair** — implement → verify → review repeats until a round produces no new blocker/major (still subject to the Auto-fix loop's hard iteration cap and Stuck Summary).
5. **Effort** — run `gatekeeper` and `security-reviewer` at maximum reasoning effort; low-risk leaf reviewers use the default.

## Else (not opted in, or capability unavailable)

Run exactly the standard prose flow. If deep mode was requested but the Workflow capability is unavailable, add one line of disclosure: deep mode was requested but the Workflow capability was unavailable, so the standard flow ran and the panel was model-orchestrated rather than deterministically enforced. Never error on absence.

## Invariants in both modes

- The plan gate and failure-memory hooks are active in both modes; deep mode changes neither hook and the hooks must never depend on deep mode.
- Plan approval (ExitPlanMode) stays human-in-the-loop; the Workflow does not take it over.
- The conditional plan-grounding step (`references/plan-grounding.md`) runs the same in both modes; in deep mode its Stage A grounding may run as a read-only Workflow agent node, but it never changes reviewer selection.
- Roles, severity vocabulary (`blocker`/`major`/`minor`), and the verdict set (`READY`/`FIX REQUIRED`/`NOT READY`) are unchanged, so a deep run and a standard run are directly comparable — only enforcement, verification depth, and effort differ.
