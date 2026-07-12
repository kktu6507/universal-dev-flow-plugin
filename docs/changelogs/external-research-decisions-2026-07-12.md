# External-research decisions — 2026-07-12 (mattpocock/skills comparison & core-drift review)

Decision record for a 2026-07-12 review comparing udflow against mattpocock/skills and auditing for
core-drift. Twelve source-report recommendations plus one SECURITY.md wording finding, each tagged
`[x]` accepted / `[d]` deferred-or-rejected, with the stated rationale — same per-decision record
convention as `docs/changelogs/audit-2026-07-fixlist.md`. Maintainer-approved scope for this run:
Phase 0 (this record + the SECURITY.md wording fix) + Phase 1 (Option A: extend `contract-guard.js`,
not a 7th hook) + Phase 3 (reviewer/reference hardening). Phase 2 (lowering report friction) and
recommendation #5 (a non-gated explore mode) are explicitly out of scope for this run — outreach and a
containment-design problem respectively, not engineering ready to ship now.

## Recommendations

- [x] **1 — Technical guard on `.claude/settings*.json` `udflow.*` keys.** Accepted, implemented this
  run (Phase 1, Option A). Closes a real, previously-undocumented-in-code gap: no hook watched
  Write/Edit to these files; the only defense was prose in `implementer.agent.md:55`.
- [d] **2 — Lower friction for "Verified udflow run" reports.** Deferred, not this run. The reporting
  mechanism itself (`final-report.md`'s auto-generated "Live run" block + direct issue-template link,
  "two picks + one paste") is already low-friction; the actual gap is adoption/outreach (0
  non-maintainer runs, marketplace listing still pending), not engineering. Supplementary idea
  surfaced by the source report's HTML artifact, worth keeping for whenever this IS tackled: a
  one-click "Verified udflow run" report-text generator surfaced in `doctor`'s output or the README,
  echoing mattpocock/skills' practice of linking every `.out-of-scope` decision to an issue for
  transparency.
- [d] **3 — CONTEXT.md-style shared vocabulary artifact for the Review Packet.** Rejected. Solves a
  terminology-consistency problem udflow has never claimed to own; would need its own artifact
  lifecycle (detect/draft/bless/write/update) — new surface area for an unclaimed concern. Revisit
  only if real reviewer terminology drift is observed causing actual harm, not speculatively.
- [d] **4 — wayfinder-style multi-run task/backlog map.** Rejected. Would pull udflow from
  "release-readiness judge for one change" toward "process/backlog owner" — directly contradicts the
  README's own Anti-goals and is the exact "owning the process" pattern mattpocock/skills' own README
  explicitly rejects (naming GSD/BMAD/Spec-Kit). Implementing this would move udflow's center of
  gravity, not just extend it.
- [d] **5 — Non-gated "explore" / prototype mode (skip verify/panel/gatekeeper).** Deferred, maintainer
  decision: not doing this now. Plan-gate is udflow's defining mechanism; an escape hatch without a
  hard TECHNICAL containment (e.g. a hook that refuses to let explore-mode output enter the final diff
  without re-passing plan-gate) would reopen the exact class of hole Phase 1 is closing elsewhere in
  this same run. Revisit only if a future session designs real technical containment, not as a
  prose-only escape hatch.
