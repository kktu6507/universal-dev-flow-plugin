---
name: run
description: Manually start the Universal Dev Flow on the current task. Only runs when the user invokes /udflow:run.
disable-model-invocation: true
---

# Run Universal Dev Flow

Start the `universal-dev-flow` workflow for the following task: "$ARGUMENTS"

Proceed through its full lifecycle: requirement understanding, planning in plan mode, plan-gate approval via ExitPlanMode, implementation with the `implementer` subagent, verification, the smallest sufficient review panel, the `gatekeeper` readiness verdict, and the final output contract. Honor the plan gate — do not modify files before the plan is approved.
