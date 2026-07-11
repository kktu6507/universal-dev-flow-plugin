# Changelog

All notable changes to this plugin are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.43.0] - 2026-07-11

### Added
- **`incident-response` reference refinements** (external-practice gap-analysis; `udflow/skills/incident-response/references/`):
  - Data-repair **completeness check** — reconcile touched-vs-affected record counts, or re-run the corruption query to zero, proving the repair reached every row (distinct from proving the script correct on a copy).
  - **Postmortem review gate** in the closure checklist — a human approves the gate-gap analysis and the proposed FAILURE_MEMORY entry, and action items get named owners + a tracked home, before the incident closes.
  - `Mitigated:` / `Resolved:` **journal timestamps** so MTTM/MTTR read from the header instead of timeline prose.
  - **Named redaction tooling** for the sanitize-before-write pass — gitleaks / detect-secrets for secrets, Microsoft Presidio for PII (guidance, not a hard dependency; per-axis fallback to a built-in pattern list).
  - `dry-run-verified: <date>` **ops-profile trust tier** between `verified:` and `UNVERIFIED`, earned by a clean non-mutating preview, with full restore-drills / game-days named as the human-scheduled ceiling.
  - **Breach-readiness** ops-profile field — a secure evidence store + an out-of-band comms channel (NIST Preparation).
  - Prepare-mode's repo scan now **delegates to a read-only subagent** in parallel with the human decision cards.

## [0.42.4] - 2026-07-11

### Fixed
- Closes the same class of gap the 0.42.3 fix addressed (found by `spec-reviewer` during that fix's own
  review, in two sibling one-time-migration procedures it left untouched): both
  `references/verification-gate.md`'s Artifact Hygiene migration (legacy `output/udflow/` →
  `udflowOp/output/`) and `references/design-spec.md`'s `design.md` migration (legacy root → `udflowOp/design/`)
  stated an assumed default ("normally untracked" / "the normal case for this committed artifact") standing
  in for a check, with no instruction for how to actually determine it. Both now require the same explicit,
  runnable `git ls-files --error-unmatch <path>` check (exit 0 = tracked) ahead of the git-mv-vs-copy branch
  — per-path for the multi-file `output/udflow/` tree, single-file for `design.md` — and state plainly that
  manual copy+delete is never an acceptable substitute for a path/file git tracks, since it silently discards
  commit history.
- Fixes a reproduced `major`-severity bug in the same `output/udflow/` → `udflowOp/output/` migration
  (`references/verification-gate.md`): the destination directory was created once, flat, upfront for the
  whole legacy tree, so a path nested under a subdirectory (e.g. `output/udflow/evidence/shot.png`,
  `output/udflow/review/diff.patch`) failed its move with `fatal: renaming '...' failed: No such file or
  directory` — neither `git mv` nor a plain copy creates missing intermediate directories, and one
  top-level directory made upfront leaves a nested destination with nowhere to land. Each path's own
  destination directory (with any missing intermediates) is now created immediately before that path's
  move, not once upfront for the whole tree, so a migration carrying over nested prior-run content (e.g.
  `output/udflow/evidence/`, `output/udflow/review/`) no longer aborts partway through.
  `references/design-spec.md`'s single-file `design.md` migration gets the same-shaped fix: the
  destination directory is now created as an unconditional step ahead of the tracked/untracked branch
  instead of only alongside the `git mv` (tracked) branch as before, so the untracked copy path is no
  longer left assuming a directory that was never guaranteed to exist.

## [0.42.3] - 2026-07-11

### Fixed
- Failure-memory migration: `references/verification-gate.md`'s migration step 2 now requires an explicit,
  runnable git-tracked check (`git ls-files --error-unmatch <legacy path>`, exit 0 = tracked) ahead of the
  git-mv-vs-copy branch instead of assuming which branch applies, and states plainly that manual copy+delete
  is never an acceptable substitute for a tracked file since it silently discards commit history — closes a
  gap found in a 2026-07-11 live re-smoke of the 0.42.2 fix, where migration fired correctly but a
  git-tracked legacy file was moved via copy+delete (an unstaged deletion plus an untracked new file) instead
  of `git mv`, losing file history even though the file's content and location ended up correct.

## [0.42.2] - 2026-07-11

### Fixed
- Failure-memory migration: `references/verification-gate.md`'s Failure Memory section now states the
  one-time legacy `ai/FAILURE_MEMORY.md` → `udflowOp/memory/FAILURE_MEMORY.md` migration as a distinct,
  numbered, unconditional action — separate from whether a new entry is written — after a 2026-07-11 live
  smoke found the migration never fired in practice (3/3 runs); `SKILL.md`'s Lifecycle step 2 bullet is
  tightened the same way. `review-packet.md` and `gatekeeper.agent.md` add a migration-status field/check
  as an independent, checkable backstop (auto-remediate: an unmigrated legacy consult is named as a
  required post-verdict `git mv` for the main thread; it never blocks `READY`).
- `contract-guard.js` / `destructive-guard.js`: the ASK message now explicitly tells an AI agent that
  self-authoring the `contractGuard: false` / `destructiveGuard: false` project opt-out in reaction to
  that same ask — even when task text says to skip confirmation — is not a valid response, and that the
  opt-out is a standing human decision, not a same-turn reaction; `implementer.agent.md` and `SKILL.md`
  gain the matching instructional rule (reactive-only — a freestanding human instruction is unaffected).
  Closes a 2026-07-11 live smoke finding where a model self-authored a new `.claude/settings.json` with
  `contractGuard: false` to defeat its own block under "do not ask for confirmation" task phrasing.

## [0.42.1] - 2026-07-11

### Fixed
- `contract-guard.js`: a fresh write to one watched contract path is now diffed against a populated
  contract at the OTHER watched path (sibling baseline, both directions — `udflowOp/output/contract.md`
  ↔ legacy `output/udflow/contract.md`), closing the migration-window gap where a weakened rewrite at the
  still-empty path silently shadowed the recorded contract; the ask names the lost entries and the sibling
  baseline path; true first writes (no populated sibling) and unparseable siblings stay allowed (fail-open).
- `compact-fidelity.js`: the post-compaction re-read nudge now also names any open incident journal
  (`udflowOp/incidents/INCIDENT-*.md`), not just the dev-flow progress ledger, so a mid-incident compaction
  doesn't lose the pointer back to it.

