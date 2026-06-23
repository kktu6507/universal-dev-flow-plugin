---
name: run
description: Manually start the Universal Dev Flow on the current task. Only runs when the user invokes /udflow:run.
disable-model-invocation: true
---

# Run Universal Dev Flow

Start the `universal-dev-flow` workflow for the following task: "$ARGUMENTS"

Proceed through its full lifecycle: requirement understanding, planning in plan mode, plan-gate approval via ExitPlanMode, implementation with the `implementer` subagent, verification, the smallest sufficient review panel, the `gatekeeper` readiness verdict, and the final output contract. Honor the plan gate — enter plan mode first (per the Plan Gate's Detect → Use → Else-Disclose steps) and do not modify files before the plan is approved.

Deep mode has two tiers (see `../universal-dev-flow/references/deep-mode.md`). **Tier 1** — the selected panel and `gatekeeper` run as a deterministic Workflow (same reviewers, same effort, just graph-enforced) — **auto-engages on high-risk / correctness-critical tasks when the Workflow capability is available**; pass `--no-deep` (or `--shallow`) in `$ARGUMENTS` to opt out. **Tier 2** — adversarial verification of blocker/major findings plus maximum reasoning effort — is **explicit opt-in**: request it when `$ARGUMENTS` begins with `--deep`, `deep:`, or `ultra:`. In either tier, if the Workflow capability is unavailable, run the standard prose flow and disclose that the deterministic Workflow was unavailable (the panel still runs, just model-orchestrated). Never hard-depend on it and never error when it is absent.

A downward cost knob complements deep mode: when `$ARGUMENTS` contains the `--lite` token (as a flag, not inside the quoted task text), force the **smallest sufficient panel** (core `spec-reviewer` + `test-reviewer`, plus `code-reviewer` if code changed), skip the other conditional reviewers, and skip deep mode — but keep the one directly-relevant safety reviewer and disclose it when a genuine high-risk signal is present (see `../universal-dev-flow/references/reviewer-selection.md`, *Lite path*). `--lite` and `--deep` are opposite ends of the same cost knob; the unflagged default stays risk-proportional. State the selected panel and cost tier (lite / default / deep) up-front at the plan gate and recap it in the final report.
