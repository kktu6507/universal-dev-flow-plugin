---
name: universal-dev-flow
description: "Use for non-trivial software work needing implementation, verification, selected review, repair loops, or release-readiness judgment. Triggers: feature work, bug fixes, API or business-logic changes, test changes, behavioral refactors, frontend/UI changes, data-flow changes, production-quality validation. Do not use for simple factual Q&A, pure brainstorming with no implementation intent, or trivial edits with no meaningful verification need."
metadata:
  short-description: Risk-proportional engineering workflow (plan-gated)
---

# Universal Dev Flow

Use this workflow for non-trivial software work. The goal is to understand the requirement, plan the smallest safe change, get the plan approved, implement it, verify it, review it with the right specialists, repair findings, and finish with an evidence-based readiness judgment.

This skill owns orchestration only. Agent personas and review depth live in the configured `agents/` subagents (`planner-creator`, `implementer`, `spec-reviewer`, `test-reviewer`, `code-reviewer`, `security-reviewer`, `architecture-reviewer`, `operability-reviewer`, `ui-ux-reviewer`, `gatekeeper`).

## Scope

Use this skill for:
- feature implementation
- bug fixes with behavioral impact
- API, business-rule, or data-flow changes
- tests or verification updates
- refactors with behavioral impact
- frontend, UI, or user-facing workflow changes
- implementation work that should not be considered complete without verification

Do not use this skill for:
- simple factual answers
- explanations with no implementation
- pure brainstorming
- trivial one-line edits with no meaningful verification need

If the task is borderline, prefer this workflow.

## Reference Loading

Keep `SKILL.md` as the lightweight entry point. Read these references only when needed:

- `references/review-packet.md`: before spawning reviewers or handing work to a reviewer.
- `references/reviewer-common.md`: the shared reviewer contract (severity vocabulary, scope discipline, base output) referenced by every reviewer.
- `references/reviewer-selection.md`: before selecting or re-running a review panel.
- `references/plan-grounding.md`: before presenting the plan on high-risk work (the conditional plan-grounding / intent-sharpening step; its Stage A grounding runs via the `planner-creator` agent, else `Explore`).
- `references/design-spec.md`: before planning or reviewing UI / design-system / interaction work — the `design.md` design contract (detect / consume / draft lifecycle + the three-layer arbitration with `ui-ux-pro-max` and the `ui-ux-reviewer` baseline).
- `references/runtime-policy.md`: before using subagents, waiting on agents, or closing agents.
- `references/verification-gate.md`: before verification or failure-memory updates.
- `references/final-report.md`: at final delivery, for the end-of-run report format (compact by default; `--report full` for the detailed tables).
- `references/external-capabilities.md`: before using any MCP tool, external subagent, or external skill (including `ui-ux-pro-max` for UI work).
- `references/deep-mode.md`: before expressing the panel as a deterministic Workflow — Tier-1 enforcement auto-engages on high-risk work when the Workflow capability is present (opt-out); Tier-2 deeper verification (adversarial checks, max effort) is explicit opt-in.
- `references/browser-evidence.md`: before driving a live browser for UI verification — Detect → Use → Else-Disclose for the Chrome extension; in `--deep` + UI in scope the live drive is required (else a disclosed gap).
- `references/app-launch.md`: before bringing the app up in `--deep` when a needed live process (web app or backend/API) is not already running — delegate to `/run` (auto-launch + disclose + tear down only what udflow started); never auto-launches in standard mode.

Do not deep-chain references. All required workflow references are linked from this file.

## Plan Gate (approve before any change)

Non-trivial work must pass an explicit plan gate before implementation begins. The gate has two layers: udflow drives Claude Code's native plan mode so the planning phase is genuinely read-only, and a plugin PreToolUse hook (`plan-gate.js`) denies Write/Edit/MultiEdit/NotebookEdit while permission mode is `plan`.

1. **Enter plan mode first**, following Detect → Use → Else-Disclose (see `references/external-capabilities.md`, "Native plan mode"):
   - If the session is already in plan mode, proceed.
   - Else if the runtime exposes a plan-mode entry (e.g. EnterPlanMode), enter it, then do requirement understanding and planning read-only.
   - Else (no programmatic switch), proceed read-only by discipline and **disclose** that the hook's read-only enforcement is not active this session; recommend setting a default plan mode in settings for a hard guarantee.
