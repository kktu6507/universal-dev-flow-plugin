# Verification Gate

Verification is required before final readiness claims. A statement like "should work" is not evidence.

## Command Evidence

Run the narrowest meaningful checks for the task:

- Backend/general: the repo's build, test, and lint commands for its stack — e.g. `dotnet build`/`dotnet test` (.NET), `npm`/`pnpm` scripts (Node), `pytest`/`ruff` (Python), `go build`/`go test` (Go) — or repo-specific focused commands when stricter.
- Frontend/UI: package install when needed, build, test, lint, typecheck, and browser evidence when browser-visible.
- Data/config/deployment: migration validation, schema guard, config checks, deployment or rollback evidence when feasible.
- Additional focused tests when the changed path has targeted suites or scripts.

**Exercise the change's risky inputs — do not rely on reading the code.** Most defects that survive review are only visible when the boundary case actually *runs*, not when the code is read: empty / zero / overflow / very-large values, multibyte or non-ASCII text, null or empty collections, duplicate or multiple values (e.g. repeated headers), malformed input, by-value vs by-reference / receiver use, and concurrent access. For behavior-changing code, add or run a focused test that feeds the specific edge inputs the change implies and assert the expected result — a test that reproduces the boundary is the oracle a static read lacks, and it is what catches subtle idiom/encoding/overflow/omission bugs that a reviewer rationalizes as "looks fine".

For each **behavior-changing acceptance criterion**, **generate** a demonstrating test you confirmed **fails without the change and passes with it** (run it against the pre-change state, or assert the bug-reproducing input), and **record that red→green transition** as the criterion's evidence — a test shown to fail first is the strongest proof the behavior was actually *absent* before, which is exactly what an omission defect needs. This is now a produced artifact per behavior-changing criterion, not just an after-the-fact check: the criterion → verifying-test mapping is what the `gatekeeper`'s bidirectional traceability reads (`agents/gatekeeper.agent.md`, *Acceptance-criteria check*), and `test-reviewer` drives the fill for any criterion still missing one. Where a clean fail-first→pass is impractical (much UI, copy, or config has no such red-green), say so rather than manufacturing one; this is a **preference, not a hard gate** — disclose the criterion and the captured command/observed-behavior evidence used instead.

On high-risk work, this edge-input set is enumerated up front by the plan-grounding step (`references/plan-grounding.md`) as the change's **implied edge checklist** and carried here, so the boundary tests are planned rather than improvised at verification time.

Prefer running build/test commands in the **foreground** — the runner reaps them cleanly. If you background one, make sure it leaves **no lingering child process** (a build server, file watcher, or dev server): a survivor that inherits the command's output pipe keeps the background task stuck "running" long after the command has actually finished. .NET is the common case — `dotnet build`/`dotnet test` spawn MSBuild node-reuse workers and the Roslyn `VBCSCompiler` server that persist for minutes; if you must background a .NET build/test, add `/p:UseSharedCompilation=false /nr:false` (or set `MSBUILDDISABLENODEREUSE=1`) so nothing is left holding the pipe.

For every skipped check, state the command or check, why it could not run, and remaining uncertainty.

Run checks at minimal verbosity and filter command output to decision-relevant content, by content type — each recipe is *how to filter without dropping signal*, not licence to trim:

- **Diffs** — `git diff --stat` to orient, *then* a targeted `git diff <path>` for the actual hunks; keep hunk headers and changed lines, skip unrelated files.
- **Test / build output** — surface failures: the failing assertion, the first failing stack frame, and the error message; on green, the summary line is enough — do not echo passing-test spam.
- **Logs** — keep the error/warning lines and the surrounding context; collapse repeated or info-level noise, but never drop the failing stanza.
- **Searches** — `rg -l`/`-c` to locate, *then* `rg -n -C<k>` to pull the matching context; do not dump whole files.

Filter noise, never signal — a smaller view is acceptable only when it preserves 100% of the decision-relevant detail (failure tracebacks, the actual changed hunks, the matching code). Never trade recall for fewer tokens.

## Repair-iteration scoping

On a **repair iteration** (the auto-fix loop, `SKILL.md` step 8), re-run only the checks the fix actually affects — the failing check(s) and the changed-path suites — not the full green suite every loop; re-running checks that already passed and were untouched wastes tokens and wall-clock without adding signal. Two non-negotiables keep this honest:

1. **Re-run the full required set once more for the final pre-`READY` confirmation**, so `udflow:verify=pass` still rests on a real full-suite green. The command exit status is authority (`agents/gatekeeper.agent.md`, *Command-evidence authority*); a fix can introduce a regression in a path that earlier passed, so the last gate before delivery must exercise the whole required set, not trust prior green.
2. In the per-check table, mark a **carried-forward-green** check distinctly from a **re-ran-green** one — never silently present a prior pass as if it ran this iteration.

