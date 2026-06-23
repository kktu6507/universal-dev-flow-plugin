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

For substantial tasks, end with the single report below. Write the labels and prose in the **user's language**, but keep the machine-checked literals verbatim: the verdict `READY` / `FIX REQUIRED` / `NOT READY`, the severities `blocker` / `major` / `minor`, and the sentinel tokens `udflow:verify=` / `udflow:delivery=`. The two sentinel lines are the machine-readable rollup the Stop hook reads, so they are the **last lines**. Same threshold throughout — omit the whole report for trivial edits and pure Q&A (which emit no sentinel tokens).

```markdown
## Summary
- what was implemented (and the net effect)
- Outcome — requirement → change → effect (one row per requirement / acceptance criterion; verified effects only, else "to be confirmed"):
  | Requirement / acceptance criterion | What changed | Effect (before → after) |
  |---|---|---|
  | <the ask / AC1> | <the change> | <what is better now> |
- Per-agent activity (one row per agent/phase that actually ran):
  | Agent | What it did | Found | Fixed |
  |---|---|---|---|
  | implementer | <the change> | — | — |
  | spec-reviewer | <scope reviewed> | <n blocker / n major / n minor, or "none"> | <finding applied, if any> |
  | gatekeeper | aggregated findings + verdict | <verdict + per-criterion acceptance> | — |

## Files Changed
- list of changed files

## Assumptions
- assumptions that affected design or implementation

## Verification
- Checks (exit status, not opinion): <command> <pass|fail|unrun>, … (e.g. `npm test` pass, `tsc --noEmit` pass)
- Not run / uncertainty: exact blockers and remaining uncertainty for required checks not run
- Acceptance criteria: each user-approved criterion as met / unmet / deferred (note user-consented deferrals), or "n/a" for trivial work — an unmet, non-deferred criterion is incompatible with READY
- External capabilities: MCP / skills / subagents used; any unavailable, the local fallback, and the resulting verification gap — or "none"
- UI/UX evidence: for UI work, the after-change screenshot (embed `![after](path)` or give the path) + a one-line before → after and the tool used; "no UI/UX impact" otherwise. Only a screen you actually captured — never fabricate one
- Cost (no telemetry — observed vs estimated):
  | Agent / phase | Tokens | Source | ~Cost |
  |---|---:|---|---:|
  | <subagent> | <n> | observed | <~$ or —> |
  | orchestrator (main thread) | <n> | estimate | … |
  | **Total** | **<sum>** | observed + estimate | **<~$ band>** · tier: <lite | default | deep> |

## Findings
- blocker
- major
- minor

## Missing Tests
- required tests that do not exist

## Risks
- known limitations or uncertainty (including any unresolved major + deferred items)

## Failure Memory
- required / not required
- reason
- entry added or not added
- target file path when applicable

## Final Verdict
- READY / FIX REQUIRED / NOT READY

udflow:verify=<pass|fail|unrun|na>
udflow:delivery=<held|shipped>
```

If blocked, add a `## Stuck Summary` (above the footer) with the unresolved blocker, attempted remedies, why progress is blocked, and what is needed next. On a real run, the `## Evidence Record` below is emitted just above the footer.

The footer restates the report's decision so the human-readable report and the machine rollup cannot silently disagree: `udflow:delivery=` mirrors the Final Verdict (`held` unless the verdict is READY and you are shipping), and `udflow:verify=` is the verification rollup — `pass` only when every required check actually ran and exited zero, `fail` on a non-zero required check, `unrun` when a required check was claimed but never ran, `na` when no command checks were required. The command exit status is authority over reviewer prose: a `fail` / `unrun` required check is incompatible with READY and shipping. Keep both tokens and their values verbatim (machine-checked, like the verdict).

Cost honesty (no telemetry): subagent token figures are **observed** — the per-agent figure the harness surfaces for a finished subagent; if none is surfaced write "not reported", do not guess. The orchestrator (main-thread) figure is an **estimate**, so the grand total is itself an estimate. Figures are **new tokens** — the billable `/cost` total re-counts cached context every turn (~20–30× in tokens, but cache reads bill at ~a tenth of the input rate, so the dollar cost scales much closer to the new-token figure; don't over-scare). `~Cost` is a rough band, not a bill: state the assumed per-model rate(s) and date, or give tokens only and write "× your plan's rate".

## Evidence Record (real runs only)

When udflow actually ran the workflow on a **real task in an actual project** (not a throwaway demo or a benchmark experiment), also emit a compact, paste-ready evidence record so the run can be logged with no reformatting. This is the only way real-use evidence gets logged: udflow ships no telemetry, so a run that isn't written down does not count. Emit two things:
- the **`### Live run` block** below — paste it into the project's `EVIDENCE.md` *Real-world runs* section (or a PR that adds that section), and into the [`Verified udflow run`](.github/ISSUE_TEMPLATE/verified-run.yml) issue form's `Run details` box;
- a short **issue-form sheet** — the few form choices the block doesn't carry (run type, verdict, reviewers), so the whole run files in three picks and one paste.

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

### Verified-run issue form — three picks + one paste

The [`Verified udflow run`](.github/ISSUE_TEMPLATE/verified-run.yml) form is short: two dropdowns, the reviewers checkboxes, and one `Run details` box that takes the whole `### Live run` block above. Field names are the form's exact labels — keep them and the option literals verbatim:

```text
1. Run type — [select] Live task
2. Final udflow verdict — [select] READY | FIX REQUIRED | NOT READY | No formal verdict
3. Reviewers involved — [check] <only the reviewers that ran>
4. Run details — [paste] the whole `### Live run` block above (its header already carries date · stack · language; keep the Missed / False alarms / Outcome lines)
5. Evidence or links — [paste] <commit / PR / sanitized log> · optional
```

- Marker words and prose follow the **user's language** (e.g. 〔貼〕 paste / 〔選〕 select / 〔勾〕 check); the **field names and option literals stay verbatim** so they match the GitHub form.
- Keep this list in sync with [`.github/ISSUE_TEMPLATE/verified-run.yml`](.github/ISSUE_TEMPLATE/verified-run.yml) — that form is the source of truth for the fields and options.

Rules: emit these records only when the workflow genuinely ran and verification was attempted; report findings and the verdict exactly as they were. **Never fabricate an outcome.** The *Missed* and *Outcome after follow-up* fields are honestly left for the user to fill later — udflow cannot know at finish time what (if anything) escaped the verdict. Omit them for trivial edits, pure Q&A, and benchmark runs.