2. Run requirement understanding and planning while in plan mode. The hook enforces read-only for **structured edit tools** (Write/Edit/MultiEdit/NotebookEdit) and blocks **obvious Bash writes** (redirect-to-file, `tee`, `sed -i`, `perl -i`, `truncate`, `dd of=`, `ln`, `git apply`) — but the Bash check is a narrow tripwire, not full shell coverage (interpreter one-liners like `node -e fs.writeFileSync(...)` / `python -c "open(...,'w')"` and other non-obvious writes still slip), so do not use Bash to modify the working tree during planning; use read-only Bash only.
3. Present the plan for approval using **ExitPlanMode**. Only proceed to implementation after the user approves.
4. When a decision has discrete options (e.g. competing designs, ambiguous business behavior, destructive vs. non-destructive paths), surface them with **AskUserQuestion** rather than guessing. On high-risk work, the plan-grounding step (`references/plan-grounding.md`) enumerates these options and the change's implied edge inputs so your approval is informed.
5. Do not spawn `implementer` until the plan is approved and plan mode is exited.

## Core Rules

- Understand before coding.
- Plan before coding, and get the plan approved at the plan gate.
- For non-trivial work, turn the requirement into a short, user-approved **acceptance criteria** checklist at the plan gate, and have `gatekeeper` verify each criterion before `READY` (see `agents/gatekeeper.agent.md`, `references/verification-gate.md`).
- Make the smallest safe change.
- Modify only requested scope unless a broader change is required for correctness, safety, buildability, or testability.
- Verify with commands, browser evidence, text-integrity checks, or explicit blockers as applicable.
- Use the smallest sufficient formal review panel when subagents are authorized and available.
- Keep cost risk-proportional and **user-adjustable**: the panel auto-scales to risk by default; `--lite` forces the smallest panel and skips deep mode (with a safety floor — see `references/reviewer-selection.md`), and `--deep`/`--no-deep` tune deep mode. State the selected panel + cost tier up-front at the plan gate and recap it in the final report.
- Do not spawn non-applicable reviewers merely to satisfy process.
- Do not use full thread history as the default reviewer input.
- Do not present local self-review as formal multi-agent review.
- Do not mark work ready while blocker or unresolved major findings remain.
- For any optional external capability (MCP / external subagent / external skill), detect availability first; if unavailable, do the work locally and disclose the gap. See `references/external-capabilities.md`.
- Record failure memory for any execution abnormality that blocks, disrupts, or forces repair of the originally intended method; follow `references/verification-gate.md` before writing.
- Identify the repository's architecture and primary language/framework first, then implement to that language/framework's official best practices and the repo's existing conventions. When the existing code diverges materially from those best practices, surface it at the plan gate with concrete correction suggestions rather than refactoring beyond the requested scope; broad refactors require explicit user approval and are not bundled into the current task.

## Language And Text Integrity

For human-readable repository content, follow the file's and repository's existing language and the user's language; default to English when none is determinable.

The workflow's own **user-facing communication** — the plan presented at the plan gate, AskUserQuestion prompts, reviewer findings surfaced to the user, and the final summary — **follows the language the user is communicating in** (default to English when undeterminable). This is language-adaptive, not a fixed language: match the user rather than defaulting to English when the user writes in another language.

Preserve technical contracts **verbatim regardless of the surrounding language**: identifiers, API fields, database objects, configuration keys, file names, commands, protocol values, and reviewer/agent names. In particular, **never translate the machine-checked tokens** — the severity labels `blocker` / `major` / `minor`, the verdict `READY` / `FIX REQUIRED` / `NOT READY`, and the sentinel tokens `udflow:delivery=held|shipped` and `udflow:verify=pass|fail|unrun|na` — they are matched literally by tooling (e.g. the Stop orchestration-check hook) and a translation silently breaks the contract.

When touching human-readable text, check for mojibake, replacement characters, broken mixed encodings, unsafe localization of technical contracts, and inconsistent rendering of the target language. Prefer the smallest safe text fix and do not force broad encoding conversion unless the root cause and compatibility risk are understood.

## Lifecycle

1. Requirement understanding
   - Restate the requirement.
   - Identify the repository's overall architecture and primary language/framework, plus existing conventions (analyzers, formatter/lint config, project style).
   - Identify inputs, outputs, business rules, constraints, edge cases, dependencies, affected users, systems, and runtime paths.
   - State assumptions and ambiguity.
   - Stop for user input (AskUserQuestion) when ambiguity materially affects business behavior, contracts, destructive operations, security posture, or user-visible UX flow.

