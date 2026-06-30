# Behavioral regression fixtures

A small, **committed, hand-validated** suite that catches **reviewer prompt-drift**: if an edit to a
reviewer/agent prompt quietly degrades the `code-reviewer` (misses a defect it used to catch, or starts
raising a false positive on correct code), re-running this suite surfaces it. It is the *behavioral*
counterpart to the `5f` literal-presence guard (which only checks that machine literals survive an edit).

## What this is — and is NOT

- **It IS** a controlled regression signal. Each fixture is **self-contained and committed** (the buggy
  code lives here, in version control), so there is **no extraction noise** — the failure mode that made
  the ad-hoc web benchmark unpublishable (`EVIDENCE.md`, *Capability validation*). Stable, repeatable.
- **It is NOT** a real-world recall benchmark. The set is small and partly synthetic; it measures
  **stability against prompt edits**, not a real-world catch rate. The real-world numbers (with all their
  caveats) live in `EVIDENCE.md`'s Type-A section.

## Fixture format

One markdown file per case under `fixtures/`, with YAML frontmatter:

- `id`, `lang`
- `expected`: `hit` (the reviewer *should* flag the defect) or `clean` (correct control — the reviewer
  must NOT raise a confident blocker/major; minor style notes are fine)
- `defect`: the ground-truth defect (for `hit`), or why it's a clean control

…followed by an **Intent** line (the contract) and the code in a fenced block. The reviewer is shown only
the **intent + code** (blind); the **judge** additionally sees `expected` + `defect`.

## How to run (on demand — not CI)

The reviewer is a Claude subagent, so this costs model tokens and is **not** a per-commit CI gate; run it
**when you change a reviewer/agent prompt** (or periodically). The protocol mirrors the Type-A method:

1. For each fixture: hand the **intent + code only** to the current `udflow:code-reviewer` (blind — do not
   reveal the defect).
2. An **independent judge** (a different agent, not a udflow reviewer) scores the review against the
   fixture's ground truth: for `hit` → did it flag the defect? for `clean` → did it avoid a false
   blocker/major?
3. Tally `hit` recall and `clean` precision; compare to `baseline.md`.

A `Workflow` script can drive this (read each `fixtures/*.md` → blind review → independent judge →
compare to `expected`). Record the run in `baseline.md`.

## Regression discipline

- **Re-run after any reviewer/agent prompt change.** A drop in `hit` recall, or a new false positive on a
  `clean` control, is a **regression** to investigate before merging.
- Expect some run-to-run variance (the core is non-deterministic); treat a **clear, repeated** drop as the
  signal, not a single off run.
- Adding fixtures is encouraged — keep them self-contained, with an unambiguous `expected` and `defect`.

## Baseline

Last recorded scores, the model, and the date are in [`baseline.md`](baseline.md).

## Model provenance

The recall/false-positive numbers here and in `EVIDENCE.md` are driven mainly by the **model**, not the
reviewer prompts (`EVIDENCE.md`, *2026-06-29 run*: the old prompts on the current model score the same as
the current prompts). So a model upgrade/downgrade is the single biggest reason these numbers might no
longer hold. `check-model-provenance.mjs` is a deterministic, repo-root maintainer tool — **not** a shipped
hook (`eval/` never ships in the distributed `udflow/` plugin tree) — that flags a mismatch between the
model you're about to rely on and the model `baseline.md` was last validated against:

```
node eval/check-model-provenance.mjs --model <model-id>
```

Fail-open and advisory only: a missing/unparseable baseline or no `--model` reports `UNKNOWN` (no claim),
never a guessed match. On a `MISMATCH`, re-run this suite and the `EVIDENCE.md` Type-A refresh before
trusting the published numbers for the new model.
