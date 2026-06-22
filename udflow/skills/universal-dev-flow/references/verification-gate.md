# Verification Gate

Verification is required before final readiness claims. A statement like "should work" is not evidence.

## Command Evidence

Run the narrowest meaningful checks for the task:

- Backend/general: the repo's build, test, and lint commands for its stack — e.g. `dotnet build`/`dotnet test` (.NET), `npm`/`pnpm` scripts (Node), `pytest`/`ruff` (Python), `go build`/`go test` (Go) — or repo-specific focused commands when stricter.
- Frontend/UI: package install when needed, build, test, lint, typecheck, and browser evidence when browser-visible.
- Data/config/deployment: migration validation, schema guard, config checks, deployment or rollback evidence when feasible.
- Additional focused tests when the changed path has targeted suites or scripts.

**Exercise the change's risky inputs — do not rely on reading the code.** Most defects that survive review are only visible when the boundary case actually *runs*, not when the code is read: empty / zero / overflow / very-large values, multibyte or non-ASCII text, null or empty collections, duplicate or multiple values (e.g. repeated headers), malformed input, by-value vs by-reference / receiver use, and concurrent access. For behavior-changing code, add or run a focused test that feeds the specific edge inputs the change implies and assert the expected result — a test that reproduces the boundary is the oracle a static read lacks, and it is what catches subtle idiom/encoding/overflow/omission bugs that a reviewer rationalizes as "looks fine".

On high-risk work, this edge-input set is enumerated up front by the plan-grounding step (`references/plan-grounding.md`) as the change's **implied edge checklist** and carried here, so the boundary tests are planned rather than improvised at verification time.

Prefer running build/test commands in the **foreground** — the runner reaps them cleanly. If you background one, make sure it leaves **no lingering child process** (a build server, file watcher, or dev server): a survivor that inherits the command's output pipe keeps the background task stuck "running" long after the command has actually finished. .NET is the common case — `dotnet build`/`dotnet test` spawn MSBuild node-reuse workers and the Roslyn `VBCSCompiler` server that persist for minutes; if you must background a .NET build/test, add `/p:UseSharedCompilation=false /nr:false` (or set `MSBUILDDISABLENODEREUSE=1`) so nothing is left holding the pipe.

For every skipped check, state the command or check, why it could not run, and remaining uncertainty.

## Browser Evidence

For local browser-visible UI changes with a known or safely derivable target, use Claude in Chrome, an in-app browser, or an accepted existing fallback.

Record:

- target URL, route, file, or current tab
- scenario or state exercised
- observed result
- tool used
- screenshot reference or why no screenshot was needed
- focus, hover, keyboard, clipboard, or navigation result when relevant
- exact blocker and fallback evidence if browser automation cannot run

Browser evidence supplements automated tests. It does not replace them when automated checks are practical.

## External-Capability Skips (MCP / skills / subagents)

Optional external capabilities are environment-dependent. When a check relies on one (e.g. a security MCP scan, a `ui-ux-pro-max` design audit, a Playwright browser MCP, an external reviewer subagent):

1. Verify the capability is actually available before relying on its result.
2. If it is unavailable, do NOT claim the check ran. Perform the best local fallback instead.
3. Explicitly disclose: which capability was unavailable, what verification was therefore not performed, what local fallback was used, and the remaining uncertainty.

Treat an unavailable required external capability as a verification gap, not a silent skip. See `references/external-capabilities.md`.

## Text Integrity

When touching human-readable content, check:

- required target language (per repo/user convention) when applicable
- mojibake and replacement characters
- broken or mixed character sets
- unsafe localization of technical contracts
- encoding compatibility constraints

Do not perform broad encoding conversion unless the root cause and interoperability risk are understood.

## Failure Memory

Read before non-trivial implementation. The SessionStart hook injects only a condensed **digest** (entry titles + tags, newest first; the prevention-rule text is read on demand, not injected) as an index — do not treat it as the full record:

1. `ai/FAILURE_MEMORY.md` when it exists.
2. `~/.claude/FAILURE_MEMORY.md` otherwise, including consolidated groups.

During planning, perform **targeted retrieval**: search the failure-memory file for entries relevant to this task's affected files, area, language, and error type (use the entry `Tags` to filter), then read those full entries. Do not rely on the startup digest alone.

