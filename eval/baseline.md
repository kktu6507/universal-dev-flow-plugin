# Behavioral regression baseline

Last run of the `eval/fixtures/` suite (method: `README.md`).

- **Date:** 2026-06-28
- **Reviewer under test:** `udflow:code-reviewer` on `claude-opus-4-8` — blind (shown only intent + code).
- **Independent judge:** a separate agent on `claude-opus-4-8` (separate context + prompt). Same model
  *family* — same-model judging is a known caveat (`ARCHITECTURE.md`, *Honest limits*); acceptable for a
  suite that measures **change over time**, not absolute truth.

## Scores

| Metric | Result |
|---|--:|
| **Hit recall** — with-bug fixtures the reviewer *should* flag | **5 / 5** |
| **Clean precision** — correct controls with **no** false blocker/major | **2 / 2** |

| Fixture | Expected | Result |
|---|---|---|
| `01-js-missing-return` | hit | ✅ hit |
| `02-py-off-by-one` | hit | ✅ hit |
| `03-go-nil-before-check` | hit | ✅ hit |
| `04-py-mutable-default` | hit | ✅ hit |
| `05-js-foreach-await` | hit | ✅ hit |
| `06-clean-js-guard` | clean | ✅ clean (no FP) |
| `07-clean-py-bounds` | clean | ✅ clean (no FP) |

## How to read it

5/5 + 2/2 means the current reviewer catches these well-formed, in-scope defects and stays precise on the
controls — a healthy **tripwire** state, **not** a real-world recall claim (small, partly-synthetic set;
real-world numbers + caveats live in `EVIDENCE.md`). After a reviewer/agent prompt edit, re-run and
compare: a **clear, repeated** drop in hit recall, or **any** false positive on a `clean` control, is a
regression to investigate before merging. Expect minor run-to-run variance (the core is non-deterministic).

## Stability (same-input variance)

A same-input run — each fixture reviewed **K=5** times (blind), 2026-06-28, `claude-opus-4-8` — was
**35/35 consistent, 0 flips** (every fixture returned its expected result on all 5 runs). Caveat: these
fixtures are *deliberately clear-cut*, so this measures the **best-case** stability — genuinely
ambiguous/subtle cases vary more (see `ARCHITECTURE.md`, *Verdict stability*). The verdict's deterministic
anchors (test exit status, acceptance criteria) are what to lean on; the judgment layer is advisory.

## How to re-run

Drive [`fixture-eval.workflow.js`](fixture-eval.workflow.js) via the Workflow tool (it reads each
`fixtures/*.md`, blind-reviews with the current `udflow:code-reviewer`, scores with an independent judge,
and reports `hit recall` + `clean precision`). Then update this file with the new scores + date + model.
