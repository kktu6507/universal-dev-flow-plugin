# Evidence log

This file is the **single source of truth** for udflow's empirical track record and for deciding when the
**"experimental"** label can be dropped. The README's status banner summarizes it; the numbers below are
authoritative.

It is a manual log on purpose: udflow ships **no telemetry** and does not report usage anywhere (good for
privacy, but it means runs only "count" if they are written down here). There are two ways to contribute:
open a **["Verified udflow run"](.github/ISSUE_TEMPLATE/verified-run.yml)** issue (the maintainer curates
accepted ones into this file), or add a section directly via pull request. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Two kinds of evidence (and which one matters most)

- **Real-world runs (Type B) — the headline this log is built around.** A real udflow run on actual work
  where the outcome was **verified over time** (its `READY` verdict held up, or a defect escaped and was
  recorded; plus any false alarm and the cost). This is the evidence that shows udflow *works in practice* —
  and it is what dropping "experimental" now hinges on. **It is currently sparse**: udflow has not yet been
  used on many *logged* real projects, so this section is honestly near-empty and grows with real usage.
- **Capability validation (Type A) — controlled benchmarks.** Blind bug-catch experiments that characterize
  *what the reviewers can and cannot catch* and the precision profile. This is extensive (below), but it is a
  **proxy** for real use, not proof of it — a controlled measurement of the reviewers' reach, not a record of
  udflow building real software.

## What counts (strict)

A data point counts **only if it has a verifiable ground truth and is recorded here.**

- **Type B — verified live task.** A real udflow run on actual work whose outcome was **verified** (the
  `READY` verdict held with no defect escaping later, or escaped defects were found and recorded). Unit = one
  task. *This is the evidence the log is for.*
- **Type A — blind bug-catch.** A *known* historical bug is presented to udflow's reviewer(s) **blind**
  (pre-fix code only; no fix, issue, or repo access), and an independent judge scores the findings against
  the known defect. Unit = one bug. *Capability validation, not real-use proof.*

