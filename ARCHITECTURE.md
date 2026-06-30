# Architecture

A map of how udflow fits together, what is a **stable contract** vs an internal detail,
where the **boundaries with the outside world** are, and the **honest limits** of the
approach. For the consolidation history see [`docs/consolidation.md`](docs/consolidation.md);
for the empirical track record see [`EVIDENCE.md`](EVIDENCE.md).

## The model in one paragraph

udflow is **orchestration owned by a skill, personas owned by agents, guards owned by
hooks.** The `universal-dev-flow` skill (`udflow/skills/universal-dev-flow/SKILL.md`) owns
the *flow*; it loads lazy reference contracts only when a step needs them. The work itself
is checked by policy-constrained **reviewer subagents** plus an **implementer** and a **gatekeeper**.
Five **Node hooks** run in every session as fail-open guards, independent of any udflow task.
The only machine-coupled surface between the prose-driven workflow and the hooks is a small
set of **verbatim literals** (see *Stable contract* below).

## Data flow (one run)

```
task
  → Understand (restate; AskUserQuestion on real ambiguity)
  → Plan mode  (read-only; plan-gate.js denies edits) ── high-risk: planner-creator grounds + sharpens intent
  → YOU APPROVE (plan + acceptance criteria)
  → implementer (smallest safe change; never self-certifies)
  → Verify (build/test/lint/browser; command EXIT STATUS is authority)
  → Review Packet ──► selected reviewers (parallel, each in an ISOLATED context, review-only by policy)
  → gatekeeper (aggregates, re-rates by impact, checks each acceptance criterion)
  → READY / FIX REQUIRED / NOT READY  ──► repair loop (hard cap) ──► back to Verify
  → Final report + sentinels (udflow:verify= / udflow:delivery=)  ──► orchestration-check.js (Stop) reads them
```

Key invariant: **reviewers never share context.** Each gets a focused Review Packet, runs in
its own window, and returns only findings — independence is enforced by the platform (Claude
Code subagent isolation), not just by prose (`references/runtime-policy.md`).

## Components

- **10 agents** (`udflow/agents/*.agent.md`, wired in `plugin.json`): `planner-creator`,
  `implementer`, the 7 reviewers (`spec` / `test` / `code` / `security` / `architecture` /
  `operability` / `ui-ux`), and `gatekeeper`. `security-reviewer` + `gatekeeper` pin `opus`;
  the rest inherit. Reviewers have no editor-specific tool grants, but their grant still includes
  `Bash` (`Read`/`Grep`/`Glob`/`Bash`), so review-only behavior is enforced by reviewer policy and
  context isolation rather than by a hard read-only capability boundary.
- **5 hooks** (`udflow/hooks/*.js`, wired in `hooks.json`) — all fail-open, local-only, no
  network, Node built-ins only: `plan-gate` (PreToolUse), `destructive-guard` (PreToolUse),
  `load-failure-memory` (SessionStart), `compact-fidelity` (SessionStart·compact),
  `orchestration-check` (Stop).
- **13 references** (`udflow/skills/universal-dev-flow/references/*.md`) — lazy-loaded contracts
  for each step (Review Packet, reviewer-common, reviewer-selection, plan-grounding, design-spec,
  runtime-policy, verification-gate, final-report, external-capabilities, deep-mode,
  browser-evidence, app-launch, task-contract). The surface audit (2026-06-28) found these non-duplicative.
- **1 session script** (`udflow/skills/universal-dev-flow/scripts/contract-check.mjs`) — dependency-free, fail-open scope-diff + AC-coverage over `output/udflow/contract.md`; run at verify time, its report read by `gatekeeper`. Not a CC hook, not CI-only.
- **Skills**: `universal-dev-flow` (the workflow) and `run` (app-launch helper).

## Stable contract (what consumers / tooling may depend on)

These are **verbatim, machine-checked, and intended to be stable** — the `5d`/`5f`
`validate-structure.mjs` guards exist to stop a prose edit from silently dropping them:

- **Sentinels**: `udflow:verify=pass|fail|unrun|na` and `udflow:delivery=held|shipped`
  (read by `orchestration-check.js`).
- **Verdict literals**: `READY` / `FIX REQUIRED` / `NOT READY`.
- **Severity literals**: `blocker` / `major` / `minor`.
- **Opt-out keys**: `"udflow": { "planGate" | "destructiveGuard" | "preserveOnCompact": false }`;
  env `UDFLOW_HOOK_DEBUG`, `UDFLOW_ENFORCE_STOP`.
- **Install identity**: plugin name `udflow`; install id `udflow@kktu`.

**Internal (NOT a contract, may change without notice):** agent prose, reference file structure,
the exact reviewer-selection heuristics, report wording. Versioning is pre-1.0 — treat behavior as
*experimental* (see [`EVIDENCE.md`](EVIDENCE.md)); the stable surface above is the part to build on.

## Boundaries & external dependencies

udflow's strictness is mostly *inward* (its own consistency). The **seams with the outside world
are the higher-risk, less-defended edges** — the rest of this section names them honestly.