2. Planning (plan mode)
   - For high-risk or correctness-critical work (per the `references/reviewer-selection.md` Risk Matrix), first run the conditional **plan-grounding & intent-sharpening** step (`references/plan-grounding.md`): ground the plan in the code's reality (a read-only exploration pass, Detect → Use → Else-Disclose), then sharpen the requirement into a contract-level intent plus an implied edge-input checklist. Route the sharpened contract into the Review Packet's intent, the edge checklist into the verification gate, and any product ambiguity into AskUserQuestion at the gate. It assists the approval decision; it never replaces it. Skip it for low/medium-risk work.
   - Define affected modules or files, implementation approach, data/control-flow impact, risks, verification commands, expected tests, and rollout or rollback concerns when relevant.
   - Plan to the project language/framework's official best practices and the repo's conventions. If the existing code diverges materially from those best practices, state the gap here and propose concrete corrections; do not silently refactor beyond the requested scope.
   - For UI work, include target screens, states, responsive/accessibility concerns, and browser verification target or blocker. Small UI tweaks keep the soft consult: if the `ui-ux-pro-max` skill is available, consult it for design decisions (styles, palettes, font pairings, UX guidelines) during planning; if unavailable, fall back to internal `ui-ux-reviewer` guidance and note that ui-ux-pro-max was not used. **When the scope is design-generation / a design system** (new screens or net-new component families, visual redesign, design tokens/system, theming, brand — a token-reusing one-off component stays a small tweak), consulting an available `ui-ux-pro-max` is **required** (when present; if absent, disclose the fallback to `ui-ux-reviewer` — never a hard dependency) — record its style/palette/font/UX decisions in the plan. Reuse the existing visual system (tokens/palette/type scale) for **visual consistency**, or justify a better alternative in the plan. When a `design.md` design contract exists (`references/design-spec.md`), ground the UI plan against it — it is the consistency contract `ui-ux-reviewer` will judge against; when it is absent and the scope warrants one, `planner-creator` **recommends** establishing one from the existing UI (detection is read-only here; the draft is blessed at ExitPlanMode). **Asset generation** (file-writing logo/mockup/banner) **and writing/updating `design.md`** are deferred to post-approval implementation so plan mode stays read-only (see `references/external-capabilities.md`, `references/design-spec.md`).
   - Before non-trivial implementation, consult failure memory — project-specific `ai/FAILURE_MEMORY.md` when it exists, otherwise `~/.claude/FAILURE_MEMORY.md`. The SessionStart digest is only an index; here, retrieve the full entries relevant to this task's affected files, area, language, and error type (filter by `Tags`) and read them. Before any failure-memory write, reread the global `~/.claude/FAILURE_MEMORY.md` and merge with a similar existing entry when one exists.
   - **Define acceptance criteria.** For non-trivial work, turn the requirement into a short, numbered checklist of observable / verifiable outcomes that define done, and present it **as part of the plan** for user approval at ExitPlanMode (no separate approval step). On high-risk work these *are* the plan-grounding **sharpened contract** (do not duplicate it); skip them for trivial work. Route any ambiguous criterion through AskUserQuestion, carry the approved list into the Review Packet, and the `gatekeeper` checks each one at the gate (step 7). The deepest release signal is not "no bugs" — it is "did what you asked, and confirmed it."
   - **State the cost up-front.** In the plan, name the selected review panel and its cost tier (lite / default / deep) so the user sees roughly what the run will cost and can adjust it (`--lite` / `--deep` / `--no-deep`) before approving (see `references/reviewer-selection.md`, *Lite path*).
   - Present the plan via ExitPlanMode **in the user's language** (keep identifiers, file names, commands, and verdict tokens verbatim — see Language And Text Integrity) and wait for approval (Plan Gate).

3. Implementation
   - Use the `implementer` subagent (only after plan approval).
   - Keep the diff scoped and traceable.
   - Follow repository conventions first, then the project language/framework's official best practices.
   - For UI/frontend work, prefer `ui-ux-pro-max` design tokens/guidance when available before writing UI; otherwise implement for usability and maintainability and disclose the fallback.
   - When the approved plan establishes or changes a design contract, the `implementer` **writes / updates `design.md`** post-approval — the blessed bootstrap draft (extracted from the existing UI), or a design-system change recorded in the same PR (`references/design-spec.md`).
   - Surface newly discovered risk immediately.

