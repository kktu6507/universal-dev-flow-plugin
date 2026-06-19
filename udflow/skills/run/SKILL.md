---
name: run
description: Manually start the Universal Dev Flow on the current task. Only runs when the user invokes /udflow:run.
disable-model-invocation: true
---

# Run Universal Dev Flow

Start the `universal-dev-flow` workflow for the following task: "$ARGUMENTS"

Proceed through its full lifecycle: requirement understanding, planning in plan mode, plan-gate approval via ExitPlanMode, implementation with the `implementer` subagent, verification, the smallest sufficient review panel, the `gatekeeper` readiness verdict, and the final output contract. Honor the plan gate — enter plan mode first (per the Plan Gate's Detect → Use → Else-Disclose steps) and do not modify files before the plan is approved.

Deep mode (opt-in): if `$ARGUMENTS` begins with `--deep`, `deep:`, or `ultra:` (or a session-level ultracode signal is present), run the review/repair core as a deterministic Workflow per `references/deep-mode.md` when the Workflow capability is available; if it is not available, run the standard prose flow and disclose that deep mode was requested but the Workflow capability was unavailable. Never hard-depend on it and never error when it is absent.
