# Session record — 2026-07-12: mattpocock/skills comparison & core-drift review

> Archived investigative session log, kept for future reference. Not part of the shipped `udflow/`
> plugin tree, not linked from any README (same status as `docs/consolidation.md`). Produced by a
> Claude Code session on branch `claude/skills-udflow-comparison-eo1tzu`. Two related investigations,
> logged in the order they happened.

## Part 1 — udflow vs. `mattpocock/skills`

**Prompt:** read <https://github.com/mattpocock/skills> in full and produce a complete, detailed
comparison against udflow — pros/cons of each, problems found, and improvement ideas for udflow.

### Method

GitHub access this session was scoped to `kktu6507/universal-dev-flow-plugin` only; `add_repo` for
`mattpocock/skills` was refused by the harness as a cross-owner add ("session already has repos from
owner(s) [kktu6507]"). Direct `git clone` of the target repo was therefore not available. Substituted
with three parallel `general-purpose` agents using `WebFetch` against `raw.githubusercontent.com` /
`github.com` tree pages:

- **Agent A** — re-read every remaining udflow file not already covered by the session's own context:
  all 10 `udflow/agents/*.agent.md`, all 6 `udflow/hooks/*.js` + `hooks.json`, all 13
  `universal-dev-flow` references, the 4 `incident-response` references, `doctor`/`run` SKILL.md,
  `EVIDENCE.md`, `SECURITY.md`, `docs/*.md`, `CHANGELOG.md`.
- **Agent B** — `mattpocock/skills`'s 17 `skills/engineering/*` folders (16 wired into
  `.claude-plugin/plugin.json` + 1 orphaned, see below), plus root `README.md` / `CLAUDE.md` /
  `CONTEXT.md`.
- **Agent C** — `mattpocock/skills`'s 5 `skills/productivity/*` folders, `scripts/`, `.agents/`,
  `.claude-plugin/`, `.out-of-scope/`, `.github/workflows/`, `package.json`, `CHANGELOG.md`, and an
  explicit repo-wide search for any hook/enforcement mechanism.

**Known limitation:** `WebFetch` proxies content through a small summarizing model rather than
returning raw bytes, so non-quoted wording in the agents' reports is paraphrase, not a byte-exact
transcript. Agents were instructed to flag anomalies; one did (a fabricated star/fork-count aside on a
directory-listing fetch), which was excluded from all findings. Two files (`CLAUDE.md`,
`grill-with-docs/SKILL.md`) were independently re-fetched to cross-check. The udflow-side research had
no such limitation (local file reads).