**Single writer:** the failure-memory file is shared mutable state and reviewers run in parallel, so only one actor writes it — the main thread / `gatekeeper` after the verdict. Reviewers and the implementer only *propose* entries; they do not write the file. This avoids lost-update / interleaved-write corruption (the "reread global first" step below is a lockless read-modify-write and is only safe with a single writer).

Before every failure-memory write:

1. Reread the global `~/.claude/FAILURE_MEMORY.md`, even when a project-specific memory file is the final write target.
2. Check whether an existing consolidated group or detailed entry already covers a similar lesson.
3. If a similar lesson exists, update or append within that same relevant section instead of creating a disconnected duplicate.
4. If the same mistake recurs, explicitly mark the recurrence on that mistake or entry; do not omit repeated failures.
5. Use the target file's existing template exactly when it defines one.

Write failure memory without requiring another explicit user approval when any execution abnormality blocks, disrupts, or forces repair of the originally intended method. Record the original method that could not proceed, why it failed, and how it was repaired. This includes:

- inability to execute a planned command, test, tool, runtime, browser, connector, build, or smoke path
- abnormal command/runtime/tool behavior, including file locks, startup failures, sandbox/runtime failures, encoding failures, or environment mismatches
- inability to start an expected service, browser, test host, local server, DB path, worker, or automation runtime
- build or test failures, including transient failures when the root cause and prevention are reusable
- blocker or major reviewer rejection, especially when the repair changes tests, parameters, files, cancellation handling, resource lifetime, telemetry, or runtime behavior
- blocked tasks with a reusable prevention lesson
- code-quality, framework-misuse, performance/resource, encoding, locale, text-integrity, or verification-evidence failures with reusable value

Do not replace failure memory with a silent fallback. If the original method could not proceed and a workaround or parameter/file/configuration repair was required, record why the original path failed and what made the repaired path valid.

Prefer project-specific memory for repo-specific lessons and global memory for cross-project workflow/tooling/reviewer coordination lessons. When both apply, write the project-specific lesson and also update the global lesson if the prevention rule is reusable across repositories.

Tag each entry (`Tags`: language / area / error-type) so the startup digest and targeted retrieval can filter it.

### Keeping the file small (consolidation)

Control file size by **entry count, not by truncation**. Hook truncation is only a safety net. When the file grows past a sane size (roughly 30+ entries, or whenever entries overlap):

- Merge duplicate or near-duplicate lessons into one entry and fold repeats into its `Recurrence` line.
- Drop entries that are obsolete (the code/tool/path no longer exists) or fully superseded by a broader rule.
- Keep newest first and keep each surviving entry's prevention rule and tags intact.

Consolidate as part of the write step when you notice overlap; do not let the file grow unbounded and rely on the digest cap to hide it.

## Failure Memory Entry Template

Use the target file's existing template when it defines one. If the target `FAILURE_MEMORY.md` is new or has no template yet, seed it with the structure below and use this format for the first entry, so later entries stay consistent:

```markdown
# FAILURE_MEMORY

Reusable failure lessons. Newest first. Keep entries concise and prevention-oriented.

## Entry Template

### <YYYY-MM-DD> — <short title>
- **Context / intended method**: what was being attempted and the original approach that could not proceed.
- **What blocked it**: the abnormality, error, or rejection (command, runtime, tool, encoding, reviewer blocker, etc.).
- **Root cause**: why it actually failed.
- **Fix applied**: what made the repaired path valid.
- **Prevention rule**: the reusable rule that avoids this next time.
- **Tags**: language / area / error-type (used by the startup digest and targeted retrieval).
- **Scope**: project-specific or cross-project.
- **Recurrence**: note and increment if this lesson recurs (e.g. "seen again 2026-06-19").
```

When appending to an existing file, reuse its headings exactly; do not introduce a competing schema. Mark recurrences on the existing entry instead of creating a duplicate.

## Artifact Hygiene

Leave the working tree clean. A run must not leave behind intermediate or process artifacts:

