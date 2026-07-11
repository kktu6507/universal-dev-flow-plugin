# Compatibility and conformance

udflow targets Claude Code first. Its behavior depends on Claude Code plan mode, hook event/output schemas, subagent isolation, Workflow capability, and Stop-hook surfacing of sentinels. Those contracts can move, so compatibility is recorded explicitly rather than assumed.

## Tested-against matrix

| udflow version | Runtime | Version / date | Node | OS | Plan gate | Stop sentinel | Subagents | Workflow | Status |
|---|---|---|---|---|---|---|---|---|---|
| 0.27.x | Claude Code | compaction-fidelity `SessionStart`·`compact` live-smoked on 2026-06-28; full checklist required per release | 20.x in CI | manual smoke environment | manual smoke required | manual smoke required | manual smoke required | manual smoke required when available | supported |
| 0.27.x | GitHub Copilot CLI | 1.0.65 live load verification | 20.x in CI | local live verification | no-op, runtime lacks permission-mode hook field | no-op, Stop output not surfaced | loads | no Workflow capability | supported with notes |
| 0.40.0 | Claude Code | 2.1.206 — **full clean-profile smoke 2026-07-11** (headless `claude -p`; see note below) | 24.16.0 local / 20.x CI | Windows 11 | deny + allow both live-verified | orchestration advisory live-fired on a READY assertion; silent on honest runs (debug-log-verified) | skill engaged organically; `udflow:implementer` spawned | not exercised in this smoke | supported |
| 0.38.0 installed / 0.39.0 pre-release tree | Claude Code | 2.1.206 — in-session partial verification 2026-07-10 (see note below; NOT a clean-profile smoke) | 24.16.0 local / 20.x CI | Windows 11 | live-fired: `~/.claude/plans/` write-exemption exercised; deny path not triggered live (suite-covered) | not exercised live (suite-covered) | exercised in-session (P0 dogfood panel + gatekeeper) | exercised in-session (deterministic panel graph) | superseded by the 0.40.0 clean-profile smoke (2026-07-11) |
| current branch | CI structural checks | every PR / push | 20.x | Ubuntu / Windows / macOS | hook tests | hook tests | manifest checks | not exercised | regression net |