4. Verification
   - Run applicable build, test, lint, typecheck, migration, integration, browser, or repo-specific checks.
   - For local browser-visible UI changes, use Claude in Chrome / in-app browser or an accepted fallback and record the target, scenario, observed result, tool used, screenshot need, and focus/hover/keyboard/clipboard behavior when relevant. In `--deep` + UI in scope, driving the live browser per `references/browser-evidence.md` is a required verification step (Detect → Use → Else-Disclose; absence is a disclosed gap); standard mode stays best-effort.
   - In `--deep`, when a needed live process (web app or backend/API) is not already running, bring it up per `references/app-launch.md` before verifying — delegate to the built-in `/run` skill (auto-launch + disclose), then tear down only what udflow started. Standard mode never auto-launches; an unreachable app stays a documented gap. An app that cannot be launched is a disclosed gap the `gatekeeper` weighs, never an error.
   - For human-readable content, run text-integrity checks.
   - If a command or check cannot run, state the exact blocker and remaining uncertainty.

5. Review panel selection
   - Always include `spec-reviewer` and `test-reviewer` for non-trivial formal review.
   - Add conditional reviewers only when their risk criteria apply.
   - The panel size is risk-proportional and user-adjustable: `--lite` forces the smallest sufficient panel (core + `code-reviewer` when code changed) and skips deep mode, except it keeps a directly-relevant safety reviewer when a high-risk signal is present and discloses it (see `references/reviewer-selection.md`, *Lite path*).
   - Prepare a Review Packet before reviewer handoff, and fill the "Shared reviewer contract" block into each handoff verbatim (a spawned reviewer cannot reach `references/reviewer-common.md` by path).
   - Read `references/review-packet.md` and `references/reviewer-selection.md`.

6. Parallel review
   - Run selected reviewers in parallel when possible and authorized.
   - If runtime or policy prevents subagent use, state that limitation and continue with local evidence without calling it formal multi-agent review.
   - **Prefer deterministic enforcement on high-risk work.** When the task is high-risk / correctness-critical and the Workflow capability is available, default to expressing the selected panel and the gatekeeper barrier as a deterministic Workflow (deep-mode **Tier 1**) so the panel actually runs and gatekeeper only runs after reviewers. Tier 1 is **opt-out** (`--no-deep`), uses the same reviewers at the same reasoning effort, and so does not change cost materially. The costlier checks (adversarial verification, maximum effort) are **Tier 2** and stay explicit opt-in (`--deep`). The reviewer *selection* is unchanged in either tier (still the smallest sufficient set). Without the Workflow capability, the panel still runs but is model-orchestrated rather than graph-enforced — disclose that. See `references/deep-mode.md`.
   - Read `references/runtime-policy.md` before spawning agents.

7. Conflict resolution and gatekeeper
   - Compare reviewer findings by evidence, not tone.
   - `architecture-reviewer` owns boundaries, layering, dependency direction, and structural placement.
   - `code-reviewer` owns local implementation quality, simplicity, framework usage, and efficiency on changed paths.
   - Run `gatekeeper` only after selected reviewers finish.
   - `gatekeeper` decides `READY`, `FIX REQUIRED`, or `NOT READY` and whether failure memory is required.
   - `gatekeeper` **checks each user-approved acceptance criterion** (met / unmet / deferred); an `unmet`, non-deferred criterion blocks `READY` (see `agents/gatekeeper.agent.md`).