This is *filter noise, not signal* applied across iterations: it changes which checks re-run mid-loop, never the final full-suite guarantee.

## Regression ratchet (baseline-passing ∩ now-failing)

A fix can turn a previously-green test red. When test ids are parseable from the runner output, the `gatekeeper` computes `baseline_passing ∩ now_failing` — the set of tests that passed on the pre-change baseline but fail now — and treats any non-empty intersection as a blocking regression, **naming the newly-failing tests** (`agents/gatekeeper.agent.md`, *Regression ratchet*). This pairs with the final full-suite re-run above: the full set runs, and the ratchet checks that nothing that used to pass now fails.

**It only ever adds safety; it never false-positives on ambiguity.** If individual test ids cannot be parsed from the output (an opaque runner, a summary-only count, an unparseable format), the baseline stays **empty** and the ratchet makes **no claim** — it does not guess a regression from a changed pass-count. The command exit status (above) remains the authority in that case; the ratchet is a strictly additive, name-the-regressions layer on top, not a replacement for it.

## Browser Evidence

For the live-drive protocol (how to actually drive a real browser) and the `--deep` + UI requirement, see `references/browser-evidence.md`.

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
- **Supersede a changed-mind lesson.** When a newer lesson contradicts or replaces an older rule (you changed your mind, or a broader rule subsumes it), do not leave both to compete — fold the old one into the new entry, or annotate the old entry's title with `(superseded by <date / short title>)` so it is visibly retired. Prefer one current rule over two conflicting ones.
- **Auto-expire a resolved one-time failure.** When the prerequisite behind a one-off environment/tooling failure is later satisfied (the missing runtime is installed, the directory is now a git repo, the worktree exists), the lesson no longer applies — drop it, or annotate its title with `(expired)` so a stale environment glitch stops biasing future runs.
- Keep newest first and keep each surviving entry's prevention rule and tags intact.

Consolidate as part of the write step when you notice overlap; do not let the file grow unbounded and rely on the digest cap to hide it. The SessionStart digest **skips any entry whose title ends with an `(expired)` or `(superseded …)` marker** (`hooks/load-failure-memory.js`), so a retired lesson stops being injected even before the next write deletes it — put the marker at the **end of the `###` title line** (a mid-title mention like "do not log (expired) creds" is deliberately not treated as retired) so the digest can see it.

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
- **Self-protect the whole `output/udflow/` tree (footgun guard).** The first time a run writes anything under `output/udflow/` (ledger, evidence, review diff, screenshots), create a **top-level** `output/udflow/.gitignore` with `*` then `!.gitignore` — this ignores the **entire** artifacts tree in one place, so a user can never accidentally commit run residue or a screenshot that may carry secrets/PII (`references/browser-evidence.md`, *Data sensitivity*). This subsumes the per-subdir `.gitignore`s below (they remain valid for older trees; the top-level one is the guarantee). Before finishing, if `output/udflow/` holds artifacts but is **not** covered by gitignore (the file is missing, or git still tracks paths under it — `git check-ignore -q output/udflow/<f>` fails, or `git status` shows them), surface a one-line **hygiene warning** in the report so the user fixes it before committing.
- Screenshots / evidence **referenced by the final report** (e.g. under `output/udflow/evidence/`) are **kept evidence artifacts**, not throwaway scaffolding to delete; create `output/udflow/evidence/.gitignore` (rule: `*` then `!.gitignore`, so the ignore file itself commits and travels) so they are never committed (the relative report links resolve only on the local working tree). They **may contain secrets / PII** (`references/browser-evidence.md`, *Data sensitivity*) — do not paste a report embedding them into a public PR / issue.
- A **large filtered review diff** the orchestrator hands to reviewers as a file (see `references/review-packet.md`, *Changed diff (filtered)*) lives under `output/udflow/review/` — same posture as evidence: a **kept run artifact**, gitignored via its own `output/udflow/review/.gitignore` (`*` then `!.gitignore`), never committed into a distributed tool/plugin repo. It can contain source under review, so treat its distribution like the report's.
- Do not commit the workflow's own runtime output (e.g. `FAILURE_MEMORY.md`) into a tool/library/plugin repository that gets distributed. Failure memory belongs in the project that *uses* the tool, not in the tool's own source tree; in a distributed package it is residue that ships to every user.

## Final Output Contract

The end-of-run report format lives in `references/final-report.md` (loaded at final delivery).