## [0.42.0] - 2026-07-11

### Added
- **`incident-response` skill** (`udflow/skills/incident-response/`, SKILL.md + 4 stage references): the dev
  flow inverted for live production incidents — mitigate first via reversible actions (one decision card per
  turn; destructive/prod-affecting actions always stop at a card), diagnose by fault domain, red→green
  reproduction gated by a production-data safety gate (minimal extraction, PII/secret masking before AI
  context, synthetic fallback, ephemeral deletion at closure), the formal fix handed to
  `universal-dev-flow --lite`, a committed incident-journal audit trail
  (`udflowOp/incidents/INCIDENT-<date>-<slug>.md`, sanitize-before-write), and a postmortem gate-gap
  analysis feeding FAILURE_MEMORY. Peacetime `prepare` mode builds `udflowOp/ops/OPS_PROFILE.md` (access
  inventory marked agent-runnable vs human-only; rollback + migration-compatibility intel; per-entry
  `verified:`/`UNVERIFIED` trust markers). Manual: `/udflow:incident-response` (+ `prepare`).
- README (EN / zh-TW / ja): new "What's inside" 4-skill overview with the `udflowOp/` project-layout block,
  and "The incident flow (incident-response)" walkthrough; intro repositioned to the two flows with the
  closed learning loop (incident postmortem → FAILURE_MEMORY → next dev-flow planning reads it).

### Changed
- **Consuming-project layout: everything udflow keeps in a target repo now lives under `udflowOp/`** —
  `memory/FAILURE_MEMORY.md`, `design/design.md`, `ops/OPS_PROFILE.md`, `incidents/INCIDENT-*.md`
  (committed) and `output/` (run scratch, self-gitignored). Legacy `ai/FAILURE_MEMORY.md` / repo-root
  `design.md` / `output/udflow/` are read as fallback, then one-time auto-migrated by the **workflow main
  thread** (moved fully to the new path, legacy file deleted, disclosed in-run); hooks never write/move/
  delete — read-only fallback only.
- `load-failure-memory.js`: 3-tier read priority — `udflowOp/memory/FAILURE_MEMORY.md` → legacy
  `ai/FAILURE_MEMORY.md` → global `~/.claude/FAILURE_MEMORY.md`.
- `contract-guard.js`: watches both contract paths — `udflowOp/output/contract.md` + legacy
  `output/udflow/contract.md`.
- Scripts' default discovery follows the new layout (`contract-check.mjs`, `failure-retrieve.mjs`, each with
  legacy fallback); `doctor` probe path updated.
- validate-structure §6b guard (repo hygiene): this repo's `.gitignore` must carry a literal `/udflowOp/`
  line, and tracked `udflowOp/` content fails CI — dogfood-run residue can never be committed here.

## [0.41.0] - 2026-07-11

### Added
- Intent-assumption register in the planning layer (prose-only): every behavior choice the requirement underdetermines must now either become an `AskUserQuestion` option at the plan gate (product-impacting — asking helps the user sharpen intent) or an explicit contract assumption entry (chosen default + rejected alternative + basis); silent resolution is a planning defect; ALL product-impacting ambiguities are asked (across multiple question rounds when they exceed one dialog — never volume-demoted), and the register records the non-product-impacting interpretive defaults. Touches `plan-grounding.md` (Stage B item 4 + routing row), `planner-creator` (deliverable 5 + direction contrast with code-side unknowns), `task-contract.md` (body field + optional machine-block `assumptions` array — `contract-check.mjs`/`contract-guard.js` unchanged, fail-open), and the Review Packet's Assumptions field (first-class review target). Rides the existing high-risk plan-grounding gate; low/medium tiers gain no ceremony.

## [0.40.1] - 2026-07-11