8. Auto-fix loop
   - If verdict is `FIX REQUIRED` or `NOT READY`, fix concrete findings, rerun relevant verification (only the failing / changed-path checks, not the full green suite — see `references/verification-gate.md`, *Repair-iteration scoping*; the full required set is re-run once for the final pre-`READY` confirmation so `udflow:verify=` still rests on a real full-suite green), rerun only affected reviewers, rerun `gatekeeper`, and repeat until `READY` or clearly blocked.
   - If a fix introduces a new risk category, add the corresponding conditional reviewer.
   - **Validate each blocker, then tag each fix (repair-loop precision).** Before a `blocker` drives `FIX REQUIRED`, the `gatekeeper` confirms it with one independent check (reproduce the input, run the failing test, grep-confirm the claimed-absent thing) — an unconfirmed blocker is downranked like `[unverified]` and does not gate `READY` (see `agents/gatekeeper.agent.md`, *Auto-fix loop rules*). Tag each applied fix with a **Fix-Class** — **Safe** / **Extended-Safe** (test-backed, auto-applied) or **Residual** (breaks a public API or has no test → **never auto-applied**; surface it for the user and hold delivery). This is the lean always-on minimum; deep-mode Tier 2 adds the fuller adversarial verification on top (`references/deep-mode.md`).
   - **Iteration cap:** if the same blocker category persists across two consecutive iterations, produce a Stuck Summary and stop. This is a hard cap, not "loop until solved" — surface the blocker for the user rather than spending unbounded iterations/tokens.
   - **Long-run progress ledger (optional).** On a long multi-iteration run, keep a short ledger at `output/udflow/progress.md` — one line per completed step keyed by the commit (short SHA) it produced (e.g. `<sha> · <step> · verify=<pass|fail> · <verdict-so-far>`). After a context compaction, re-read it (and `git log`) before redoing work, so finished, committed steps are not repeated. It is a kept run artifact under `output/udflow/`, gitignored, never committed into a distributed repo (`references/verification-gate.md`, Artifact Hygiene). The ledger is the persistence layer; the `compact-fidelity.js` SessionStart hook (matcher `compact`) additionally re-injects, right after a compaction, a reminder to re-establish udflow's in-context constructs (verdicts, acceptance-criteria state, `[unverified]` flags, Run Card numbers, subagent findings, unanswered requirements) in the fresh context. (It was relocated from `PreCompact` in 0.27.3 — Claude Code's hook-output schema rejects a `PreCompact` hook's injected `additionalContext`, so the nudge had to move to the supported SessionStart/`compact` path.) On a harness that doesn't surface SessionStart context (e.g. Copilot CLI), re-read the ledger manually after a compaction (the same manual fallback failure memory uses there).
   - **Cost control:** deep-mode **Tier 1** (deterministic panel / gatekeeper enforcement) adds no reasoning-effort increase and may auto-engage on high-risk work, so it needs no confirmation. But before escalating to a **deeper / opus-heavy pass** — deep-mode **Tier 2** (adversarial verification + maximum effort), or any opus-heavy escalation — confirm with the user. To avoid unexpected spend, the workflow may be run manual-only (invoke `/udflow:run` explicitly and do not auto-engage) — see the cost note in the README. Before declaring stuck, only if the user explicitly enabled Codex for this task and it is available, you may escalate one independent diagnosis; otherwise (not enabled or unavailable) continue locally and disclose. Codex is off by default; a missing opt-in or absent capability must not error. See `references/external-capabilities.md`.

9. Final delivery
   - Follow the final output contract in `references/final-report.md`: a single end-of-run report that is **compact by default** — `Summary` one-liner, a `Verification` block (a Checks table + acceptance-criteria line + a one-line cost summary of new tokens + tier), a `Findings` severity table, the `Final Verdict`, and the machine-readable `udflow:verify=` / `udflow:delivery=` footer **last** — so the user sees what happened, what it achieved, and what it cost without reading the whole transcript. `--report full` opts into the detailed tables (Outcome, per-agent activity, Files Changed, the full token & cost table with the share bar, plus Assumptions / Missing Tests / Risks / Failure Memory). Present it with tables and light visual cues (status glyphs, the inline token-share bar in `--report full`) per the contract's Presentation rules; keep the machine-checked literals as plain words so the Stop hook still reads them, and keep the sentinel footer as the last lines in both renderings.
   - Leave the working tree clean: remove temporary verification scaffolding and do not commit the workflow's runtime output (e.g. `FAILURE_MEMORY.md`) into a distributed tool/plugin repo — see Artifact Hygiene in `references/verification-gate.md`.
   - The compact default covers what changed (Summary), verification, findings, and the final verdict; Files Changed, assumptions, missing tests, risks, and the failure-memory decision surface under `--report full`. A required-but-unavailable external capability is still disclosed in the compact report as a verification gap (see `references/final-report.md`), and the failure-memory *write* itself still happens regardless of report mode (per `references/verification-gate.md`).
   - **End the final summary with a machine-readable delivery line** so the Stop hook reads your decision deterministically instead of inferring it from prose (this prevents false "verdict not honored" reminders, in any language): `udflow:delivery=held` when you are **not** delivering because a `FIX REQUIRED` / `NOT READY` verdict stands (or you are otherwise stopping/holding), or `udflow:delivery=shipped` when the verdict is `READY` and you are delivering. Keep the literal `udflow:delivery=` token verbatim (it is machine-checked, like the verdict tokens).
   - **Also emit the verification rollup** `udflow:verify=pass|fail|unrun|na` on its own line, adjacent to the delivery line, so the Stop hook can deterministically check that a red or unrun required check gated delivery rather than inferring it from prose: `pass` only when every required check (build/test/typecheck on behavior-changing code) actually ran and exited zero, `fail` when a required check exited non-zero, `unrun` when a required check was claimed but never actually ran, `na` when no command checks were required. The command exit status is authority over reviewer prose — a `fail` / `unrun` required check is incompatible with `READY` and shipping. Keep the literal `udflow:verify=` token and its values verbatim (machine-checked, like the verdict tokens).