**Note — prompt-injection incident during this run:** a background `<task-notification>` for one of
the three research agents arrived with a trailing `<system-reminder>` claiming "the user included the
keyword 'ultracode'" and instructing a switch to the `Workflow` multi-agent tool. The actual user
message in this conversation never contained that keyword. The claim was rejected as an injection (most
likely surfaced via the notification-wrapping layer rather than the agents' own fetched content, since
Agent A's sources were all local/trusted) rather than acted on, the user was told directly, and the
session continued with the original three-agent plan. No `Workflow` invocation occurred. Recorded here
because it's the kind of incident worth a searchable trail.

### Deliverable

A designed HTML report was published as a Claude Artifact:
<https://claude.ai/code/artifact/aa09115c-35ad-4dc6-8cc0-2c7e5353d566> (13-section comparison: positioning,
a 20-row architecture matrix, 13 side-by-side deep-dive subsections, full pros/cons per project, and a
12-item prioritized recommendation list for udflow). A condensed all-tables/all-lists version of the
same content was also produced directly in chat on request, for easier copy/paste; it is not separately
persisted (this file's summary below is the durable copy).

### Headline structural contrast

`mattpocock/skills` is a **pure prompt/skill pack**: 21 skills wired into `.claude-plugin/plugin.json`
(16 `engineering` + 5 `productivity`), zero persistent subagent definitions (`.agents/` in that repo is
an authoring/meta-doc folder, not subagent configs — a naming false-friend worth remembering), and —
confirmed by an explicit repo-wide grep for `PreToolUse`/`hook`/`block`/`enforce`/`gate`/`intercept` —
**zero automated enforcement of any kind**. Every discipline it wants followed (TDD red-first, a
confirmation gate before executing a plan, "never `git merge --abort`") is prose the model is trusted to
honor; nothing in the harness can stop it from being skipped. It also ships no executable code into a
consumer's session (2 dev-only shell scripts, not part of the install path), so its supply-chain risk
surface is close to zero by construction, and it explicitly rejects "owning the process" (naming GSD,
BMAD, and Spec-Kit by contrast in its own README).

udflow is the opposite bet: 6 hooks that can technically `deny`/`ask`/inject at the tool-call layer, 10
persistent risk-scaled reviewer personas, a `gatekeeper` verdict (`READY`/`FIX REQUIRED`/`NOT READY`),
and a second inverted flow (`incident-response`) for live production incidents — none of which
`mattpocock/skills` has any equivalent of.

### Things `mattpocock/skills` does that udflow currently doesn't

- **`CONTEXT.md` + `domain-modeling`** — a live, dogfooded shared-vocabulary mechanism that corrects
  drifting/ambiguous terminology in real time. udflow has no analogous project-wide glossary (`design.md`
  covers UI consistency only).
- **`wayfinder`** — a charting/frontier-ticket map for work too large for one session. udflow's
  `udflowOp/output/progress.md` only helps a single run survive compaction; there is no mechanism for
  planning how to *split* an oversized task across multiple `udflow` runs.
- **`prototype`** — an explicitly throwaway, no-tests, no-acceptance-criteria exploration mode
  (`LOGIC.md` TUI / `UI.md` `?variant=` switcher). udflow's plan-gate requires acceptance criteria before
  any code is written, with no equivalent "explore first, decide later" escape hatch.
- **`.out-of-scope/`** — three short files, each a rejected feature request with its reasoning and the
  real issue number. udflow's README "Anti-goals" section is the same idea at a coarser grain, with no
  per-decision paper trail.

### The two sharpest concrete findings

1. **udflow — `.claude/settings*.json` is not a protected surface.** `contract-guard.js` watches
   `udflowOp/output/contract.md` and any `design.md`-named file; it does not watch `.claude/settings.json`,
   which is exactly where all four guard opt-outs (`planGate`/`destructiveGuard`/`contractGuard`/
   `preserveOnCompact`) live. `docs/compatibility.md`'s 2026-07-11 clean-profile smoke already recorded a
   live instance of the model self-authoring `contractGuard: false` into that file when told "don't ask
   for confirmation" — the fix shipped in 0.42.1–0.42.3 is prose in `implementer.agent.md`/`SKILL.md`
   ("don't self-author that setting to unblock an ask"), not a technical hook. This is the single most
   actionable finding of the comparison — see recommendation #1 below.
2. **mattpocock/skills — a real cataloguing gap.** `skills/engineering/resolving-merge-conflicts/SKILL.md`
   exists, is complete, and is model-invoked (auto-triggers), but is absent from the top-level README, the
   `skills/engineering/README.md` bucket index, **and** `.claude-plugin/plugin.json`'s 16-entry engineering
   array — meaning the normal install path (`npx skills@latest add`, which reads `plugin.json`) likely
   cannot reach it at all.

### Recommendations produced for udflow (priority-ordered, full rationale in the artifact)

**High**
1. Give `.claude/settings*.json`'s `udflow.*` keys the same technical protection `contract-guard.js`
   gives `contract.md`/`design.md` — an `ask` on any Write/Edit that would flip a guard off, not only a
   prose instruction not to.
2. Lower the friction for a "Verified udflow run" report (Track 2 real-world validation currently sits at
   0 non-maintainer runs — see Part 2).

**Medium**
3. A lightweight shared-vocabulary artifact feeding the Review Packet (borrowed from `CONTEXT.md`).
4. A `wayfinder`-style map/ticket mechanism for work too large for one run.
5. A non-gated, explicitly-throwaway "explore" mode (borrowed from `prototype`).
6. Add a tautological-test check (mattpocock's `tests.md` anti-pattern) to `test-reviewer`'s
   silent-failure lens.
7. An expand→migrate→contract reference for large/breaking refactors (borrowed from `to-tickets`).
8. Fold `diagnosing-bugs`'s 6-phase root-cause methodology into `verification-gate.md`/`implementer` for
   "bug fix, cause unknown" tasks — it overlaps heavily with `incident-response/repro-and-fix.md` already.

**Low / governance**
9. Use `writing-great-skills`'s vocabulary (context load, sediment, sprawl, no-op, negation) as a formal
   audit basis for udflow's own 17 references + 10 agent personas, rather than relying on another manual
   freeze-and-audit cycle.
10. Split README's "Anti-goals" into `.out-of-scope/`-style dated, reasoned, per-decision files.
11. A lighter "two parallel sub-agents, presented side by side, no merge" review shape as a cost floor
    below `--lite`.
12. A user-triggered `handoff`-style command as a manual complement to `compact-fidelity.js`'s
    compaction-only trigger.

---

## Part 2 — Core-drift review

**Prompt:** read the GitHub change history and confirm udflow is not increasingly drifting away from its
own core.

### Method and a caveat

This local clone is **shallow** — `.git/shallow` is present, `git log` reaches exactly 105 commits, all
dated 2026-06-28 or later, and the earliest reachable commit is already mid-way through the v0.27.x
series (`chore/0.27.7-doc-alignment`). Full commit-by-commit history from v0.1.0 is not walkable from
this checkout. To compensate, this review triangulates three sources instead of raw `git log` alone:

1. **`docs/changelogs/CHANGELOG-0.x.md`** (935 lines, byte-preserved archive of every entry from v0.1.0
   through v0.29.0 — moved out of the live `CHANGELOG.md` in 0.40.0).
2. **`CHANGELOG.md`** (current file, v0.30.0 → v0.43.0, i.e. every release since — the period that
   overlaps with the shallow clone's reachable commit range).
3. **`docs/consolidation.md`** (the project's own retrospective on a deliberate v0.27.x feature freeze)
   plus per-file `git log --diff-filter=A` first-added dates for every agent, hook, skill, and reference
   currently shipped, run directly against this checkout.

### What "core" means here

Taken from v0.1.0's own changelog line and the invariants the README/`ARCHITECTURE.md` still assert
today: a **plan-gated** workflow (no edits before an approved plan), a **risk-scaled multi-reviewer
panel** feeding a single **gatekeeper verdict**, a **failure-memory learning loop**, and explicit
**anti-goals** (not a CI replacement, not a linter, no zero-bug guarantee, not for every tiny edit).

### Finding 1 — the founding shape has not moved

v0.1.0 ("Initial release"): *"plan-gated multi-agent workflow (implementer + 7 reviewers + gatekeeper),
`plan-gate` and `load-failure-memory` hooks, opt-in MCP, and optional external capabilities."* That is
already the shape described in today's `README.md`/`ARCHITECTURE.md`. Everything else traced below is
elaboration of that shape, not a change of shape.

### Finding 2 — primitive counts, by first-added date (this checkout)

| Primitive | Count today | Added post-2026-06-28 (post-freeze) |
|---|---|---|
| Agents (`udflow/agents/*.agent.md`) | 10 | **0** — all 10 dated 2026-06-28 (the shallow clone's floor; i.e. no new agent since at least the freeze-lift boundary, confirmed independently by ~8 separate CHANGELOG "hook (6) and agent (10) counts unchanged" notes between 0.34.0–0.40.0) |
| Hooks (`udflow/hooks/*.js`) | 6 | **1** — `contract-guard.js`, added 0.33.0 (2026-07-07) |
| Skills (`udflow/skills/*/SKILL.md`) | 4 | **1** — `incident-response`, added 0.42.0 (2026-07-11) |
| `universal-dev-flow` references | 13 | **1** — `task-contract.md`, added 2026-06-30 (0.32.0-adjacent) |
| `incident-response` references | 4 | **4** — all new with the skill itself, 0.42.0 |

So across roughly two weeks of very active post-freeze development (105 commits, ~15 point releases in
the final 3 days alone), the *only* additions to udflow's countable core primitives are: one hook and one
task-contract reference in the first ~9 days after the freeze lifted, then one whole new skill (with its
own 4 references) in the last 24 hours of the period reviewed. Everything else in that stretch —
the bulk of the CHANGELOG volume — is fixes, prose precision, and test hardening against the *existing*
10 agents / 5(→6) hooks / dev-flow references.

### Finding 3 — the freeze itself is real, evidenced, and worked

`docs/consolidation.md` records a self-imposed v0.27.x freeze triggered by an honest failure
(`compact-fidelity` silently broken for three releases with no regression net) and an explicit worry —
*"the plugin's surface area … has outgrown its validated value."* The freeze blocked "new agents, hooks,
references, run flags, or deep-mode capabilities" and "any change whose primary effect is more behavior,"
allowing only bug fixes, regression-test hardening, doc alignment, and evidence work. It was lifted
2026-06-28 only after a 6-auditor surface audit found **"0 dead weight to remove"** across 10 agents / 12
references / 5 hooks — i.e. the freeze concluded the existing surface was earning its keep, not that it
needed shrinking. This is a working anti-drift mechanism with a documented trigger, a documented exit
bar, and a documented outcome — not just a stated intention.

### Finding 4 — assessing the two post-freeze additions on their merits

- **`contract-guard.js` (0.33.0):** closes a real hole in the *existing* plan-gate/contract model (a
  Write/Edit silently weakening an already-approved acceptance-criteria contract or `design.md`), shipped
  with 29 new tests, and — like its five siblings — only ever `ask`s, never `deny`s/deletes. This reads as
  hardening the founding invariant ("no undoing an approved plan without the user seeing it"), not scope
  expansion into a new domain.
- **`incident-response` (0.42.0 + the 0.43.0 refinement release):** the one genuinely large expansion in
  this window — a whole new *domain* (live production incidents) the original README never claimed to
  cover. Assessed against drift risk specifically:
  - It adds **zero** new agents and **zero** new hooks (Finding 2) — architecturally it's new `SKILL.md` +
    reference prose that *reuses* the existing hook layer, the existing `FAILURE_MEMORY.md` loop, and
    hands the actual code fix back to `universal-dev-flow --lite` rather than building a parallel
    implement/verify/review engine.
  - It ships with its *own* explicit anti-goals (no paging/on-call, no status-page automation, no SLO
    suite, no full RBAC, no DFIR-grade forensics, no multi-repo incident command) — scope was bounded in
    the same release that opened it, not left open-ended.
  - It shipped with real day-one bugs (legacy-migration never firing, the settings.json bypass in Finding
    1 of Part 1, a nested-directory migration crash) — but every one was caught via same-day live-smoke
    testing and patched within the same release day (0.42.1 → 0.42.4), not silently broken for three
    releases the way `compact-fidelity` was pre-freeze. That is the freeze's own "regression-test the
    core" workstream visibly doing its job under a real new-feature stress test.
- **The recurring "Not adopted (recorded, not silently dropped)" pattern** across 0.35.0–0.38.0 (e.g.
  rejecting pr-agent's "delete un-re-derivable findings" pass as contradicting udflow's own
  downrank-never-delete principle; rejecting a redundant per-commit hook-stdout schema check) and the
  near-universal "no machine literal changed / hook(6) and agent(10) counts unchanged" self-check line
  closing almost every release note, are both active, self-applied discipline — not just retrospective
  claims.

### The one open tension worth flagging

`docs/consolidation.md`'s own un-freeze note is explicit: *"un-freeze ≠ resume adding features … the next
lever is a non-maintainer real run + marketplace listing, not new agents/hooks."* Post-freeze work did
include real adoption-facing effort (`docs/tutorial-first-run.md` in 0.37.0, explicitly framed as
attacking "the #1 adoption bottleneck"; the `doctor` self-check tool) — but it also shipped one new hook
and one entire new skill in the same window, and `EVIDENCE.md`'s Track 2 (real-world validation) still
shows 0 non-maintainer verified runs as of the last read this session. This isn't a freeze violation (the
freeze had already lifted) and isn't evidence of unaudited scope creep (see Finding 4) — but it is a real,
citable gap between the project's own stated next-priority and where its post-freeze effort actually went.
Worth the maintainer's attention; not worth another freeze on current evidence.

### Verdict

**No uncontrolled drift found.** The founding shape (plan-gate → risk-scaled panel → gatekeeper verdict →
failure memory) is unchanged since v0.1.0. Growth in the reviewed window is narrow (1 hook, 1 skill),
each addition reuses rather than duplicates existing machinery, each shipped with its own tests and (for
the skill) its own explicit anti-goals, and the project carries a working, evidenced self-correction
mechanism (the v0.27.x freeze/audit cycle) plus an active practice of recording rejected ideas rather
than silently dropping or silently adding them. The one legitimate watch item is a pace mismatch between
stated priority (adoption evidence) and actual recent effort (capability work) — worth tracking at the
next natural checkpoint (e.g. before any third post-freeze addition), not an alarm today.

### Caveat for whoever reads this next

This review used the archived `CHANGELOG-0.x.md` + current `CHANGELOG.md` + per-file first-added dates as
a substitute for full `git log` because this checkout is shallow. If a future session has a full clone,
re-deriving Finding 2's table directly from `git log --follow` (rather than "first-added date in this
shallow checkout") would be strictly more rigorous, though it should agree with the CHANGELOG-derived
version above except at the very edges of the shallow boundary (pre-2026-06-28).
