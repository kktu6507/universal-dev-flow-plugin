# Evidence log

This file is the **single source of truth** for udflow's empirical track record and for deciding when the
**"experimental"** label can be dropped. The README's status banner summarizes it; the numbers below are
authoritative.

It is a manual log on purpose: udflow ships **no telemetry** and does not report usage anywhere (good for
privacy, but it means runs only "count" if they are written down here). Anyone can add an entry via pull
request.

## What counts (strict)

A data point counts toward graduation **only if it has a verifiable ground truth and is recorded here.**

- **Type A — blind bug-catch.** A *known* historical bug is presented to udflow's reviewer(s) **blind**
  (pre-fix code only; no fix, issue, or repo access), and an independent judge scores the findings against
  the known defect. Unit = one bug.
- **Type B — verified live task.** A real udflow run on actual work where the outcome was **verified**
  (e.g. its `READY` verdict held up, or escaped defects were later found and recorded). Unit = one task.

**Does NOT count toward the rates:** testimonials, "I used it and liked it", stars, install counts. These are
adoption signals — log them under [Adoption](#adoption-not-counted-toward-graduation), separate from the rates.

This applies equally to the maintainer's runs and to contributors' runs — the gate is *verifiable ground
truth*, not *who ran it*.

## Graduation criteria

Drop the **"experimental"** label when this file documents **all** of:

1. **Breadth** — ≥ 3 distinct external repositories, across ≥ 2 languages.
2. **Volume** — ≥ 20 qualifying data points (Type A bugs and/or Type B tasks).
3. **Anti-bias + measured** — aggregate catch-rate and false-positive-rate are computed, and **≥ half of the
   bug data points are bugs that were NOT previously surfaced by a prior review** (so the sample isn't
   skewed toward "already known to be catchable").

## Running tally

| Metric | Now | Target |
|---|---|---|
| External repos | **6** (Plan_PJ, axios, requests, gson, gin, clap) | ≥ 3 ✓ |
| Languages | **6** (C#, JS, Python, Java, Go, Rust) | ≥ 2 ✓ |
| Qualifying data points | **32** | ≥ 20 ✓ |
| Not-previously-review-found bugs | **29 / 32** | ≥ half ✓ |
| Catch rate | 11 hit + 5 partial / 32 (**34% hit; 50% touched**) | (reported, not a pass/fail) |
| False-positive rate | **0** across the 32-bug single-reviewer corpus (**1** total across ~90 reviews incl. panel re-tests) | (reported) |

**Status: graduation criteria are MET** (≥3 repos ✓, ≥2 languages ✓, ≥20 points ✓, anti-bias ✓, rates documented ✓). The README still labels udflow "experimental" pending the maintainer's call on relabeling, because — honestly — recall is modest (34%); the validated edge is **precision (near-zero false positives) + structural depth**, not single-pass recall. Recommend relabeling to a *characterized* "beta" that states this profile rather than dropping the caveat outright.

## Entries

### Run 1 — 2026-06-19 · Plan_PJ (C#/.NET) · retroactive blind bug-catch

Method: pre-fix code of 8 real fixed bugs, extracted to packets outside the repo (the repo's own
`docs/gstack-review-report.md` documents some of them, so reviewers were barred from reading the repo).
Round 1 = single reviewer; Round 2 = full panel (hit if any panelist catches it). Independent judge scored
each against the known defect. **Result: 6 hit / 1 partial / 1 miss · 0 false positives** (~46 findings;
~40 extra plausible-but-unverified).

| Bug | Defect | Reviewer(s) | Review-found before? | Verdict | FP |
|---|---|---|---|---|---|
| B3 | `HttpResponseMessage` never disposed (resource leak) | code | yes (infra review) | **hit** | 0 |
| B4 | unbounded text written to a `nvarchar(4000)` column | code | yes | **hit** | 0 |
| B5 | raw escaped JSON dumped into a search index | code | no | **hit** | 0 |
| B6 | flat iteration cap (20) violates per-role spec | spec | yes (gstack C-2) | **hit** | 0 |
| N1 | UI count never refreshes during a background job | code + operability + ui-ux | no | **hit** | 0 |
| N3 | form validator is a no-op (model has no attributes) | security + code + spec | no | **hit** | 0 |
| B1 | missing cascade-delete of a child table (orphans) | code → code+arch+test | no | **partial → miss** | 0 |
| B2 | file stats count binary/empty/oversized files | code → code+test+spec | no | **miss → miss** | 0 |

Key finding: caught all 6 **concrete, code-visible** defects (resource/persistence/data-quality/spec/UI/validation),
0 false positives. Missed the 2 **omission-vs-intent** defects (a missing delete; stats that should exclude
binaries) — and a full 3-reviewer panel did **not** help, which says the lever is feeding reviewers the
intent/spec/plan, not adding reviewers. Limits: single repo/language; bugs from `fix` commits (3/8 previously
review-found); no concurrency/integration bugs tested; reviewers got no plan/requirements context, which
**understates** a full udflow run.

### Run 2 — 2026-06-19 · axios (Node/JS) · retroactive blind bug-catch

Method: same blind method, but a **single `code-reviewer`** per bug (the conservative floor — no panel, no plan/spec context). 5 real fixed bugs, all from issue/PR fixes (none previously review-found). Independent judge scored each.
**Result: 1 hit / 2 partial / 2 miss · 0 false positives** (~16 findings; 6 extra plausible).

| Bug | Defect | Verdict | FP |
|---|---|---|---|
| AX5 | `new URL(path-only, undefined)` throws in Node when `socketPath` is set | **hit** (blocker) | 0 |
| AX3 | error-code array-index `[...][floor(status/100)-4]` → `undefined` for status ≥ 600 | **partial** (found it, rated minor) | 0 |
| AX4 | data-URI parsing regex does not match RFC 2397 | **partial** (grazed one symptom) | 0 |
| AX1 | regular `function` loses the enclosing `this` (needs an arrow) | **miss** (declared file correct) | 0 |
| AX2 | progress reducer reads `e.loaded` without guarding a malformed event | **miss** (found a *different* minor) | 0 |

Lessons: the **single-reviewer floor on unfamiliar, subtle code is low** (1/5 clean) — versus Run 1's 6/8 with panels and code-visible bugs. But **0 false positives held** on a different repo and language. Weak spots blind: language idioms (`this`), domain-knowledge bugs (RFC/dependency behavior). Note AX3 — the reviewer *found* the defect but under-rated its severity (→ partial), a calibration gap, not blindness. The single reviewer + absent plan/spec context understate a full udflow run.

### Run 3 — 2026-06-19 · cross-language (Python / Java / Go / Rust) · retroactive blind bug-catch

Same blind method, single `code-reviewer`, **complete-function** packets, excerpt-aware prompt. Four new external repos:

| Lang (repo) | n | hit | partial | miss | FP |
|---|---|---|---|---|---|
| Python (psf/requests) | 7 | 3 | 0 | 4 | 0 |
| Java (google/gson) | 4 | 0 | 1 | 3 | 0 |
| Go (gin-gonic/gin) | 5 | 1 | 0 | 4 | 0 |
| Rust (clap-rs/clap) | 3 | 0 | 1 | 2 | 0 |

Combined with Run 1 (C#, 8) + Run 2 (JS, 5): **6 languages, 32 bugs → 11 hit / 5 partial / 16 miss, 0 FP**. The single-reviewer floor (the 5 single-reviewer languages, 24 bugs) is ~5 hit / 4 partial; C#'s stronger Run-1 number used reviewer panels.

**Failure modes (consistent across languages):** (1) rationalizing a real defect as "canonical / upstream / intentional / standard" and dismissing or under-rating it; (2) severity under-rating (found it, called it minor); (3) omission / "missing behavior vs intent" misses; (4) subtle language-idiom misses (truthiness, char-vs-byte, value-vs-reference receiver, lifetimes, overflow). Reviewers stayed high-precision and often found *other* genuine bugs while missing the planted one.

**Harness honesty note:** the first Python attempt was contaminated by crude line-window packet extraction (it cut functions mid-statement, so reviewers spent attention on truncation artifacts and produced 1 spurious false positive). Fixed by extracting **complete functions/whole files** + an excerpt-aware prompt ("treat undefined externals as correct; review only logic"), then re-run — the numbers above. The error was in the test harness, not udflow.

### Tuning experiment — 2026-06-19 · language-neutral fixes + revalidation

From the failure modes, derived a **language-neutral** "defect-detection discipline" (judge-on-merits-not-pedigree / severity-by-impact / look-for-omissions / reason-in-the-target-language's-real-semantics) and added it to the shared reviewer contract. Revalidated on the 13 held-out misses:

| Re-test of 13 misses | hit | partial | miss | FP |
|---|---|---|---|---|
| single reviewer **+ discipline** (Phase D) | 0 | 1 | 12 | 0 |
| 3-reviewer **panel + discipline** (Round 2) | 2 | 2 | 9 | 1 |

Plus 3 clean controls (fixed code re-reviewed with the discipline): **0 false positives** — the tuning does not re-flag correct code.

**Conclusion:** the prose discipline is **safe** (0 added FP, controls clean) but does **not** lift single-reviewer recall — stronger wording cannot make a lone reviewer catch a subtle idiom/omission/domain bug. The **panel** (a structural mechanism) recovers defects prose cannot, at high precision. Shipped (v0.9.0): the discipline (as a safe guard-rail) **plus** recall-vs-precision guidance steering catch-critical work to the panel / Deep Mode / intent context. The recall lever is structural, not reviewer prose.

## Adding an entry

Append a new `### Run N — date · repo (language) · type` section with a table like Run 1's, then update the
**Running tally**. For Type A, state how ground truth was established and how leakage was prevented. For
Type B, state how the outcome was verified. Contributors: open a PR adding your section.

## Adoption (not counted toward graduation)

Testimonials, stars, install counts, and "it worked for me" reports go here. They show interest, not a
measured catch/false-positive rate, so they do not move the graduation tally.

_(none recorded yet)_