- **Claude Code (the harness) — the deepest coupling.** udflow depends on CC's plan mode, the
  hook event/output **schema**, subagent isolation, the Workflow capability, and the Stop hook
  surfacing sentinels. **CC is a moving target**: the `compact-fidelity` hook shipped broken for
  three versions because CC's `PreCompact` output schema has no `additionalContext` variant — a
  CC-side contract that udflow assumed and CC rejected. The `5d/5f` guards test udflow's *internal*
  consistency, **not conformance to CC's evolving contracts**; the only real check today is the
  manual `RELEASING.md` smoke. *(Mitigation in progress — a conformance check + a recorded
  "tested-against CC version".)*
- **Optional capabilities** — MCP servers, Codex (cross-model), `ui-ux-pro-max`, Claude in Chrome,
  `/run` — are all **Detect → Use → Else-Disclose** (`references/external-capabilities.md`): used if
  present, the gap disclosed if absent, never a hard dependency. udflow must run standalone.
- **Distribution / supply chain** — hooks **auto-execute in every consumer session**, distributed
  by `git clone` via the marketplace. Release tags can be signed when the owner-side GPG secret is
  configured, and the release job publishes a SHA-256 checksum for the archived shipped `udflow/`
  tree; SLSA/provenance remains future work. A compromised repo or marketplace would run hook code
  in every session. [`SECURITY.md`](SECURITY.md) states the trust model + how to reduce risk (pin a
  tag/SHA; audit the zero-dependency tree; verify tags/checksums when present; run
  `/udflow:doctor`).

## Honest limits

- **Same-model review circularity.** The implementer, the reviewers, and the gatekeeper are all
  the same model family — **one model grading its own homework.** The panel gives multiple *lenses*
  but does not escape the model's *systematic* blind spots (correlated failure): a blind benchmark
  showed reviewers affirmatively declaring buggy code "safe" (a Rust soundness bug, a Tokio
  state-machine case). The **only true independence is cross-model** (the Codex seam), which is
  opt-in and off by default. Treat the panel as recall-via-breadth, not as independent verification.
- **Prompt-driven core, thin behavioral net.** The hooks are unit-tested and the literals are guarded
  (`5d/5f`), but the *review quality* is prompt behavior. Two nets exist, with a gap between them: `5f`
  guards that the literals *exist* (per-commit, in CI), and the committed `eval/` fixture suite measures
  whether the reviewer *behaves* (catches a planted defect, stays precise on a clean control) — but the
  latter costs model tokens, so it is **on-demand, not a per-commit CI gate**. A prompt edit can still
  degrade recall between eval runs; re-run `eval/` after any reviewer/agent-prompt change (`eval/README.md`).
- **No telemetry → no self-operability.** By design udflow reports nothing, so when a hook fails
  open in a user's session the maintainer never learns of it (the `compact-fidelity` bug was
  invisible until a manual smoke). *Mitigated (opt-in): `/udflow:doctor` runs a local, on-demand
  self-check of the hooks + environment and prints a paste-able health report — not telemetry.*
- **Verdict stability — high on clear signals, variable on ambiguity.** The deterministic anchors
  (command exit status, acceptance-criteria-met) pin the verdict regardless of LLM sampling. The judgment
  layer *is* non-deterministic, but a same-input stability run (`eval/`, K=5 runs × 7 clear-cut fixtures,
  2026-06-28, on `claude-opus-4-8`) was **35/35 consistent, 0 flips** — clear-cut defects and clean
  controls reproduce run-to-run. Those fixtures are *deliberately unambiguous*, though; genuinely
  *ambiguous / subtle* cases DO vary (the real-world benchmark saw a reviewer flip on a subtle soundness
  bug). So anchor release confidence on the deterministic checks; treat a single judgment-layer `READY` as
  advisory, not proof — re-running converges on clear cases, less so on borderline ones. *A targeted
  improvement was tested and rejected on the evidence:* an explicit "verdict-stability" gatekeeper clause
  was A/B'd (old vs new rule, K=5 each) on contested-but-green-spine scenarios (a hedged perf finding; a
  non-unanimous nil-deref) — the **existing** gatekeeper was already **5/5 consistent** under both rules
  (`READY`, correctly), so the clause added no measurable stability and was **not shipped**. The stability
  on these cases already comes from the existing *downrank-unconfirmed* + *command-evidence-authority*
  rules, not a special clause — adding redundant prose would be gold-plating.
- **Recall scales with intent, not effort.** With no/weak intent the lone-reviewer floor is low
  (~30% bug-blind); recall rises only when the Review Packet carries contract-level intent. The
  near-zero false-positive rate is the robust strength; exhaustive recall is not the claim.

## Where to start reading

`SKILL.md` (the flow) → `references/reviewer-selection.md` (who runs when) →
`references/review-packet.md` (what reviewers receive) → `agents/gatekeeper.agent.md` (the verdict)
→ `references/final-report.md` (the output contract + sentinels) → `udflow/hooks/*.js` (the guards).