**2026-07-10 row — exact scope of the claim (in-session partial verification, NOT a clean-profile smoke).**
Observed in a real working session running the **installed 0.38.0 plugin cache** while the 0.39.0 tree was
verified by the harness suite (`npm test`): (a) the `universal-dev-flow` skill engaged for a real task (the
smoke checklist's step-8 equivalent); (b) `plan-gate.js` demonstrably loaded and executed during a real
plan-mode phase — its `~/.claude/plans/` write-exemption path was exercised live (the plan-file write was
allowed while plan mode was active); the plan-mode **deny** path was not triggered live this session (no
working-tree write was attempted in plan mode) and is covered behaviorally by the test suite; (c) no
failure-memory file exists and correctly **no digest appeared** (the expected no-op); (d) the
destructive-guard / contract-guard / compact-fidelity / orchestration-check advisories were **not exercised
live** this session — their behavioral coverage is the green `npm test` suite. The same session's P0 dogfood
run exercised the reviewer/gatekeeper subagents and the deterministic Workflow panel graph (`EVIDENCE.md`,
Live run 12). The clean-profile install smoke was **NOT performed** that day; it was completed on
**2026-07-11** (see the 0.40.0 row above and the note below).

**2026-07-11 — full clean-profile smoke (0.40.0 @ `8490840`, Claude Code 2.1.206, Windows 11, Node
24.16.0).** Run in a throwaway `CLAUDE_CONFIG_DIR` profile (no settings, no other plugins; only OAuth
credentials copied in), driven headless (`claude -p`) from a scratch project. Every checklist surface
was exercised live: marketplace-add → install → enable landed 0.40.0; failure-memory digest injected
(title quoted verbatim) and silent when absent; plan-gate deny + non-plan allow; destructive-guard
intercepted `git reset --hard` (command did not run) and passed `git status`; contract-guard
three-state (removal asked naming the entry / append allowed / `contractGuard:false` opt-out honored);
orchestration-check advisory branch on an asserted READY with no panel and silence on 16 honest runs;
a **real auto-compaction** with zero `Hook JSON output validation failed`, the
`[compact-fidelity] emitted preservation block` debug line, and the preservation block quoted verbatim
from post-compaction context; and organic `universal-dev-flow` skill engagement spawning
`udflow:implementer`. Scope limits, stated honestly: interactive UI rendering of `ask` prompts and the
Stop advisory `systemMessage` is not observable headless (hook decisions were verified via
`UDFLOW_HOOK_DEBUG` log + stream events); `preserveOnCompact:false` was not live-run (suite-covered);
`/compact` as a slash command does not execute under `-p`, so the checklist's auto-compaction
alternative was used. `/udflow:doctor` loaded and ran headless, but the model (haiku) ignored the
skill's stop-if-no-env-var rule, filesystem-hunted, and diagnosed a stale Copilot-installed copy —
a wrong-root false "DEGRADED" report noted as a doctor-skill hardening follow-up, not a 0.40.0 defect
(contract-guard's presence and firing were proven directly in the contract-guard step).

`EVIDENCE.md`, `RELEASING.md`, and the README are the human-facing source for live-smoke details. `.github/scripts/validate-structure.mjs` and `npm test` are the automated regression net.

## Claude-Code-only behavior

These features degrade outside Claude Code:

- `plan-gate.js` needs a permission-mode field in `PreToolUse` input.
- `compact-fidelity.js` relies on `SessionStart` injected output being surfaced.
- `orchestration-check.js` relies on Stop-hook output being surfaced.
- Deep-mode Workflow requires a runtime Workflow capability.

The plugin should fail open and disclose gaps rather than erroring when a capability is unavailable.

## Conformance smoke checklist

Run this in a clean Claude Code profile before or right after a release that touches hooks, `hooks.json`, skills, agents, manifests, or hook-output contracts:

1. Install, enable, and reload the plugin from the marketplace.
2. Confirm `load-failure-memory.js` injects a nonce-fenced digest when `udflowOp/memory/FAILURE_MEMORY.md` exists (a legacy pre-0.42.0 `ai/FAILURE_MEMORY.md` also injects, as a read-only fallback) and stays silent when no file exists.
3. Enter plan mode and confirm `plan-gate.js` denies an edit but allows the same edit outside plan mode.
4. Confirm `destructive-guard.js` asks before a narrow destructive command such as `git reset --hard`.
5. End a session that claims `READY` without a reviewer panel and confirm `orchestration-check.js` advises.
6. Trigger `/compact` and confirm `compact-fidelity.js` emits the `SessionStart`·`compact` preservation block without `Hook JSON output validation failed`.
7. Run `/udflow:doctor` and save the health summary if any hook is degraded.
8. Run `/udflow:run <non-trivial task>` and confirm the universal-dev-flow skill engages.
9. Run `/udflow:incident-response prepare` in a scratch project and confirm it produces `udflowOp/ops/OPS_PROFILE.md` and reports gaps; then confirm a plain-language production-incident message engages the incident-response skill with a triage decision card.

Record the runtime version, Node version, OS, and any degraded behavior in the release PR or `EVIDENCE.md`.

After a real compatibility run, open a [Verified udflow run issue](https://github.com/kktu6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml) and paste the `### Live run` block so the public evidence log can be updated without changing the issue template.

## Conformance smoke files

Markdown smoke scenarios can live under `test/conformance/` when a release needs a manual checklist artifact rather than automated tests:

- `plan-gate-smoke.md`
- `stop-sentinel-smoke.md`
- `destructive-guard-smoke.md`

These files are optional documentation. The authoritative automated checks remain `node .github/scripts/validate-structure.mjs` and `npm test`.
