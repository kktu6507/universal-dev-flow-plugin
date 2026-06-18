# Verification Gate

Verification is required before final readiness claims. A statement like "should work" is not evidence.

## Command Evidence

Run the narrowest meaningful checks for the task:

- Backend/general: the repo's build, test, and lint commands for its stack — e.g. `dotnet build`/`dotnet test` (.NET), `npm`/`pnpm` scripts (Node), `pytest`/`ruff` (Python), `go build`/`go test` (Go) — or repo-specific focused commands when stricter.
- Frontend/UI: package install when needed, build, test, lint, typecheck, and browser evidence when browser-visible.
- Data/config/deployment: migration validation, schema guard, config checks, deployment or rollback evidence when feasible.
- Additional focused tests when the changed path has targeted suites or scripts.

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

Read before non-trivial implementation:

1. `ai/FAILURE_MEMORY.md` when it exists.
2. `~/.claude/FAILURE_MEMORY.md` otherwise, including consolidated groups.

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
- **Scope**: project-specific or cross-project.
- **Recurrence**: note and increment if this lesson recurs (e.g. "seen again 2026-06-19").
```

When appending to an existing file, reuse its headings exactly; do not introduce a competing schema. Mark recurrences on the existing entry instead of creating a duplicate.

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