### Fixed
- `doctor` skill: when no plugin-root env var (`$CLAUDE_PLUGIN_ROOT` / `$COPILOT_PLUGIN_ROOT` /
  `$PLUGIN_ROOT`) is set, the skill now explicitly forbids falling back to a filesystem search for
  udflow installations — a searched-up copy (old marketplace cache, another runtime's install) is not
  the running copy, and a live 2026-07-11 clean-profile run diagnosed a stale `~/.copilot` copy as
  "DEGRADED / contract-guard missing" (a false report). The health report now always names which env
  var supplied the plugin root, or `none — not diagnosable from here`.

## [0.40.0] - 2026-07-10

Audit remediation P2 — structural optimization: prompt-layer dedup + hooks-infra sync + test/changelog structure.

### Changed
- Prompt-layer dedup to canonical + one-line pointers (full copies kept only where runtime isolation requires):
  `SKILL.md` −5.9 KB, `gatekeeper.agent.md` −2.2 KB; the 27 unreachable `reviewer-common.md` runtime pointers in
  agent bodies now cite the Review Packet's "Shared reviewer contract" block they actually receive.
- MCP capability detection keys on tool suffixes (e.g. a server exposing `preview_start`), not stale server-name
  literals; dead-after-install relative links replaced with absolute GitHub URLs.
- Test suite split from the 3,219-line `test/hooks.test.mjs` monolith into per-subject files —
  `plan-gate-guards` / `orchestration-check` / `session-memory-hooks` / `release-publisher` /
  `validate-structure` + shared `test/helpers.mjs` (bodies byte-preserved; the per-hook opt-out suites and the
  non-exemptible trio are table-driven); the CI zero-tests guard names the new file set. Full-suite wall time
  ~42 s → ~18 s locally via per-file parallelism; totals 365 → 367, fail 0.
- CHANGELOG: pre-0.30 entries (0.0.x–0.29.0, 931 lines) archived byte-preserved to
  `docs/changelogs/CHANGELOG-0.x.md` with a tail link; the missing `## [0.33.0]` heading restored (its entries
  were orphaned under the 0.34.0 heading, which had already caused a version misattribution); `RELEASING.md`
  records the grouped-bullets-not-narratives entry format going forward.

### Fixed
- `orchestration-check.js` stdin reader gains the 5 MB `MAX_STDIN` cap the other five hooks already had.
- `compact-fidelity.js` settings-flag reader takes the event object, matching its three siblings; hook-infra
  documented copies (debug / stdin reader / settings reader / neutralize / quote-stripper / dd-regex) carry
  sync-comments naming every sibling.
- Dead exports/vestiges removed: `contract-check.mjs` `_internal`, `publish-release.mjs`
  `classifyReleaseViewFailure` export keyword, `orchestration-check.js` `finalReportsBlock` vestige.

### Added
- `examples/FAILURE_MEMORY.sample.md` linked from `verification-gate.md` and the three READMEs' docs lists.
- `package.json` `engines` field (`node >=20`) and a test-scope-accurate description.

## [0.39.0] - 2026-07-10

Audit remediation P0 — the six functional defects from the 2026-07-10 zero-based audit, closed with red→green
evidence where behavior changed.

### Fixed
- **Plan-gate `dd` anchor drift** (`hooks/plan-gate.js`): the `dd … of=` tripwire's anchor class now includes
  `(` (subshell start), so `(dd if=… of=out.bin)` is denied in plan mode — the pattern is again character-identical
  with `hooks/destructive-guard.js`'s, as that file's "reused verbatim" comment claims. Red→green tested; the
  `of=/dev/null` exemption still allows inside a subshell; the other 7 tripwire patterns keep their anchors by design.
- **Shared reviewer contract block completed** (`references/review-packet.md`): the full Non-mutating rule, the
  "materially underspecified — say so explicitly" rule, and one-line `blocker` / `major` / `minor` definitions from
  canonical `reviewer-common.md` now travel in the verbatim block each reviewer receives (previously only the
  Non-mutating rule's "filter noise, not signal" tail survived, and the severity labels were named but never
  defined); the severity-grading tail aligned to the canonical "(regardless of how ordinary the code looks)".
- **Gatekeeper single-writer contradiction**: `agents/gatekeeper.agent.md` told an agent with no Write/Edit tools
  to "perform the one serialized write yourself" — resolved by the executor clarification under Changed.
- **`${CLAUDE_PLUGIN_ROOT}` prefix** on the `failure-retrieve.mjs` / `failure-consolidate.mjs` invocations in
  `references/verification-gate.md` and `SKILL.md` (a bare `node skills/…` path only resolves from the plugin root).
- **CI syntax-check covered only 5 of 6 hooks**: `node --check udflow/hooks/contract-guard.js` added to the
  validate workflow.
- **Artifact hygiene**: `output/udflow/.gitignore` (`*` + `!.gitignore`) is now committed, as
  `references/task-contract.md` documents (ends the perpetual untracked-`output/` status noise), and the test
  suite's `copyRepoTree` no longer copies untracked `output/` / `.claude/` run scratch into its temp trees.

### Changed
- **Single-writer executor clarified across all owners** (`agents/gatekeeper.agent.md`,
  `agents/implementer.agent.md`, `SKILL.md`, `references/verification-gate.md`, `references/runtime-policy.md`,
  `scripts/failure-consolidate.mjs` incl. its runtime advisory line): the `gatekeeper` **decides** and proposes the
  exact final failure-memory entry; the **main thread** performs the one serialized write verbatim after the
  verdict. The single-writer invariant — exactly one serialized write, after the verdict — is unchanged.
- **zizmor ignore is now file-level** (`.github/zizmor.yml`): the `adhoc-packages` exception for the best-effort
  official-CLI install was pinned to `validate.yml:67`, which silently un-suppresses on any line shift above it;
  switched to file-level `validate.yml` (pulled forward from the audit's P2-23).

## [0.38.0] - 2026-07-10

Phase 4 of the improvement roadmap — **regression make-real**: the `gatekeeper`'s regression ratchet
(`baseline_passing ∩ now_failing`) becomes OPERATIVE via an Agentless "run the tests twice" path, WITHOUT
reintroducing the deliberately-rejected universal parseable-test-id contract. The orchestrator does the
running; the new script is a pure differ over two captured test outputs, gated to `--deep` / high-risk runs.

### Added
- **`scripts/regression-delta.mjs` — a fifth session script (a pure differ).** Reads two saved test-runner
  captures and emits the newly-failing tests (`baseline_passing ∩ now_failing`) or an explicit `no-claim` line.
  Dependency-free (Node built-ins only), with **no `child_process`** — the orchestrator runs the tests, not
  this script — and it **always exits 0** (fail-open, never throws to its caller). It parses each runner's
  EXISTING native output — node --test (spec + TAP), jest, pytest `-v`, go test `-v` — and **mandates no
  project-side test-id schema** (the anti-rejected-contract boundary, stated verbatim in the header).
  Faithful-or-null: an opaque, partial, or cross-runner input returns no-claim rather than a half-parse;
  ReDoS-safe line-by-line scanning. Peer-tested with real runner fixtures (`test/regression-delta.test.mjs`).
- **A gated baseline capture in the flow (`SKILL.md`).** On `--deep` / high-risk runs only, the orchestrator
  captures the pre-change test output before the `implementer` (`output/udflow/baseline-before.txt`, run in the
  foreground so it releases its output pipe) and the post-change output at verify, runs the differ, and carries
  the report into the Review Packet for the `gatekeeper`. Standard / low-risk runs are unchanged.

### Changed
- **The regression-ratchet prose is rewired from "deliberately not built" → OPERATIVE** across its three owners
  (`agents/gatekeeper.agent.md`, `references/verification-gate.md`, `references/reviewer-selection.md`): the
  ratchet now fires whenever a baseline was captured, **names** the newly-failing tests, and the `gatekeeper`
  **classifies each green→red transition against the acceptance criteria + `mustNotChange`** (an intended
  change vs a genuine regression) and **surfaces every one — never auto-suppressing** a green→red as "intended"
  without stating the criterion that licenses it (G2). The fail-open, command-exit-status-authority, and
  strictly-additive framing are intact.
- `ARCHITECTURE.md` — "4 session scripts" → "5", with the new differ enumerated.

### Fixed (panel + repair, same release)
- The MAX-POWER `--deep` panel (spec/test/code/architecture, all opus, + adversarial verification) and the
  `gatekeeper` reproduced a narrow **name-collision false positive** in `regression-delta.mjs`: a leaf test name
  present as BOTH a pass and a fail in the baseline capture (the same `test("…")` name in two files, one green
  one red) was flagged as a regression when it stayed failed. It could never cause a wrong `READY` (the differ
  fires only when the post-change suite is already red, so exit-status authority already blocks) — but it could
  cry wolf, which the pragmatism axiom (a false positive is worse than a documented miss) forbids. Fixed by
  excluding baseline-ambiguous names before intersecting (`before.passed − before.failed`), turning the false
  positive into a safe fail-open miss; a no-op on every existing fixture, test-pinned.
- `docs/consolidation.md` — annotated the parked "emit test output with parseable test IDs" backlog candidate as
  **superseded by 0.38.0** (the ratchet now diffs each runner's native output; no project-side test-id contract) —
  the exact approach this phase deliberately rejects. Doc-consistency raised unanimously by the panel.

### Notes
- **No machine literal changed.** No sentinel (`udflow:verify=` / `udflow:delivery=` / `udflow:panel=`), verdict
  (`READY` / `FIX REQUIRED` / `NOT READY`), or severity token was added, moved, or renamed; `validate-structure.mjs`
  (§5f and the rest) stays green. This is a make-real of existing prose behind a new pure differ, not a new contract.

## [0.37.0] - 2026-07-10

Phase 5 of the improvement roadmap — **grounding + docs polish**: two cheap, in-ethos wins from the
2026-07-10 external research. Attack the #1 quality weakness (omission/intent) at PLAN time with a lean grep
coupling-scan, and attack the #1 adoption bottleneck with the learning-oriented tutorial udflow's docs lacked.
Dogfooded through the standard panel (spec/test/architecture) to a gatekeeper `READY`; the panel convergently
flagged a real parity-guard gap (below).

### Added
- **A lean coupling scan at plan-time grounding** (`agents/planner-creator.agent.md`,
  `references/plan-grounding.md`) — `aider`'s repo-map idea minus tree-sitter. For the key symbols a change
  touches, the planner `Grep`s their callers/callees to surface coupled code the change may ALSO need to touch
  (a top omission source) and cites the coupling sites. Bounded + advisory by construction: **a lean `Grep`,
  not a call-graph**, and it *surfaces* coupling for the plan — it does **not** assert an omission finding (the
  reviewers/gatekeeper still do that), so it **cannot cry wolf**. Targets omission — the #1 real miss category —
  at its cheapest fix point, before any code is written.
- **`docs/tutorial-first-run.md` — a learning-oriented "first run" tutorial** (the missing Diátaxis quadrant;
  the docs already had how-to + reference + explanation). A linear ~10-minute walkthrough: install → enable →
  hand udflow one small concrete task → the restated requirement → the plan gate (approve) → the implementer's
  smallest change → verification (exit status is authority) → the risk-selected reviewers → the `gatekeeper`
  verdict + the `udflow:verify=` / `udflow:delivery=` / `udflow:panel=` footer (machine literals verbatim).
  Linked from all three READMEs (a near-Quick-start pointer + the Docs section) at README parity.

### Changed
- `.github/scripts/validate-structure.mjs` — added `docs/tutorial-first-run.md` to the `requiredReadmeLinks`
  parity allowlist, so the new tutorial link is machine-enforced across all three READMEs (en / zh-TW / ja) —
  the same guarantee its sibling core docs already had. A ratified, CI-only guard-strengthening the review
  panel convergently requested (guard the class, not just the instance).

### Not adopted (recorded, not silently dropped)
- **A per-commit hook-stdout JSON-schema check** — DROPPED as redundant. `test/hooks.test.mjs` already asserts
  every hook's output shape behaviorally (15× `hookSpecificOutput` + orchestration `systemMessage` / `decision`),
  and `validate-structure` §5g statically guards hook-output/event conformance. A schema layer would duplicate
  existing coverage for no net gain — the same "don't add redundant machinery" call as the Phase-3 drop.

### Notes
- The standard panel (spec/test/architecture) convergently flagged that the new tutorial link was mirrored in
  all three READMEs by hand but **not** registered in the parity guard — closed by the `requiredReadmeLinks`
  addition above. The §7 tutorial panel description was also sharpened to name the code-review pass. Both
  closed in the same release.
- **No machine literal changed**; hook (6) and agent (10) counts unchanged. Version bumped 0.36.0 → 0.37.0
  (planner grounding gains a user-perceptible step) across `plugin.json`, `package.json`, `marketplace.json`.
  `node --test` (347: 343 pass / 0 fail / 4 platform-skipped) + `validate-structure` green.

## [0.36.0] - 2026-07-10

Phase 2 of the improvement roadmap: a **Review-Packet diff packer** — the highest-value borrow from the
2026-07-10 external research (qodo-ai/pr-agent's deterministic PR-compression, minus its weight). Dogfooded
through udflow to a gatekeeper `READY`; the review panel caught a real content-loss bug (below).

### Added
- **`scripts/pack-review-diff.mjs` — a new (4th) zero-dependency session script** that reorders + line-numbers
  + down-ranks a unified `git diff` for reviewer focus. The orchestrator pipes the base diff through it
  (`git diff <base> -- <paths> | node …/pack-review-diff.mjs`) to produce the Review Packet's "Changed diff":
  files grouped by language and ordered by substantive change size, hunks rendered with new-side line numbers
  (so reviewers cite `file:line`), deletion-only / whitespace-only hunks ranked last. A pure stdin→stdout
  transform, Node built-ins only.
  - **The "reorder, never hide" guardrail (G1) is the whole point:** the packer only reorders/annotates — it
    **never silently drops content**. Deletion & whitespace hunks are ranked last, never removed; an optional
    `--max-lines` trim is DISCLOSED (a `⚠️` trailer naming the trimmed files + a regenerate pointer), never
    silent; and it **fails open to the raw diff** on any unparseable input, so it is never worse than today.
    The existing "a filtered diff is a starting point, not a cap" reviewer contract is preserved.
- `test/pack-review-diff.test.mjs` — 17 tests pinning G1 (deletion/whitespace retained-but-last, default
  preserves every changed line, disclosed-trim, fail-open passthrough), ranking, line-numbering, binary/rename
  provenance, CRLF, and the **faithful-or-raw-passthrough** invariant across every region a `+`/`-` line can appear.

### Fixed (panel + repair, same release)
- The standard panel (spec/test/code/architecture) found — and reproduced — a **G1 violation**: a `git diff`
  whose hunk carried an unparseable line (e.g. a blank context line whose trailing space was trimmed → a bare
  empty line mid-hunk) silently dropped the rest of the hunk instead of passing through. Fixed by making
  `parseDiff` reconstruct **faithfully or fall back to raw** — a bare `""` is treated as a blank context line,
  and any `+`/`-` line that can't be placed in a hunk (mid-hunk **or in the preamble before the first
  `diff --git`**) forces raw passthrough. Also fixed: rename/binary provenance was dropped on a rename-with-edit,
  a pure rename was labelled with the old path, and a spaced filename kept git's trailing tab. All test-pinned.

### Notes
- **No machine literal changed**; hook (6) and agent (10) counts unchanged. `ARCHITECTURE.md` updated 3 → 4
  session scripts. Version bumped 0.35.0 → 0.36.0 (a new capability exists) across `plugin.json`,
  `package.json`, `marketplace.json`. `node --test` (347: 343 pass / 0 fail / 4 platform-skipped) +
  `validate-structure` green. The packer is off the enforced path — a reviewer keeps full Read/Grep freedom.

## [0.35.0] - 2026-07-10

Reviewer/gatekeeper **reliability sharpening** — apply the evidence-backed de-correlation levers from a
2026-07-10 external-research pass (CRITIC / Kamoi: LLM self-correction works only with *external* feedback;
Huang 2024: unaided self-review degrades; the multi-agent-debate martingale). The theme validates udflow's
existing instincts, so these **sharpen** existing rules rather than add mass. Dogfooded through
`udflow --deep` to a gatekeeper `READY`; the deep panel caught a real drift bug (below).

### Changed — review-agent prose
- **Tool-grounded blocker gate** (`agents/gatekeeper.agent.md`, *Validate each BLOCKER*): the confirming
  "one independent check" must now yield an **observable artifact** — a command's exit status, a now-red
  test, or a quoted line from the actual file — **not a re-reasoned restatement** of the finding (a same-model
  re-read that only re-asserts the claim shares its blind spot). A blocker supported only by "the model read
  it again and still thinks so" stays **downranked — never deleted: it is still surfaced to you**; a blocker
  whose named input was actually run and observed to fail is fully confirmed and unaffected.
- **Chain-of-Verification "factored" option** (`references/deep-mode.md`, Tier-2 adversarial verification):
  prefer rephrasing a finding into a neutral, context-free sub-question answered **blind to the claim** ("in
  `<file>`, what happens when `<condition>`?") and comparing the independent answer — a verifier that never
  sees the claim can't inherit its framing. Complements (does not replace) the majority refutation verifiers;
  falls back to direct refutation when a finding can't be cleanly factored.
- **Rubric-anchored severity** (`references/reviewer-common.md` + its verbatim mirror in
  `references/review-packet.md`): grade a finding's severity against the **written requirement / acceptance
  criteria / `design.md` (or the implied contract) as the fixed reference**, not against how plausible it
  merely *looks* — while a finding that violates a stated criterion, or that demonstrably crashes / leaks /
  corrupts / returns a wrong result, stays `major` regardless.

### Added — CI guard (root-cause, found by the `--deep` panel)
- The deep-mode architecture reviewer found (and adversarial verification confirmed) that the severity-rubric
  rule had been added to `reviewer-common.md` (the source of truth) but **not mirrored** into the
  `review-packet.md` "Shared reviewer contract" block — **the only copy a spawned reviewer actually
  receives** — so it was inert for its audience and the two files silently diverged. Fixed the instance (the
  mirror) **and the class:** `.github/scripts/validate-structure.mjs` 5k `RIGOR_ANCHORS` now pins
  `"as the fixed reference"`, so CI machine-enforces the reviewer-common ↔ review-packet dual write for this
  rule going forward (same "guard load-bearing prose, don't rely on luck" pattern as the 0.34.0 Fix-Class guard).

### Notes
- **Considered and deliberately NOT adopted:** the pr-agent "self-reflection *elimination* pass" (re-score all
  findings, DELETE the un-re-derivable ones) — redundant with udflow's existing downrank-unverified +
  per-blocker validation, and a *deletion* pass contradicts udflow's "downrank, never delete; human-in-the-loop"
  core. C1 captures the useful core (make weak blockers prove themselves) without a suppression mechanism.
- **No machine literal changed** — verdicts / severities / sentinels / opt-out keys / Fix-Class phrases are
  byte-identical; the 5k change only *adds* an anchor. Hook (6) and agent (10) counts unchanged. Version bumped
  0.34.0 → 0.35.0 across `plugin.json`, `package.json`, `marketplace.json` (reviewer/gatekeeper behavior is
  user-perceptible). `node --test` (330: 326 pass / 0 fail / 4 platform-skipped) + `validate-structure` green.

## [0.34.0] - 2026-07-09

An audit-driven hardening release in three batches: five verified defect fixes + one ReDoS bound in the
deterministic (non-LLM) layer, four precision-first review-workflow refinements, and repository infrastructure.
The first two batches were produced **through udflow itself** (dogfood), each ending in a `gatekeeper` `READY`;
the second batch ran `--deep` (adversarial verification). A git-history check (`git log --all --pickaxe`) first
confirmed every item was an original gap, not a previously-removed feature.

### Fixed — deterministic layer (batch 1)
- **`failure-retrieve.mjs` `tokenize()` now retrieves pure-CJK task signatures.** `split(/[^a-z0-9]+/)` dropped
  every non-ASCII character, so a purely Chinese/Japanese task signature tokenized to nothing and `retrieve()`
  returned `[]` — the zh-TW/ja audience the project ships docs for got zero failure-memory retrieval. The ASCII
  path is unchanged; a CJK **character-bigram** pass is added (Hiragana/Katakana, CJK Ext-A, CJK Unified),
  symmetric across query and entry. Pure-ASCII input is byte-identical, so the `eval/failure-memory/` oracle is untouched.
- **`contract-guard.js` now matches `design.md` case-insensitively.** `isDesignMdPath` compared the basename
  case-sensitively while its sibling `isTaskContractPath` already lowercased — so on a case-insensitive filesystem
  (Windows / macOS, 2 of 3 CI OSes) a write to `Design.md` was the same physical file yet slipped the guard.
- **`contract-guard.js` now protects an acceptance criterion that lacks an `id`.** id-less ACs (a documented,
  reachable case — `contract-check.mjs` already handles them via an `(unnamed)` fallback) were silently skipped;
  they are now matched by exact `text`, so a removed id-less criterion is detected. Reorder does not false-ask.
- **`destructive-guard.js` catches parenthesized POSIX subshell forms.** Every POSIX pattern anchored on
  `(?:^|[\s;&|])`, excluding `(`; the PowerShell patterns already included it. `(rm -rf /x)` and `$(rm -rf /x)`
  now ask. Character-class addition only — no over-broadening (verified: benign parens like `(cd build && make)`,
  `arr=(rm cp mv)`, `$((count*2))` still allow).
- **`destructive-guard.js` ReDoS bound (found by the `--deep` security review).** The two separated-flag `rm`
  patterns held two unbounded `[^;&|]*` runs each, giving O(n²) backtracking on input with many whitespace/newline-
  separated `rm ` anchors — a synchronous regex the 5s stdin watchdog cannot interrupt (`"rm f\n".repeat(40000)` =
  200KB → ~7000ms). Bounded to `[^;&|]{0,200}` (→ ~30ms, linear); every realistic separated `rm -r … -f` still asks,
  a >200-char inter-flag gap is a disclosed accepted miss. Pre-existing (not introduced by the subshell fix), fixed while on the line.
- **Ledger-key consistency (`failure-retrieve.mjs` ↔ `failure-consolidate.mjs`).** The writer truncated the ledger
  key to 300 chars while the reader looked it up by the full title, so a >300-char-title entry retrieved recently
  was falsely reported as an expire candidate — the module violating its own "never make an unjustified staleness
  claim" promise. A shared exported `ledgerKey()` now keys both sides.

### Added — CI guard (batch 1)
- **`validate-structure.mjs` now guards the Fix-Class safety literals.** `CONTRACT_INVARIANTS` for
  `gatekeeper.agent.md` gains `"Extended-Safe"`, `"Residual"`, `"never auto-applied"` (each verified unique to the
  Fix-Class section; bare `"Safe"` deliberately not guarded), with a negative test — so a prose edit can no longer
  silently drop the "a Residual fix is never auto-applied" rule. Batch 1 added ~15 hook/script tests (`node --test`: 330 tests, 326 pass, 0 fail, 4 platform-skipped).

### Changed — review workflow (batch 2, `--deep`)
- **B3 — un-measurable acceptance criteria are flagged.** `plan-grounding.md` Stage B contract-readiness now checks
  **per-criterion** measurability (an observable pass/fail — a test, command, or observable state), not just
  "at least one observable AC"; `planner-creator.agent.md` surfaces a `not measurable` flag anchored to the criterion.
  Soft, high-risk-only, precision-guarded (never a terse-but-checkable criterion). Targets the documented #1 weakness (intent).
- **B4 — `architecture-reviewer.agent.md` gains a `## Boundary with other reviewers` section**, mirroring
  `code-reviewer`'s, making the local-quality-(code-reviewer)-vs-structural-(architecture-reviewer) line explicit.
- **B2 — `spec-reviewer.agent.md` gains a bounded `## Exported-API / contract-break lens`** (removed/renamed exported
  symbol, changed signature/return/error contract, changed serialization/wire/config shape, breaking input/output
  narrowing), gated on public-surface changes and grep-verify-before-asserting — a sharpening of its existing
  "API or behavior contracts must match the intended design" standard, modeled on `code-reviewer`'s silent-failure lens.
- **C2 — the regression ratchet is honestly downgraded.** `gatekeeper.agent.md` and `verification-gate.md` now state
  the ratchet needs a **captured pre-change baseline** (a recorded set of pre-change passing test ids), which udflow
  does not mandate as a separate step — so absent that capture it makes **no** claim and is an opportunistic,
  best-effort safety layer, not an always-on gate (the command exit status stays the authority). This also honestly
  documents the deliberately-unbuilt half (parseable test-id emission + baseline capture). Consistent with
  `reviewer-selection.md`'s "full-suite green already implies the ratchet" (that rests on green-suite ⇒ ∅ intersection).

### Repository infrastructure (not part of the shipped `udflow/` tree)
- `.github/PULL_REQUEST_TEMPLATE.md`; `.github/ISSUE_TEMPLATE/config.yml` (`blank_issues_enabled: false` + a private
  security-report contact link) with a new `.github/ISSUE_TEMPLATE/bug-report.yml` so the tracker stays curated
  without blocking defect reports; `.github/dependabot.yml` scanning the `github-actions` ecosystem only (the repo
  has zero runtime/dev dependencies — the only version surface is the pinned Action SHAs).

### Notes
- **No existing machine literal changed** — verdicts / severities / sentinels / opt-out keys are byte-identical; the
  A6 change only *adds* three Fix-Class phrases to the CI guard. Hook count (6) and agent count (10) are unchanged, so
  README ×3 / `ARCHITECTURE.md` / `SECURITY.md` need no surface edit. Version bumped 0.33.0 → 0.34.0 across
  `plugin.json`, `package.json`, and `marketplace.json` (metadata + plugin entry). `node --test` (330) +
  `validate-structure` green.

## [0.33.0] - 2026-07-07

### Added
- **`contract-guard.js` — a sixth PreToolUse hook guarding the two contract-level artifacts a run depends on against silent weakening by a Write/Edit/MultiEdit.** Content-based, NOT actor-based: like every other hook, it only ever sees `tool_name`/`tool_input`/`cwd`/`permission_mode`, never who or what agent is driving the call — this is stated precisely in the hook's own header comment. For `output/udflow/contract.md` (root-anchored path): a strict field-level diff over the first ` ```json ` block — every old `acceptanceCriteria[]` id must keep its `text`/`behaviorChanging`/`verification`, every old `mustNotChange[]` / `allowedPaths[]` / `forbiddenPaths[]` entry must survive verbatim, and `risk` may never be silently downgraded (an increase, e.g. medium→high, is never flagged). The file's first-ever write (no prior file, or a prior file with no parseable JSON block) is **always** allowed unconditionally — the sanctioned case `references/task-contract.md` documents. For `design.md` (matched by basename anywhere, not root-anchored, since `design-spec.md` sanctions a non-root path): a narrow whole-section-deletion tripwire — only a `## ` heading present in the old content with zero exact-normalized match in the new content is flagged; a normal section-body edit, expansion, or reduction to an "n/a" placeholder is never flagged. Any finding emits `permissionDecision: "ask"` (never `"deny"`) naming exactly what would be lost; a project may opt out via `"udflow": { "contractGuard": false }` in `.claude/settings.json` (local overrides project, same fail-safe precedence as `destructiveGuard`/`planGate`). Deliberately does not parse Bash-based rewrites of either file (an accepted, documented gap, same posture as `destructive-guard.js`'s own misses) and adds no external dependency. `references/task-contract.md` and `references/design-spec.md` each gain a one-sentence cross-reference.
- 29 new hook tests (`test/hooks.test.mjs`) covering: contract.md pure-append / AC text-verification-behaviorChanging alteration / AC id dropped entirely / mustNotChange removal / forbiddenPaths removal / risk downgrade (ask, incl. non-canonical casing) vs upgrade (allow) / first-ever-write unconditional allow / an Edit whose `old_string` doesn't match / a MultiEdit whose later step doesn't match / an Edit whose `old_string` matches a value shared by two AC entries (first-occurrence-only simulation) / design.md body-edit-with-heading-kept / whole-heading removal / "n/a" reduction / project opt-out (both settings files, local-overrides-project, and a malformed-settings fail-safe) / fail-open on malformed old JSON vs the distinct "unparseable-new-on-populated-old" finding case / oversized stdin / unreadable file / an unrelated-file no-op early exit.

### Fixed (gatekeeper repair pass, same 0.33.0 release)
- **M1 — risk-ordinal lookup is now case/whitespace-normalized.** `RISK_ORDINAL[oldC.risk]`/`RISK_ORDINAL[newC.risk]` only matched the canonical lowercase keys (`low`/`medium`/`high`); a real downgrade written as `"Low"`, `"LOW"`, `"low "`, or `"Medium"` missed the lookup and silently ALLOWED (this hook is the sole automated control on the `risk` field). Both sides are now normalized with `.trim().toLowerCase()` before the ordinal lookup; the ask message still quotes the original, unnormalized values.
- **M2 — `Edit`/`MultiEdit` simulation now replaces only the first occurrence, matching the real tool's default.** `current.split(old_string).join(new_string)` replaced every occurrence of `old_string`, so a correctly-scoped edit whose `old_string` happened to appear twice (e.g. two `acceptanceCriteria` entries sharing an identical `verification` string) could mis-simulate the untouched second entry as changed too, producing a spurious ask. Replaced with a new `replaceFirstLiteral()` helper (first-occurrence `indexOf`/`slice`, not `String#replace`, to avoid its own `$`-pattern replacement-string gotcha) in both the `Edit` and `MultiEdit` branches.

### Notes
- **No new stable-contract literal beyond the opt-out key.** This release adds one new documented opt-out key, `"udflow": { "contractGuard": false }`, registered in `ARCHITECTURE.md`'s Stable contract list alongside `planGate` / `destructiveGuard` / `preserveOnCompact`. No verdict/severity/existing-sentinel literal changed.
- Docs updated end-to-end: `hooks.json` (third `PreToolUse` entry), `.github/scripts/validate-structure.mjs` (`WIRING` array), `test/hooks-portability.test.mjs` (separate `WIRED` array — same cross-shell/no-shell-template-token/fail-open static-shape coverage every hook gets), README ×3 ("Five" → "Six" + new hook row, `##` section counts unchanged for the parity guard), `ARCHITECTURE.md` (hook count + component list + Stable contract opt-out keys), `SECURITY.md` (hook count + non-destructive/read-scope enumeration + opt-out list), `udflow/skills/doctor/SKILL.md` (hook-files-present list + a new probe), `RELEASING.md` ("all five hooks" → "all six hooks" + a new manual-smoke step). Version bumped 0.32.0 → 0.33.0 across `plugin.json`, `package.json`, and `marketplace.json` (metadata + plugin entry). `node --test` (318 tests, 29 new) + `validate-structure` green.

## [0.32.0] - 2026-07-02

### Added
- **Evidence-substituted panel (fast lane) + a third machine sentinel `udflow:panel=`.** On low/medium-risk work, `test-reviewer` may be replaced by the run's own execution evidence when both conditions hold: every behavior-changing acceptance criterion has a demonstrated red→green test AND the full required suite is green (`udflow:verify=pass`; `na` never qualifies). Automatic, disclosed, escalatable — never on High-risk / correctness-critical / deep-mode work (either tier, incl. Tier-1 auto-engage); `spec-reviewer` (the only omission lens) and `gatekeeper` are never substitutable. Substitution is disclosed at the plan gate, in the final report, and via the always-emitted sentinel `udflow:panel=full|substituted:<comma-separated-names>`; escalation (spec blocker/major or a gatekeeper-judged coverage gap) re-spawns the substituted reviewer before `READY`. New `## Evidence substitution (fast lane)` section in `references/reviewer-selection.md`; SKILL.md gains a red-light gate (a red/unrun required check returns to implementation — no panel on a red build), the fast-lane cost disclosure, the escalation clause, and the panel footer line. Includes a **1C clause**: a qualifying tiny diff (~≤40 changed lines, ≤2 files, no new dependency, lint/typecheck/build green) may have `code-reviewer` folded into the `gatekeeper`'s in-packet review (prose-only — `code-reviewer` is not in the hook's `REQUIRED` set, so no hook change for 1C).
- **`orchestration-check.js` reads the panel sentinel** (`panelSentinel()`, cloned from the `verifySentinel` last-match pattern; bounded `[a-z0-9,-]` name charset so a stringified `\n` terminates the list): advisory 2 (panel missing/incomplete) now exempts a missing reviewer **iff** it is named in `udflow:panel=substituted:<names>` in the final message AND on the `EXEMPTIBLE` whitelist (`test-reviewer` only, exact lowercase match — never substring) AND `udflow:verify=pass`. Everything else — no sentinel, `panel=full`, `verify=fail|unrun|na|absent`, a non-exemptible or unlisted name, an injected sentinel in a tool_result or non-final message, an empty/unknown value — warns exactly as before (fail toward warning). The panel path still never emits `decision:block`; ENFORCE stays advisory-1-only. 13 new hook tests (red→green demonstrated on the exemption cases).
- **Claims-evidence rigor contract (reviewer discipline, not format).** `references/reviewer-common.md` gains an admission rule (a finding enters the index only with a falsifiable claim + an anchor + the confirmation performed; anything less stays sayable, tagged `[unverified]` — a marker, not a prohibition), evidence grading (anchored+reproduced > anchored > `[unverified]`), and a refute-your-strongest-finding step; the Shared output contract is now explicitly **two channels** (protected free-form analysis + the one-line findings index — the existing line format IS the index format). The `review-packet.md` verbatim handoff block is synced (reviewers only ever receive that block). Each of the 7 reviewer agents gains a lean discipline-specific `## Minimum diligence` section (3–5 verifiable actions that leave checkable artifacts — quoted lines, named greps, cited `path:line`); no output-format templates. `gatekeeper` verifies substitution eligibility, owns escalation, performs the 1C in-packet review, and weighs findings by the evidence grades.
- **Review Packet standard fields:** `Must-not-change (invariants)` and `Edge checklist` are now standard packet fields (previously high-risk-only routing); `validate-structure.mjs` 5j guards `Must-not-change`, and 5d/5f now also pin `udflow:panel=` in the final-report compact fence and SKILL.md.
- **Review-hardening pins + drift guard (repair pass):** 6 more hook tests pin the exemption's blast radius (a granted substitution never silences advisory 1/4 or the ENFORCE block — proven by mutation-kill), the tolerant decode (case/space/CRLF, `udflow:`-anchored), the substituted-name-actually-ran no-op, and the array-of-typed-blocks final shape; `panelSentinel()` normalizes a decoded-but-empty name list (`substituted:,`) to null per its contract; new `validate-structure.mjs` 5k dual-file guard pins the rigor-contract anchors in BOTH `reviewer-common.md` and the `review-packet.md` verbatim block (mutation-checked).

### Notes
- **A new stable-contract literal was added** — unlike recent entries ("no sentinel literal changed"), this release **adds** the machine-checked sentinel `udflow:panel=full|substituted:<comma-separated-names>` (all-lowercase names, never translated) and registers it in `ARCHITECTURE.md`'s Stable contract list alongside `udflow:verify=` / `udflow:delivery=`. Existing sentinel grammar is unchanged; the new sentinel only ever *weakens* an advisory (never adds a warning or a block), so absent adoption behavior is byte-identical.
- Docs updated end-to-end: `ARCHITECTURE.md` (dataflow + stable contract), `docs/how-to-read-verdicts.md`, `examples/final-report-compact.md` / `final-report-full.md` / `not-ready-run.md` footers, README ×3 (fast-lane cost sentence + test-reviewer row, `##` section counts unchanged for the parity guard). Version bumped 0.31.0 → 0.32.0 across `plugin.json`, `package.json`, and `marketplace.json` (metadata + plugin entry). `node --test` (287 tests, 19 new) + `validate-structure` green.

## [0.31.0] - 2026-06-30

### Changed
- **Codex disagreement now explicitly resolved by the existing evidence rules, not a separate negotiation protocol.** Clarified that when an opted-in Codex independent verdict disagrees with the gatekeeper's own assessment, it is treated as reviewer-grade evidence — weighed by the same *Conflict resolution rules* as any dissenting reviewer, never a second authority requiring mutual agreement. A persistent disagreement on the same issue counts toward the existing two-iteration stuck-loop cap (*Auto-fix loop rules*) rather than looping Claude and Codex toward consensus indefinitely. Closes a real failure-mode gap (no termination guarantee, cost/latency blowup, privacy-default regression) in a "dual gatekeeper, negotiate to agreement" design that was considered and rejected in favor of this lighter-weight clarification of already-shipped behavior.
- `agents/gatekeeper.agent.md` (*Conflict resolution rules*, *Auto-fix loop rules*) and `references/external-capabilities.md` (*Codex*) — added a few sentences each; no new agent, hook, or capability. Codex remains off-by-default, opt-in per task; this changes nothing for a user who has not enabled it.

### Notes
- Shipped tree changed (`gatekeeper.agent.md`, `external-capabilities.md`) → bump 0.30.0 → 0.31.0 across `plugin.json`, `package.json`, and `marketplace.json` (metadata + plugin entry). No verdict/severity/sentinel literal changed (`validate-structure.mjs` 5f only pins `READY`/`FIX REQUIRED`/`NOT READY` in this file, all still present). `node --test` (256 pass) + `validate-structure` green.

## [0.30.0] - 2026-06-30

### Added
- **Data-driven consolidation feedback loop.** `scripts/failure-retrieve.mjs` gains opt-in `--log`: each entry it surfaces for a real task signature is appended to a sibling **append-only** ledger (`.failure-memory-usage.jsonl`, next to the memory file — never inside it, so the single-writer `FAILURE_MEMORY.md` invariant holds). New `scripts/failure-consolidate.mjs` aggregates that ledger into a deterministic prune **advisory** for the gatekeeper: retired entries (delete) and stale expire candidates (dated, old enough, never matched in the window). Honest by construction — an empty ledger or insufficient history makes **no** staleness claim, and undated/too-new entries are never flagged. Advisory only; the gatekeeper (single writer) makes the edits.
- 12 new tests (`test/failure-consolidate.test.mjs`) including a retrieve-`--log` → consolidate round-trip that asserts the memory file is never modified.

### Notes
- A bare `failure-retrieve.mjs` stays pure-read (no ledger) — recording is explicit opt-in. Shipped tree changed (new `failure-consolidate.mjs`, `--log` on `failure-retrieve.mjs`) → bump 0.29.0 → 0.30.0 across `plugin.json`, `package.json`, and `marketplace.json` (metadata + plugin entry). No verdict/severity/sentinel literal changed. `node --test` + `validate-structure` green.

---

Older releases (0.0.x – 0.29.0): see [docs/changelogs/CHANGELOG-0.x.md](docs/changelogs/CHANGELOG-0.x.md).