- Delete any temporary scaffolding created only to verify (one-off scripts, scratch files, temp directories) before finishing. Only intentional deliverables remain: the source changes, committed tests, and recorded failure memory.
- Distinguish throwaway artifacts (remove) from permanent assets (keep): a committed regression test suite or a documented config is an asset, not scratch.
- Do not commit the workflow's own runtime output (e.g. `FAILURE_MEMORY.md`) into a tool/library/plugin repository that gets distributed. Failure memory belongs in the project that *uses* the tool, not in the tool's own source tree; in a distributed package it is residue that ships to every user.

## Final Output Contract

For substantial tasks, end with:

```markdown
## Summary
- what was implemented

## Files Changed
- list of changed files

## Assumptions
- assumptions that affected design or implementation

## Verification
- commands/checks executed and results
- exact blockers and remaining uncertainty for checks not run

## Acceptance Criteria
- each user-approved criterion as met / unmet / deferred (or "not applicable" for trivial work)

## External Capabilities
- MCP / skills / subagents used
- any that were unavailable, the local fallback used, and the resulting verification gap

## Findings
- blocker
- major
- minor

## Missing Tests
- required tests that do not exist

## Risks
- known limitations or uncertainty

## Failure Memory
- required / not required
- reason
- entry added or not added
- target file path when applicable

## Final Verdict
- READY / FIX REQUIRED / NOT READY
```

If blocked, also include a Stuck Summary with unresolved blocker, attempted remedies, why progress is blocked, and what is needed next.

## Run Card

For substantial tasks, end the final summary with a compact, user-visible **Run Card** so the user can see what happened without reading the whole transcript — verdict, which checks/reviewers ran, top findings, what was auto-fixed, what remains, and roughly what it cost. It directly answers "many agents ran for a long time and cost a lot, but I can't tell what happened." Use the same threshold as the Final Output Contract (omit it for trivial edits and pure Q&A, which emit no sentinel tokens).

Write the labels and prose in the **user's language**, but keep the machine-checked literals verbatim: the verdict `READY` / `FIX REQUIRED` / `NOT READY`, the severities `blocker` / `major` / `minor`, and the sentinel tokens `udflow:verify=` / `udflow:delivery=`. The two sentinel lines are the machine-readable rollup the Stop hook reads, so they must be the **last lines** of the summary.

```markdown
## Run Card
- Verdict: READY | FIX REQUIRED | NOT READY
- Checks: <command> <pass|fail|unrun>, … (e.g. `npm test` pass, `tsc --noEmit` pass) — exit status, not opinion
- Acceptance: <N/N criteria met | list any unmet/deferred (note user-consented deferrals) | "n/a"> — did it do what was asked
- Reviewers: <which ran, e.g. spec-reviewer, test-reviewer, gatekeeper | "self-review (no panel)">
- Top findings: up to 3, each `blocker`|`major`|`minor` + one line (or "none")
- Auto-fixed: <what the repair loop fixed this session | "nothing">
- Remaining: <unresolved blocker/major + missing required tests | "none">
- Cost (approx): <tier: lite | default | deep> · <~new tokens / wall-clock / subagent count | "not measured"> — approximate, never fabricated

udflow:verify=<pass|fail|unrun|na>
udflow:delivery=<held|shipped>
```

The card restates Verdict → `udflow:delivery=` and Checks → `udflow:verify=` directly above the tokens so the human-readable card and the machine rollup cannot silently disagree. The `udflow:verify=` rollup is authoritative for the Stop hook's verification advisory (see the gatekeeper's "Command-evidence authority"): `pass` only when every required check actually ran and exited zero, `fail` on a non-zero required check, `unrun` when a required check was claimed but never ran, `na` when no command checks were required. `Cost` is a best-effort self-estimate (udflow ships no telemetry) and may be "not measured" — never fabricate exact numbers (same rule as the Evidence Record below).

## Run Report

For substantial tasks, follow the compact Run Card with a fuller, table-based **Run Report** the user can actually read — what each agent did, what it found and fixed, what the change achieved, and what it cost. The Run Card stays above as the at-a-glance header; the Run Report is the detail. Omit it for trivial edits and pure Q&A. Labels/prose follow the user's language; keep the machine-checked tokens verbatim.

### Outcome — requirement → change → effect
One row per requirement or acceptance criterion: what the user asked, what changed to satisfy it, and the resulting effect / improvement (before → after). State only verified effects; mark anything not yet confirmed "to be confirmed".