**Does NOT count toward the rates:** testimonials, "I used it and liked it", stars, install counts. These are
adoption signals — log them under [Adoption](#adoption-not-counted-toward-graduation), separate from the rates.

This applies equally to the maintainer's runs and to contributors' runs — the gate is *verifiable ground
truth*, not *who ran it*.

### Verification tiers

udflow ships no telemetry and many runs happen on private code, so a run's *verifiability* varies — label
it rather than blur it:

- **Publicly verifiable** — a public repo with a PR / commit link the maintainer can independently inspect
  (verdict, findings, and the follow-up outcome are all checkable). The strongest evidence.
- **Self-attested (private)** — a private or proprietary run shared as a sanitized stack + outcome, with no
  independently-checkable artifact. It still counts, but is **marked self-attested** and leaned on less for
  the headline rates; the breadth (≥3 projects) and non-maintainer (≥1) requirements keep any single source
  from dominating.

New `### Live run N …` entries are tagged with their tier. The first three logged below are maintainer
**self-attested** (private); **Live run 4 is the first publicly verifiable** (a public-repo PR) — but all four
are maintainer runs, which is exactly why the ≥3-projects breadth and the ≥1 non-maintainer requirement remain open.

## Graduation criteria (two tracks)

**Track 1 — Capability validation: MET.** ≥3 external repos ✓, ≥2 languages ✓, ≥20 qualifying Type-A points ✓,
aggregate catch/false-positive rates computed ✓, and ≥half of the bugs not previously surfaced by a prior
review ✓. This establishes the *profile* (near-zero false positives; recall that scales with intent specificity).

**Track 2 — Real-world validation: NOT yet met.** Drop **"experimental"** only once this file also documents
real-use evidence:

1. **Volume** — ≥ 10 verified Type-B live runs.
2. **Breadth** — across ≥ 3 distinct real projects.
3. **Independence** — at least some runs **not** by the maintainer (so it isn't only self-dogfooding).
4. **Outcome quality** — each run records the verdict, whether it **held up** afterward, any escaped defect,
   any false alarm, and cost — so a real-use precision / reliability picture can be stated.

Rationale: the controlled benchmark already tells us *what the reviewers can catch*; only real runs tell us
whether the **workflow + verdict** holds up in practice, which is the claim the label is really about.

## Running tally

| Metric | Now | Track-1 target | Track-2 target |
|---|---|---|---|
| **Real-world verified runs (Type B)** | **5 logged** | — | ≥ 10 |
| — of which **publicly verifiable** (vs self-attested / private) | **2** | — | — |
| Distinct real projects (Type B) | **2 logged** (one private repo + udflow's own public repo) | — | ≥ 3 |
| Independent (non-maintainer) runs | **0** | — | ≥ 1 |
| External repos (Type A benchmark) | **~13** | ≥ 3 ✓ | — |
| Languages (Type A) | **6** (C#, JS, Python, Java, Go, Rust) | ≥ 2 ✓ | — |
| Qualifying Type-A points | **109** (32 curated + 77 automated) | ≥ 20 ✓ | — |
| Catch rate (Type A) | diff-only ~34% hit; automated bug-blind-intent (n=77) **~29% hit / ~39% touched**; ~84% only with specific author intent (upper bound) | (reported) | — |
| False-positive rate (Type A) | **~0** — 0 across the 32 single-reviewer corpus; **1 in 77** automated | (reported) | — |

**Status: capability is characterized; real-world validation is the remaining gate.** Track 1 (controlled
benchmark) is **met** and pins the profile: at **~0 false positives** throughout, recall depends on the intent
given to the reviewer — **~34% with no intent (diff only)**, **~84% only with very specific author-written
contract-level intent** (an optimistic upper bound; a strict bug-blind native-doc-intent re-run scored far
lower), and **~29% bug-blind at n=77**. The robust, condition-independent strength is the **near-zero
false-positive rate**. Track 2 (**real-world runs**) is **not yet met** — that is now the honest reason
"experimental" stays. The defensible relabel is a *characterized* "beta" ("near-zero FP; recall scales with the
quality of the intent you give it; real-world track record still accumulating"), to be earned by the Type-B
runs this log is built to collect — the **first five of which are now logged below (5 of ≥10)**, across **two
projects** (one private, plus udflow's own public repo) and now including **two publicly-verifiable** entries, so
the **≥3-projects breadth and the ≥1 non-maintainer run remain open**.

---

## Real-world runs (Type B)

The headline section: real udflow runs on actual work, with verified outcomes. **This is the evidence that
matters most** — and it is honestly near-empty today, because udflow has not yet been used on many *logged*
real projects. Every entry here moves Track 2 toward graduation.

> **Showcase — not a Type-B data point.** [`udflow-public-demo`](https://github.com/simba6507/udflow-public-demo)
> is a public, captured `/udflow:run` that *demonstrates the workflow* end to end (plan gate → risk-selected
> reviewers → gatekeeper verdict). It is a maintainer-authored demonstration, **not** verified-over-time
> real-world work, so it deliberately does **not** count toward the Type-B tally or graduation — it shows *what a
> run looks like*, not *that the verdict held up in production*. (Linked from the README so newcomers can watch
> the flow.)

**To add one:** run udflow on a real task, then open a
**["Verified udflow run"](.github/ISSUE_TEMPLATE/verified-run.yml)** issue (or PR a section directly). Use this
shape:

```
### Live run N — YYYY-MM-DD · <project / stack> (<language>) · verified live task · <publicly verifiable | self-attested (private)>

- Task: <what udflow was asked to do>
- Intent given: <the requirement / contract handed to udflow — how specific?>
- Reviewers: <which reviewers ran> · Verdict: <READY / FIX REQUIRED / NOT READY>
- Verification: <commands / browser checks / tests run>
- Caught: <real, valid findings udflow raised that you acted on — "saves">
- Missed: <defects found later, after the verdict — "escaped">
- False alarms: <findings that were not actually defects>
- Outcome after follow-up: <did the verdict hold? merged / reverted / fixed again?>
- Cost: <~tokens / wall-clock> · Evidence: <PR / commit / sanitized log>
```

### Live run 1 — 2026-06-19 · private C#/.NET 10 Blazor app · verified live task

- **Task:** apply an approved visual design ("Flat × Analytics-Dashboard palette × Minimal Swiss / Inter") across the entire Blazor Web frontend, with a working, persisted light/dark theme toggle. **Appearance-only** — no C# logic / route / auth / behavior changes. Invoked via the `universal-dev-flow` skill (maintainer's run).
- **Intent given:** highly specific (**contract-level**) — exact CSS token values (light/dark backgrounds, semantic colors), Inter + `Noto Sans TC` fallback, flat aesthetic (no glass/gradient), an enumerated list of ~13 pages + shared components that must all be covered, and explicit success criteria (build 0/0, existing contract tests green, a browser-smoke checklist).
- **Reviewers:** spec / test / code / ui-ux (4-reviewer panel) + gatekeeper ×2; security / architecture / operability correctly scoped out for a token/theme change. · **Verdict: FIX REQUIRED → READY** (one repair loop).
- **Verification:** `dotnet build` → 0 warn / 0 err; `dotnet test` → 13/13 pass (0 failed / 0 skipped); plus a real **browser smoke** (Chrome MCP on a local host: toggle re-themes every region, `localStorage` persisted, no FOUC on hard reload, CJK intact, nav/collapse preserved) → PASS.
- **Caught (saves — all real, fixed before merge):**
  - **MAJOR (spec):** dark mode only reached the shell + dashboard — ~15 components hardcoded light-only color literals → "light islands" + a dark-on-dark contrast failure; **missed the "whole frontend" requirement** — a real omission-vs-intent defect, the class the blind benchmark most often misses, caught here because the intent was specific.
  - **MAJOR (ui-ux):** light-mode amber warning color fails WCAG-AA as text (~3.2:1).
  - **MAJOR (gatekeeper):** 30 un-swept saturated status-text literals across 10 files fail AA in light mode (1.74–3.96:1) — a recurring class; **the gatekeeper withheld READY until it was actually fixed**, not merely claimed.
  - **Minors:** duplicate / dead tokens, an unthemed neutral badge, missing global `:focus-visible` ring, toggle `aria-pressed`, two pre-existing undefined CSS vars (judged out-of-scope → spun into a background task, later fixed).
- **False alarms: 0** — every major was a measured, real defect (contrast ratios computed; the out-of-scope finding was genuine and later fixed).
- **Missed:** none known at the verdict; the maintainer confirms the change was **not reverted and showed no regression** in follow-up use.
- **Verification-environment note (not a udflow defect):** *after* the READY verdict, during post-run commit, a leftover .NET test-host process (a terminated-but-unreaped zombie) locked the Web DLL and transiently blocked a rebuild (`MSB3021`); `taskkill` could not reap it — resolved via WMI `Win32_Process.Terminate` + `dotnet build-server shutdown`, after which the full gate re-ran green. This is the known .NET build-server / pipe-EOF environment issue (→ udflow v0.8.1 verification-gate note), not a missed code defect.
- **Outcome after follow-up: held up** — committed and **not reverted; the maintainer confirms no regression.**
- **Cost:** ~2 h 15 m wall-clock for the udflow phase; ~0.87–0.99M subagent tokens (largest single subagent ~199K / ~19 min). · **Evidence:** private repo — commit `e11b177f` (36 files), retained as the maintainer's internal index (not publicly linkable).

### Live run 2 — 2026-06-20 · private C#/.NET file-transfer system · verified live task (merged)

- **Task:** validate 7 review follow-ups from a prior merged PR and apply item #1 — remove an obsolete legacy allow-list restore path under the current DB-driven deny-list permission model — **without drifting from the original design**. Codex was enabled as an independent cross-model verifier. Invoked via the `universal-dev-flow` skill (maintainer's run, on an ordinary git branch — the session's opening git-worktree Q&A was abstract; the actual work used branching, **not** a worktree).
- **Intent given:** very specific — the approved plan named the exact decision (remove the obsolete restore path entirely), the precise per-file edits (a SQL migration + a PowerShell rollback script + a contract test), explicit "keep" items, and a numbered verification section with the criterion "executable on a standard deployment."
- **Reviewers:** spec / test / operability / security (4-reviewer panel) + gatekeeper, plus **Codex** (`codex-rescue`) as an independent verifier. · **Verdict: blocker found → fixed → READY** (repair loop).
- **Verification:** `dotnet build` → 0 warn / 0 err; `dotnet test` → 13/13 pass; plus an empirical replay of the PowerShell rollback against the real SQL confirming the guard literal matched and the confirm flag flipped (would-run = true).
- **Caught — the headline save:** a **BLOCKER that green build + tests missed** — a case-mismatch (`bit` vs `BIT`) between a SQL rollback script's confirmation-guard literal and the PowerShell deploy script that string-matches it; the match is **case-sensitive**, so the guard would always throw and **the rollback could never run**. spec + operability + security each surfaced it independently. (The external Codex verifier was blocked this run by a Windows-sandbox issue and contributed nothing — **udflow's own panel caught the blocker without it**.) Plus a minor: a cross-file casing-lock test added.
- **False alarms: 0** (udflow reviewers).
- **External-capability note (disclosed, not a udflow defect):** the external Codex verifier could not execute (Windows sandbox `CreateProcessAsUserW` failure) — the gap was disclosed and udflow continued; the panel still caught the blocker. Root-caused and fixed before the next run. No build-server / zombie / pipe-EOF incident in this session.
- **Outcome after follow-up: held up** — committed, **merged to `main`, and still in (not reverted)** — maintainer-confirmed. User accepted all findings.
- **Cost:** gatekeeper subagent ~34K tokens / ~3.4 min; part of a ~3.5 h multi-run session. · **Evidence:** private repo — commits `cb6c70f7` / merge `c37d41b7` (internal index, not publicly linkable).

### Live run 3 — 2026-06-20 · private C#/.NET file-transfer system · verified live task (merged)

- **Task:** a **verification-only / minimal-change** pass — "check whether `main` still has anything that needs fixing; list the risk points; don't over-diverge." Codex enabled as an independent reviewer. Same codebase (FTP transfer + file-watcher infrastructure), ordinary git branch.
- **Intent given:** explicitly scoped to "minimal or no change"; the work was then driven by an evidence-based residual-risk list (R1–R5) the reviewers produced, each with a concrete file:line and a stated fix; the user approved the "fix R1–R5" option.
- **Reviewers:** code / operability (read-only verification panel) + gatekeeper, plus **Codex** (`codex-rescue`) independent; spec / test / ui-ux correctly excluded (no new requirement / tests / UI). · **Verdict: a self-introduced major found in re-review → fixed → READY** (repair loop).
- **Verification:** multiple `dotnet build` (0/0) + `dotnet test` (13/13) cycles; one transient self-inflicted compile error caught by the build and fixed immediately.
- **Caught:**
  - **The panel's headline value:** in re-review, the udflow `code-reviewer` caught a **MAJOR regression the run had just introduced itself** — a `Task.Run(…, cts.Token)` still read the cancellation-token-source field **unlocked**, after a fix meant to serialize its swap under a lock; **the independent Codex reviewer had missed it.** A lone reviewer would have shipped it; the panel did not.
  - **Reviewer-conflict adjudication:** Codex raised a BLOCKER (a permission guard reusing a stale snapshot on DB-reload failure = "fail-open"); the gatekeeper read the code and **downgraded it to intentional fail-static design** (it reuses a previously-valid deny-list and never widens permissions) — accepted, no change. A conflict resolved by **code evidence, not by vote**.
  - Five residual-risk hardenings shipped (resource disposal on connect failure, a cancellation race, circuit-breaker counting of cancellations, a startup index-validation guard, a lock around a CTS swap).
- **False alarms: 0 confirmed** (the Codex "fail-open" blocker was a defensible-but-wrong reading, adjudicated on evidence; udflow reviewers clean).
- **Outcome after follow-up: held up** — committed, **merged to `main`, and still in (not reverted)** — maintainer-confirmed (PR #8; commit `2beafbbb` → merge `153e559d`). This run is what prompted updating the evidence log.
- **Cost:** gatekeeper subagent ~29K tokens / ~2.6 min; part of the same ~3.5 h session. · **Evidence:** private repo — commits `2beafbbb` / merge `153e559d` (internal index).

### Live run 4 — 2026-06-26 · `universal-dev-flow-plugin` (udflow's own repo — Markdown / Node JS) · verified live task (merged) · **publicly verifiable**

- **Task:** implement points 1–4 of a `headroom`-vs-udflow design comparison into udflow's **own** contract reference files — a filtered-diff retrieval pointer, per-content-type "filter noise" recipes, a cache-friendly context-ordering principle, and a tagged cost-estimate-basis rule — plus the 0.22.0 version bump + CHANGELOG. **Spec/docs-only** (no code / hook / machine-token change). Invoked via `/udflow:run --deep` (maintainer's run).
- **Intent given:** **contract-level** — six numbered acceptance criteria with exact before/after strings per edit; a Plan subagent adversarially pre-tested the design and caught three defects *before* implementation (an existing byte-drift between two synced clauses, a CI-guarded fence line that must not be edited, and the correct reference-file home for each principle).
- **Reviewers:** spec / test / architecture panel + **adversarial verification** of blocker/major findings + gatekeeper at maximum effort; code / security / operability / ui-ux correctly scoped out (no code, security surface, runtime/ops, or UI). · **Verdict: READY** (first iteration — 0 blocker/major survived adversarial refutation).
- **Verification:** `node --test` → 128 pass / 0 fail / 2 environment-conditional skips (exit 0); `node .github/scripts/validate-structure.mjs` → pass (compact-fence guard, version parity, CHANGELOG entry, bilingual README parity, U+FFFD text-integrity); `claude plugin validate .` and `claude plugin validate ./udflow` → both ✔; GitHub CI (validate × macOS / Ubuntu / Windows) → all green.
- **Caught (saves):** 1 × **minor** — the new cost-basis prose asserted the grand total "inherits `estimate`", which a literal reader could read as mismatching the unchanged full-report Total-row `Source` literal `observed + estimate`; the wording was reconciled so the rule matches its own template. (Design-phase saves by the Plan pre-review: the byte-drift, fence-line, and placement issues above — fixed before any edit landed.)
- **False alarms: 0** — no blocker/major was raised falsely; the panel's only gating output was the single real minor.
- **Missed:** none known at the verdict — to confirm in follow-up use.
- **Outcome after follow-up:** **merged** (PR #28, merge commit `b0188ef`) and auto-released as **`v0.22.0`**; whether the verdict holds long-term is **to be confirmed** over time.
- **Cost:** ~199K new tokens (observed: implementer ~56K + deep panel ~142K; the orchestrator main-thread figure is an estimate) · **Evidence:** public — PR https://github.com/simba6507/universal-dev-flow-plugin/pull/28 · commit `04276ff` · release `v0.22.0`.

### Live run 5 — 2026-06-26 · `universal-dev-flow-plugin` (udflow's own repo — Markdown / Node JS) · verified live task (merged) · **publicly verifiable**

- **Task:** implement four user-requested enhancements into udflow's **own** contract files — (1) `--deep` + UI drives **live browser evidence** via the Claude in Chrome extension; (2) `--report full` cost table split into **Input / Output / Cache-write / Cache-read**; (3) **ui-ux-pro-max** required at planning for design-system scope (+ visual-consistency clause + asset-generation deferred to post-approval); (4) `--report full` embeds the **final changed-UI screenshots** — plus the 0.23.0 version bump + CHANGELOG. **Spec/docs-only** (no hook / machine-token change). Invoked via `/udflow:run --deep --report full` (maintainer's run).
- **Intent given:** **contract-level** — six numbered acceptance criteria + three design forks resolved up-front via AskUserQuestion (browser-evidence enforcement scope, screenshot directory, reference-file structure); the constraint "don't deviate from udflow's spirit / token economy, don't touch hooks" was explicit.
- **Reviewers:** spec / test / architecture / security / ui-ux / operability panel + **adversarial verification** + gatekeeper at maximum effort; **code-reviewer** added in the repair round for the new validator JS. · **Verdict: FIX REQUIRED → READY** (one repair loop).
- **Verification:** `node .github/scripts/validate-structure.mjs` → pass (incl. a **new 5e guard** asserting the cost-table component columns, version parity, bilingual README parity, U+FFFD integrity); `node --test` → 127 pass / 0 fail / 4 pre-existing Windows-symlink-EPERM skips (131 tests, exit 0); hooks **byte-unchanged**; GitHub CI (validate × macOS / Ubuntu / Windows) → all green. **Plus a separate Copilot live-verify** (see note).
- **Caught (saves — all fixed before merge):**
  - **2 × MAJOR (security):** the new browser drive read the **authenticated session** (cookies/tokens/PII via page-text / network / console) with **no data-sensitivity disclosure** — unlike every other egress capability in the codebase (Codex / ui-ux-pro-max / observability); and changed-state **screenshots embedded in `--report full`** (which the Evidence Record pastes into PRs/issues) would **leak even when the file is gitignored**. Both raised by `security-reviewer`, re-rated by mechanism, both fixed (a Data-sensitivity section + create-`.gitignore` + "don't paste sensitive screenshots into public PRs" + a no-destructive-interaction invariant).
  - **Minors (fixed):** a `.gitignore`-`*`-self-ignore bug (a `*`-only ignore won't travel to a clone → fixed to `*` + `!.gitignore`), the deep-mode "required when UI" scope-binding ambiguity (spec filed it MAJOR; the gatekeeper **correctly re-rated to minor** on evidence), ui-ux-pro-max "required" reading as a hard dependency, an under-specified "changed state", a misdirected doc anchor — plus a **new validator 5e guard + paired regression test**.
- **False alarms: 0** — no blocker/major was raised falsely (the lone spec "major" was a real coherence ambiguity, correctly down-rated by the gatekeeper, not a false positive).
- **Process note (disclosed, no verdict impact):** in repair round 1 the deep-mode **adversarial-verification** sub-stage returned 0 votes (the verifier agents' errors were swallowed by the workflow's null-coalescing); the gatekeeper correctly read this as "not run" (not "0 confirmed") and adjudicated each major independently; the verify stage was hardened in round 2.
- **Missed:** none known at the verdict — to confirm in follow-up use. The req1/req4 **runtime** (actually driving a browser / capturing screenshots) could not be exercised — udflow's own repo has no web UI; only the contract text was delivered and verified (a disclosed runtime gap).
- **Outcome after follow-up:** **merged** (PR #30, merge commit `5d6a613`) and auto-released as **`v0.23.0`**; a docs follow-up (PR #31, merge `e50a5c7`) recorded the Copilot live-verify with **no version bump**. Whether the verdict holds long-term is **to be confirmed** over time.
- **Cost:** ~1.51M new tokens (observed: implementer ~109K + deep panel R1 ~783K + repair panel R2 ~369K; orchestrator main-thread ~250K estimate) · ~24 subagents across 2 workflow runs · **Evidence:** public — PR https://github.com/simba6507/universal-dev-flow-plugin/pull/30 · commit `f8bef45` · release `v0.23.0` · compat follow-up PR https://github.com/simba6507/universal-dev-flow-plugin/pull/31.
- **Copilot compatibility (live-verified this session):** udflow 0.23.0 on **GitHub Copilot CLI 1.0.65** (model claude-sonnet-4.6) — `copilot plugin list` shows `udflow@kktmarketplace (v0.23.0)`, `copilot skill list` lists both skills, a live `copilot -p` session enumerated **all nine subagents** (`implementer` + 7 reviewers + `gatekeeper`), and the **SessionStart + Stop hooks fired** (hook-debug log). One finding: Copilot **runs** the hooks but does **not surface their injected output** to the model → the auto failure-memory digest is a **no-op under Copilot** (fail-open; degrades to manual retrieval during planning). Documented in README Compatibility (PR #31).

_More runs needed for Track 2 — especially at least one **not** by the maintainer, and breadth beyond the current
two projects (one private, one this public plugin repo). Add yours via the issue template above._

---

## Capability validation (controlled benchmarks / Type A)

Blind bug-catch experiments. These characterize the reviewers' reach and precision; they are a **proxy** for
real use, not a record of it.

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

### Strict native-intent test — 2026-06-19 · author-bias check on the 84%

To remove author bias from the with-intent 84%, a **bug-blind** agent wrote each intent from only the function's signature + native doc-comment (no body, no fix), then a reviewer reviewed the real code against that machine-written intent. 12 bugs, 2 per language. **Result: 0 hit / 2 partial / 10 miss / 0 FP.** Audited the generated intents: **no leakage** (all defect-agnostic purpose statements).

Two effects are tangled here, reported honestly:
- **(confound) Doc-context extraction was unreliable** — for ~4 bugs (B3, GO3, B6, AX1) the intent-writer was fed the wrong unit / mid-function / a type block (it flagged this itself), so its intent was garbage and the review was derailed (B3 was even a *hit* diff-only but a miss here). Those 4 do not count as a clean native-intent measurement.
- **(real signal) Where the native intent was well-formed** (PY4, PY7, GO2, AX3 — sensible contracts), recall was still **0 hit / 1 partial**, whereas the *author-written specific* intent had caught all four.

**Calibration / correction:** the with-intent **84% was inflated by author-supplied specificity.** The lift does not come from merely *having* intent — it scales with how **contract-specific** the intent is. A function's own docs usually state only *purpose* ("returns the body length") and did not lift recall; the author notes stated the *contract* ("must be the exact UTF-8 byte count") and did. So real-udflow recall depends on the **quality of the intent in the Review Packet**, sitting between **~34% (no intent)** and **~84% (very specific intent)**, and likely **well below 84% unless the packet carries contract-level intent**. False positives stayed 0 throughout. (This strict run is itself partly confounded by extraction; a clean re-run with verified per-function docs would pin the native number — not yet done.)

### Scaled automated benchmark — 2026-06-20 · n=77, 12 repos, 6 languages

Built a **validated automated harness** (a Bash agent clones each repo, auto-selects localized `fix` commits, extracts the COMPLETE pre-fix function with self-validation, and provides the real fix diff as ground truth → a bug-blind agent writes the intent → reviewer reviews against it → judge scores vs the fix diff). Validated on 3 repos (15/15 clean extraction, no contamination) then scaled.

**77 bugs across 12 repos / 6 languages (Py/JS/Go/Rust/Java/C#): 22 hit / 8 partial / 47 miss / 1 FP** (~29% hit, ~39% touched, **1 false positive in 77**). Per-language hit rate varied (Rust weakest at 1/14 — lifetime/ownership semantics; others 28–57%).

This is the cleanest, largest, no-author-bias measurement, and it **confirms at scale**: the **near-zero false-positive rate is the robust strength**, and **blind/native-intent recall (~30%) sits near the diff-only floor** — the earlier 84% required *specific, author-written* intent (now firmly an optimistic upper bound).

**Failure corpus (55 miss+partial, judge-categorized):** omission **36%** (#1 — missing behavior vs intent) · found-other-bug **18%** (a real but *different* defect — real-world value exceeds the hit rate) · language-idiom **16%** · severity-underrate **15%** (found it, rated minor) · domain-knowledge **15%**.

**Improvements shipped from this corpus (v0.9.2, language-neutral):** (1) the **gatekeeper re-rates severity by demonstrated impact** — a found-but-undersold concrete defect is escalated to ≥major (targets the 15%, ~0 added FP); (2) the **gatekeeper enforces edge-input verification** for behavior-changing code (targets the 36% omissions). The idiom/domain ~31% is the genuine ceiling (needs running/specific intent, not prose). found-other-bug is a benchmark artifact, not a defect to fix (real use keeps those finds).

## Adding an entry

- **Type B (real-world):** preferred path is a **["Verified udflow run"](.github/ISSUE_TEMPLATE/verified-run.yml)**
  issue; the maintainer curates accepted ones into the *Real-world runs* section. Or PR a `### Live run N …`
  section directly. State how the outcome was verified and whether the verdict held up.
- **Type A (benchmark):** append a `### Run N — date · repo (language) · type` section with a table like
  Run 1's under *Capability validation*, then update the **Running tally**. State how ground truth was
  established and how leakage was prevented.

## Adoption (not counted toward graduation)

Testimonials, stars, install counts, and "it worked for me" reports go here. They show interest, not a
measured catch/false-positive rate, so they do not move the graduation tally.

_(none recorded yet)_
