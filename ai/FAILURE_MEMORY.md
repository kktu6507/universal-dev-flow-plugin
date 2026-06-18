# FAILURE_MEMORY

Reusable failure lessons. Newest first. Keep entries concise and prevention-oriented.

### 2026-06-19 — Digest omitted-count included a skipped template placeholder
- **Context / intended method**: the SessionStart digest appended "(N older entries omitted)" computed from the count of parsed entries.
- **What blocked it**: a dogfood review found the count used `starts.length - kept.length`, where `starts` included the `### <YYYY-MM-DD>` template placeholder that the parser skips, so the shipped sample (2 real entries, none dropped) falsely reported "(1 older entries omitted)".
- **Root cause**: the omitted total was derived from raw `###` heading count, not from the post-filter real-entry set.
- **Fix applied**: count real (non-placeholder) entries across the file and compute `omitted = realTotal - kept.length`; added a fixture test on the canonical sample asserting no omitted note.
- **Prevention rule**: derive "omitted/remaining" counts from the same filtered set you actually emit, never from the raw pre-filter count; cover it with a test on the documented sample.
- **Tags**: node / hooks-failure-memory / off-by-one.
- **Scope**: project-specific.
- **Recurrence**: first occurrence.

### 2026-06-19 — Plan-gate read-only bypass via unanchored path match
- **Context / intended method**: the plan-gate hook exempts Claude Code's own plan files (`~/.claude/plans/`) from the plan-mode write block.
- **What blocked it**: the exemption used `normalized.indexOf("/.claude/plans/") !== -1`, an unanchored substring match, so any repo-local or attacker-planted `.claude/plans/` directory was also exempt — defeating the plan-mode read-only guarantee.
- **Root cause**: a substring test instead of an absolute-prefix test rooted at the user home.
- **Fix applied**: resolve the target with `path.resolve` and require it to `startsWith(<home>/.claude/plans/)`; also added `NotebookEdit` to the blocked set; added tests for repo-local vs. home paths.
- **Prevention rule**: anchor path-based security exemptions to a resolved absolute prefix (home/project root), never a bare `indexOf`/substring, and resolve `..` before comparing.
- **Tags**: node / hooks-plan-gate / path-security.
- **Scope**: cross-project.
- **Recurrence**: first occurrence.

### 2026-06-19 — CI validated structure but never executed the hooks
- **Context / intended method**: a GitHub Actions "Validate" workflow guarded the plugin on push/PR.
- **What blocked it**: it only parsed JSON/frontmatter and never executed or syntax-checked the hook JS, so two digest bugs and a syntax error would all pass CI green; the `claude plugin validate` step was `continue-on-error`.
- **Root cause**: the gate covered manifest structure but not the highest-blast-radius code (hooks run every session and fail silently).
- **Fix applied**: added `node --check` of both hooks and a committed `node --test` suite to the workflow as blocking steps.
- **Prevention rule**: any code that runs every session and fails open must have an executing test in CI, not just a structural/lint check.
- **Tags**: ci / testing / coverage-gap.
- **Scope**: cross-project.
- **Recurrence**: first occurrence.
