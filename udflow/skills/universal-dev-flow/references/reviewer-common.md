# Reviewer Common Contract

Rules shared by every review subagent (`spec-reviewer`, `test-reviewer`, `code-reviewer`, `security-reviewer`, `architecture-reviewer`, `operability-reviewer`, `ui-ux-reviewer`). Each reviewer file keeps its own persona and domain focus; this file is the single source of truth for what is identical across all of them, so the same wording is not repeated in every agent.

A spawned reviewer runs in an isolated context and cannot reach this file by its relative path, so the contract is **delivered to it inside the Review Packet**: the orchestrator copies the "Shared reviewer contract" block (severity vocabulary, scope discipline, base output) from `review-packet.md` into each reviewer's handoff. This file is the single source of truth that block is kept in sync with; it is not loaded by the reviewers at runtime.

## Severity vocabulary

- All reviewers report findings as `blocker` / `major` / `minor`.
- Only `gatekeeper` issues a readiness verdict (`READY` / `FIX REQUIRED` / `NOT READY`). Reviewers do not emit a separate PASS / CONCERNS / BLOCK verdict.
- **blocker**: clearly incorrect, materially unsafe, or otherwise release-blocking within the reviewer's discipline.
- **major**: should be fixed before the work is considered ready, but not an outright block on its own.
- **minor**: worthwhile cleanup or polish; not release-blocking.

## Shared scope discipline

- **Non-mutating: inspect, don't change.** A reviewer holds `Read`/`Grep`/`Glob`/`Bash` but not the editor tools. Use `Bash` for **read-only inspection only** — `git diff`/`git log`/`git show`, `rg`, and read-only build/test/lint runs to gather evidence. Do **not** modify the working tree, write or delete files, change git state, or run state-changing commands. Reviewers *propose* the smallest safe fix; applying it is the `implementer`'s job. ("read-only" is enforced by this instruction and the absence of editor tools, not by a sandbox.) When inspecting, filter noise, not signal — run at minimal verbosity and pull only the decision-relevant output for the content type (diffs → the changed hunks; tests/builds → the failing assertion + first failing frame; logs → error lines + context; searches → `rg -l`/`-c` to locate, then pull context); never drop detail you need to judge correctness.
- **A provided filtered diff is a starting point, not a cap.** When the Review Packet includes a filtered/capped diff, it also states what was trimmed and the exact command to regenerate the same-scoped full diff; keep full Read/Grep freedom — follow that pointer (or read the surrounding code) whenever the diff is insufficient, as omissions and cross-file issues usually require.
- Review only the scope actually selected for the task; match severity to real behavioral/risk impact.
- Be thorough within scope, but do not invent unrelated concerns.
- If the task is materially underspecified within the reviewer's discipline, say so explicitly.
- If the reviewer's discipline has no material impact on the task, mark it not applicable rather than manufacturing findings.

## Defect-detection discipline

These reduce real misses without inviting noise — every rule is gated on a concrete failure case or an implied contract, so it does not license speculation.

- **Judge code on its merits, not its pedigree.** Do not assume code is correct because it looks idiomatic, canonical, matches a well-known library, or appears intentional — familiarity and provenance are not evidence. A defect is real only if you can name a concrete input or condition under which the code yields a wrong result, a leak, a crash, or a contract violation; when you can, report it.
- **Rate severity by impact, not by how established the code looks.** Once you have a concrete failure case, set severity from its consequence (data loss / security / crash / wrong result ⇒ `blocker`/`major`). Do not downgrade a demonstrated defect to `minor` just because the code is old, common, or "accepted".
- **Look for omissions, not only wrong lines.** Compare what the code does against what its name, signature, docstring, and the requirement imply it must do, and flag what is missing — an unhandled case, a cleanup that should pair with a create/delete, a guard/limit/validation the contract requires, a value (length, default, header) that should be set. Anchor every omission finding to that implied contract; do not speculate beyond it.
- **Evaluate against the acceptance criteria when present.** When the Review Packet lists numbered user-approved acceptance criteria, judge coverage against each within your discipline and flag any not demonstrably met (the `gatekeeper` makes the final per-criterion ruling).
- **Reason in the target language's real semantics.** Evaluate the code under how this language actually handles truthiness/equality, value-vs-reference (and receiver) semantics, string/byte/encoding distinctions, ownership/lifetimes, and numeric overflow — not as generic pseudocode.
- **Enumerate; do not stop at the first finding.** A single pass tends to surface only the most salient defect. Keep scanning the whole scope for additional independent defects — finding one real issue is not a reason to conclude the rest is correct.

## Shared output contract

Every reviewer reports at least:

- Scope reviewed
- Findings by severity (`blocker` / `major` / `minor`), each as one compact line — `severity` · `file:line` (or contract/component/path) · the concrete failure or violated contract · smallest safe fix — not a prose paragraph; reference code by `path:line` rather than restating it, and do not echo the diff or file contents already provided in the packet (expand to prose only where one line would lose evidence)
- Recommended corrections

Each reviewer file lists any additional domain-specific output fields on top of this base.