| Requirement / acceptance criterion | What changed | Effect / improvement (before → after) |
|---|---|---|
| <the ask / AC1> | <the change> | <what is better now: before → after> |

### Per-agent activity
One row per agent/phase that actually ran (the implementer, each selected reviewer, the gatekeeper, and any plan-grounding / diagnosis pass):

| Agent | What it did | Found | Fixed |
|---|---|---|---|
| implementer | <the change it made> | — | — |
| spec-reviewer | <scope reviewed> | <n blocker / n major / n minor + the key one-liner, or "none"> | <finding applied, if any> |
| … | … | … | … |
| gatekeeper | aggregated findings + verdict | <verdict + per-criterion acceptance> | — |

### Token & cost (no telemetry — observed vs estimated)
| Agent / phase | Tokens | Source | ~Cost |
|---|---:|---|---:|
| spec-reviewer | <n> | observed | <~$ or —> |
| … (each subagent) | <n> | observed | … |
| orchestrator (main thread) | <n> | **estimate** | … |
| **Total** | **<sum>** | observed + estimate | **<~$ band>** |

Honesty rules (extend the Run Card's "never fabricate"):
- **Subagent tokens are observed** — report the per-agent token figure the harness surfaces for a finished subagent (the field name varies by harness; e.g. a `subagent_tokens`-style field). If no figure is surfaced for an agent, write **"not reported"** — do not guess.
- **The orchestrator (main-thread) figure is an estimate** — label it; udflow ships no telemetry and the main thread cannot read its own exact running total. Because the grand total folds in this estimated figure, **the total is itself an estimate** — do not present it as a measured count.
- These are **new tokens** (first-processed). The **billable** total (`/cost`) counts cached context re-contributed every turn — ~20–30× the new-token figure *in tokens*; but cache reads bill at roughly a tenth of the input rate, so the **dollar** cost scales much closer to the new-token figure (see README, "Cost per run"). Don't over-scare on cost.
- **`~Cost` is a rough band, not a bill** — state the assumed per-model rate(s) and the date used; if rates are unknown, give tokens only and write "× your plan's rate". Carry the cost **tier** (lite / default / deep) from the Run Card.

### UI/UX evidence
- If the task changed UI/UX: include the **after-change screenshot** (embed `![after](path)` or give the path) plus a one-line before → after and the browser/tool used (record per "Browser Evidence" above; follow Detect → Use → Else-Disclose, see `references/external-capabilities.md`). If browser automation could not run, state the exact blocker and the fallback evidence instead.
- If there was no UI/UX impact: write "no UI/UX impact".
- Only include a screenshot you actually captured — never fabricate a screen (same rule as the Evidence Record below).

## Evidence Record (real runs only)

When udflow actually ran the workflow on a **real task in an actual project** (not a throwaway demo or a benchmark experiment), also emit one compact, paste-ready record the user can drop into the project's `EVIDENCE.md` *Real-world runs* section — or a [`Verified udflow run`](.github/ISSUE_TEMPLATE/verified-run.yml) issue — with no reformatting. This is the only way real-use evidence gets logged: udflow ships no telemetry, so a run that isn't written down does not count.

```markdown
### Live run — <YYYY-MM-DD> · <project / stack> (<language>) · verified live task
- Task: <one line: what udflow was asked to do>
- Intent given: <the requirement / contract handed in — and how specific it was>
- Reviewers: <which reviewers ran> · Verdict: <READY / FIX REQUIRED / NOT READY>
- Verification: <commands / browser checks / tests actually run>
- Caught: <real, valid findings udflow raised that were acted on>
- Missed: <none known at finish — to confirm in follow-up use>
- False alarms: <none, or describe any finding that was not a real defect>
- Outcome after follow-up: <to be confirmed by the user once the change has lived in the codebase>
- Cost: <~tokens / wall-clock> · Evidence: <commit / PR / sanitized log>
```

Rules: emit it only when the workflow genuinely ran and verification was attempted; report findings and the verdict exactly as they were. **Never fabricate an outcome.** The *Missed* and *Outcome after follow-up* fields are honestly left for the user to fill later — udflow cannot know at finish time what (if anything) escaped the verdict. Omit this record for trivial edits, pure Q&A, and benchmark runs.