- [x] **6 — Tautological-test check added to `test-reviewer`.** Accepted, implemented this run (Phase
  3). Low-risk extension of an existing reviewer's existing Review lens list; covers two distinct
  anti-patterns: (a) an assertion that only echoes back its own mock's configured return value, and
  (b) a "duplicate-computation" assertion — the test re-derives its "expected" value using the same
  logic/formula as the code under test, so a bug shared by both never surfaces. A related but broader
  idea (dependency-injection-level test-quality criteria, from mattpocock's `mocking.md`) was noted but
  deliberately left out of scope this round — narrower than "tautological-test check."
- [x] **7 — expand → migrate → contract reference for large/breaking refactors.** Accepted, implemented
  this run (Phase 3), as new file
  `udflow/skills/universal-dev-flow/references/expand-migrate-contract.md`, referenced from
  `implementer.agent.md` and `architecture-reviewer.agent.md`, and wired into `SKILL.md`'s Reference
  Loading table (CI-mandated, garden-9a). Content is original writing following the well-known
  industry expand/migrate/contract ("parallel change") pattern, not a verbatim translation of
  mattpocock's `to-tickets` skill (no verbatim source text was available to translate from).
- [x] **8 — Fold `diagnosing-bugs`' 6-phase root-cause method into `repro-and-fix.md`.** Accepted,
  implemented this run (Phase 3), as a small additive fix (not a full rewrite, not a net line-count
  reduction as originally hoped — grounding found real, concrete gaps, not just redundant-and-collapsible
  content): `repro-and-fix.md` already covers reproduction (its 3-tier fidelity + "red evidence is
  mandatory") but was missing (a) isolating the fault to a specific cause (git bisect / input-space
  narrowing / log narrowing, AND single-variable instrumentation — change one variable at a time and
  observe), and (b) an explicit "propose 3-5 falsifiable hypotheses, then test the hypothesis before
  fixing" step. `closure.md`'s root-cause-vs-symptom distinction already existed but only at Stage 7
  (postmortem, too late to steer the actual fix) — a one-line pointer to that distinction is now pulled
  forward to the start of Stage 5 so it is available during diagnosis, not just retrospectively. NOT
  adding: "clean up debug traces after fixing" — already covered by `implementer.agent.md`'s existing
  non-negotiable ("delete temporary verification scaffolding... before finishing"), would be pure
  duplication.
- [d] **9 — Formal audit using `writing-great-skills` vocabulary (context load, sediment, sprawl, no-op,
  negation) as an audit basis for udflow's own agents/references.** Deferred to a future
  periodic-audit cycle, not this run.
- [d] **10 — Split the README's Anti-goals into `.out-of-scope/`-style dated per-decision files.**
  Merged into this decision doc instead of a separate change. This decision-record doc (and its
  established `audit-2026-07-fixlist.md` precedent) already achieves the "traceable, reasoned,
  per-decision record" goal at lower cost than inventing a new directory convention. Revisit the bigger
  README restructure only if this lighter pattern proves insufficient over a few more cycles.
- [d] **11 — "Two parallel sub-agents, no merge" review shape as a cost floor below `--lite`.**
  Rejected. Would reproduce the exact "no unified verdict, human must reconcile" weakness the source
  report itself flagged as a con of mattpocock/skills' own code-review skill, and contradicts
  `EVIDENCE.md`'s own measured finding that recall gains come from panel results converging through a
  gatekeeper, not from unreconciled parallel opinions. If a cheaper floor below `--lite` is wanted
  later, it must keep a lightweight convergence/gatekeeper step, not drop it.
- [d] **12 — User-triggered handoff-style command (manual complement to `compact-fidelity.js`).**
  Deferred to a future cycle, not this run.

## SECURITY.md wording finding

- [x] **13 — "One untrusted-input surface" claim was unscoped.** Fixed this run (Phase 0).
  `SECURITY.md` framed the `FAILURE_MEMORY.md` digest injection as literally "the one" untrusted-input
  surface in a Claude Code session — true only for the surface udflow's own hooks inject content from,
  not a claim that no other prompt-injection vector can exist in a session generally. Both occurrences
  (the file's intro line and the `## Untrusted-input surface` heading) are reworded to scope the claim
  to hooks' own injection; the mitigations described underneath (nonce-fenced, role-marker-neutralized,
  titles/tags only) are accurate for the surface they cover and are left as-is. Repo-wide grep for the
  old unscoped phrasing after the edit confirmed no stray reference was missed outside this file.

## Policy: adoption evidence before further capability

Prioritize adoption evidence (`EVIDENCE.md` Track 2 — still 0 non-maintainer Verified udflow runs as of
this writing) over shipping further new capability, until at least one non-maintainer verified run
lands. This directly answers the source report's own "pace mismatch" finding (stated priority is
adoption + evidence, but recent effort skewed toward capability work), and follows the existing
precedent of `docs/consolidation.md`'s own un-freeze note: un-freezing did **not** mean "resume adding
features" — the standing finding was that the real bottleneck is adoption + evidence, not capability,
and the next lever is a non-maintainer real run plus a marketplace listing, not new agents or hooks.
This run's own Phase 1 (a real, previously-undocumented gap) and Phase 3 (low-risk reviewer/reference
hardening) are judged consistent with that policy — both close gaps found by grounding against this
run's own existing surface, not speculative new capability — but the policy stands for what comes next:
the priority after this run is still the non-maintainer run and marketplace listing, not another
capability pass.
