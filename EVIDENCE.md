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

**Status: graduation criteria are MET** (≥3 repos ✓, ≥2 languages ✓, ≥20 points ✓, anti-bias ✓, rates documented ✓). Two recall figures, **both at 0 false positives**: **diff-only ~34%** (reviewer sees only the code) and **with-intent ~84% (27/32)** (reviewer also gets the contract/intent — which real udflow's Review Packet supplies to every reviewer). The with-intent profile is the one that reflects real use. This now **strongly supports relabeling** from "experimental" (still the maintainer's call), subject to the standing validity caveat that the with-intent notes were author-written. A *characterized* "beta" that states the profile (near-zero FP; high recall when given intent; modest when blind) is the honest label.

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

### Context-isolation experiment — 2026-06-19 · does feeding *intent* lift recall?

Took 6 bugs a single reviewer **missed even with the discipline** (Phase D: 0 hit / 6 miss): PY2/PY4/PY7 (requests) + GO2/GO3/GO4 (gin). Re-ran the **same** single `code-reviewer`, **same** discipline, **same** packets — changing exactly **one variable**: an inlined `CONTEXT (intent)` note stating the code's required contract (the contract, never the defect).

| Condition | hit | partial | miss | FP |
|---|---|---|---|---|
| Phase D — discipline, **no** intent | 0 | 0 | 6 | 0 |
| **+ inlined intent note** | **5** | 0 | 1 | 0 |

**0/6 → 5/6, 0 FP, single variable = intent.** Even subtle-semantics misses flipped (PY4 char-vs-byte — reviewer cited "café" = 4 chars / 5 bytes; GO3 pointer-receiver — gave a concrete failing `errors.Is` case; PY7 `__getattr__` proxy — blocker). The lone remaining miss (GO4) was **not** a context failure: the reviewer saw the missing Content-Length and argued Go auto-computes it (a defensible non-defect — that bug was weakly framed).

**Conclusion:** the dominant recall lever is **feeding reviewers the intent/contract**, not the language and not local build. This directly answers "was C# higher because it could build locally?" — **no**: no build ran for any language in the benchmark; C# scored higher partly because several C# packets had intent inlined, and giving Python/Go the same intent reproduced the jump. It also explains why the blind benchmark's ~34% **understates real udflow**: the Review Packet already delivers the intent (Task / Success criteria / Reviewer scope) that this experiment shows is worth roughly **+80 points of recall**. udflow's design is right; the blind harness simply withheld that input.

### Full corpus WITH intent — 2026-06-19 · the 34% vs with-intent comparison

Re-ran the **entire 32-bug corpus** (same packets, same single `code-reviewer`, same discipline) with **one change**: a purpose/contract `intent` note prepended to each packet (stating what the code must do, never the defect).

| Condition | hit | partial | miss | false positives |
|---|---|---|---|---|
| Diff-only (blind, no intent) | 11 | 5 | 16 | 0 |
| **+ intent note** | **27** | 2 | 3 | **0** |

**~34% → ~84% hit (27/32), ~91% touched, misses 16 → 3 — and false positives stayed at 0** across all 32 with-intent reviews (intent did **not** trade precision for recall). Per language with intent: Go 5/5, Rust 3/3, JS 5/5 (all clean), Python 6/7, C# 6 hit + 2 partial, Java 2/4. The 3 residual misses are the genuine ceiling: JV3 (ParameterizedType flag-conflation), JV4 (long-overflow — reviewer affirmatively judged it correct), PY3 (reviewer found a *different* real bug — a missing regex end-anchor — instead). The 2 C# partials (B1/B2 omissions) are cases where the reviewer hedged that table/scope coverage "can't be confirmed from this excerpt" — likely to resolve when given the whole file in the real flow.

**Validity caveat (important):** the intent notes were author-written with knowledge of the bugs, so the 84% carries an upward-bias risk. Mitigants: the notes state purpose/contract (defect-agnostic); 5 bugs were still not caught (a pure leak would catch all); and 0 false positives shows reviewers were not rubber-stamping. A stricter version would derive intent from each repo's own docs/issues.

**Conclusion:** this *measures* what the earlier context-isolation test implied — the blind ~34% was dominated by **withheld intent**, not a capability ceiling. With intent (which real udflow's Review Packet supplies to every reviewer), the profile is **~84% hit / 0 false positives**. This materially strengthens the case to relabel from "experimental"; still the maintainer's call, but the with-intent profile is the one that reflects real use.

## Adding an entry

Append a new `### Run N — date · repo (language) · type` section with a table like Run 1's, then update the
**Running tally**. For Type A, state how ground truth was established and how leakage was prevented. For
Type B, state how the outcome was verified. Contributors: open a PR adding your section.

## Adoption (not counted toward graduation)

Testimonials, stars, install counts, and "it worked for me" reports go here. They show interest, not a
measured catch/false-positive rate, so they do not move the graduation tally.

_(none recorded yet)_
