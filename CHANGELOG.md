# Changelog

All notable changes to this plugin are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.10.1]

Patch: makes the documented install flow actually enable the plugin, and hardens two best-effort robustness gaps a re-review surfaced. Single-file hook change plus CI/docs; defaults, reviewer selection, and all hook contracts unchanged.

### Fixed
- **Quick start now enables the plugin** (`README.md`, `README.zh-TW.md`): the plugin ships `defaultEnabled: false` (opt-in), so `add → install → reload` left it **installed but disabled** — hooks and skills inactive. The quick start now includes the explicit enable step (`/plugin` → Installed → toggle, or `claude plugin enable`), with a note that installing ≠ enabling.
- **orchestration-check transcript read is now bounded** (`orchestration-check.js`): the Stop hook read the whole transcript synchronously with no cap, and the 5s watchdog cannot interrupt a synchronous read. It now stat-checks the transcript and fails open (does nothing) above 32 MB — far above any realistic session (typically single-digit MB), so it never clips real work while bounding the pathological case. Matches the existing `MAX_READ` / `MAX_STDIN` caps on the sibling hooks.
- **Release publish no longer drifts** (`.github/workflows/validate.yml`): the auto-release pushed the tag before creating the GitHub release and gated reruns on the *tag*, so a failure between the two left a tag with no release that reruns would skip forever. The idempotency guard now keys off the *published* release (`gh release view … --json isDraft`, so a stray draft can't wedge it into skipping forever), tag creation is itself idempotent, and `gh release create --verify-tag` refuses to mint a lightweight tag if the annotated one is missing — so a failed run cleanly completes the release on rerun, and annotated tags are preserved on every path.

### Docs
- **Global failure-memory injection documented** (`README.md`, `README.zh-TW.md`): troubleshooting now states that without a project-local `ai/FAILURE_MEMORY.md`, the global `~/.claude/FAILURE_MEMORY.md` digest is injected into every session (intended), how to scope or disable it, and that injected content is nonce-fenced and role-marker–neutralized. No behavior change.

### Notes
- New hook tests: the orchestration-check over-cap fail-open path, and a `hooks.json` Stop-hook wiring assertion. All three hooks remain fail-open / fail-safe and non-blocking.

## [0.10.0]

Closes the external review's "claimed vs enforced" and "global footprint" gaps: deep mode splits into a cheap **Tier 1** that can auto-engage deterministic enforcement on high-risk work, the Stop hook's advisories now survive a non-English summary, and a project can opt **out** of the otherwise-global plan gate. Two single-file hook changes plus prompt/docs; defaults and reviewer selection are unchanged.

### Added
- **Plan-gate project opt-out** (`plan-gate.js`): a project can disable the plan gate for its own sessions by setting `"udflow": { "planGate": false }` in its `.claude/settings.json` (or `.claude/settings.local.json`, which takes precedence). The project dir is resolved from `CLAUDE_PROJECT_DIR`, falling back to the event `cwd`. **Fail-safe toward the gate**: a missing / oversized / malformed settings file, or any read error, keeps the gate **on** — a broken config can never silently drop the guard. Addresses the documented "it's global — blocks plan-mode edits even in unrelated projects" limit; default behavior is unchanged (the gate stays on unless a project opts out). New behavioral tests cover the opt-out, the local-override precedence, fail-safe on malformed config, and the `cwd` fallback.
- **Deep mode Tier 1 / Tier 2 split** (`references/deep-mode.md`, wired into `SKILL.md`, `reviewer-selection.md`, `run/SKILL.md`): deterministic *enforcement* is separated from deeper *verification*. **Tier 1** (the selected panel as a Workflow `parallel` barrier, `gatekeeper` as a `pipeline` barrier — *same reviewers, same reasoning effort*) now **auto-engages on high-risk / correctness-critical work when a Workflow/ultracode capability is present** (opt-out via `--no-deep` / `--shallow`), because graph-enforced orchestration costs ≈ the standard flow. **Tier 2** (adversarial verification + loop-until-dry + maximum reasoning effort) stays **explicit opt-in** (`--deep`), honoring the Auto-fix loop's "confirm before an opus-heavy pass" cost rule. Reviewer *selection* is unchanged in both tiers. Honest bound: the deterministic guarantee exists only in Workflow-capable sessions; otherwise the panel still runs but is model-orchestrated (disclosed). Prompt/docs only — no new agent, and the hooks still never depend on deep mode.

### Fixed
- **Stop-hook advisories now survive a localized summary** (`orchestration-check.js`): both the verdict-not-honored and panel-missing advisories previously required an English prose word (`verdict` / `gatekeeper` / `readiness`) to recognize a READY assertion, so a non-English final summary ("最終裁決：READY …", made language-adaptive in v0.9.4) matched neither path and the checks went silent. Detection now also keys off the **verbatim machine tokens** — `READY` / `FIX REQUIRED` / `NOT READY` and the severity labels `blocker` / `major` / `minor`, which Language-And-Text-Integrity keeps literal in every language — requiring ≥2 distinct severity labels so a bare incidental "READY" still cannot cry wolf. New tests cover a zh-TW READY summary and a zh-TW completion that buries a `NOT READY` verdict.

### Docs
- README (EN/zh) reworked: the **Deep mode** section now describes the two tiers; the **Plan gate** limit and **Troubleshooting** document the project opt-out; the verbose **Codex** + per-reviewer **MCP** setup moved out of the README into a new reader guide `docs/advanced/external-capabilities.md` (the shipped `references/external-capabilities.md` stays the operational source of truth); the install-failure note states the `kktmarketplace`-vs-repo-name mismatch is the usual cause (Claude Code's own message can't be customized by a plugin); a new **Project status & maintenance** section discloses the solo-maintainer / early-stage status. Repo-root docs — not shipped.

### Notes
- All three hooks remain fail-open / fail-safe and non-blocking. The two behavioral changes (`plan-gate.js` opt-out, `orchestration-check.js` localization) are single-file and independently revertible; the deep-mode split is prompt/docs and language-neutral. Hook behavior tests extended accordingly (`test/hooks.test.mjs`).

## [0.9.9]

Hardens the two session "tripwire" hooks against the gaps a security pass found — the gatekeeper's verdict now has an advisory guard, the review-panel check is no longer dodgeable by spawning one agent, and the plan-gate Bash net covers the non-redirect writers it previously missed. Advisory hooks stay advisory (a Stop hook cannot block); the structured-edit plan gate and the workflow discipline remain the real guarantees.

### Added
- **Verdict-honoring advisory** (`orchestration-check.js`): the Stop hook now warns when the gatekeeper's **last** verdict in the transcript was `FIX REQUIRED`/`NOT READY` but the session ends claiming the work is done without surfacing that block — the previously-unguarded "verdict silently overridden" path. Reads the *last* verdict, so a normal `FIX REQUIRED → repair → READY` loop is not flagged; stays silent when the final message honestly reports the block.
- **Plan-gate Bash coverage** for non-redirect working-tree writers that were silently allowed (and not even on the documented-miss list): `perl -i`, `truncate`, `dd of=` (exempting `of=/dev/null`), and `ln` (symbolic/hard links). Joins the existing redirect / `tee` / `sed -i` / `git apply` set.

### Changed
- **Incomplete-panel detection** (`orchestration-check.js`): a ship/readiness claim now requires **all** core panel agents (`spec-reviewer`, `test-reviewer`, `gatekeeper`) to have run — previously any single agent appearing silenced the check, so spawning only the gatekeeper dodged it. The reminder names the reviewers that did not run; the "none ran" case keeps its stronger wording.
- **Panel check is no longer evaded by dropping the verdict word** (`orchestration-check.js`): the trigger now also recognizes deliberate lowercase / no-keyword ship phrasings ("ready to ship", "good to go", "safe to merge", …), not just an uppercase `READY` verdict token. Stays conservative — casual "looks good / done" with no ship decision does **not** trigger it, so trivial work that legitimately ran no panel is not nagged.

### Fixed
- **Plan-gate exemption is now filesystem-case-correct** (`plan-gate.js`): the `~/.claude/plans` write-exemption folds case only on case-insensitive filesystems (Windows/macOS). On case-sensitive systems (Linux) a real directory literally named `PLANS` is no longer wrongly treated as the exempt plan dir — narrowing the writable-exemption set to exactly the intended path.

### Docs
- README (EN/zh) and `SKILL.md` updated to list the broader Bash coverage and to state plainly that interpreter one-liners (`node -e fs.writeFileSync(...)`, `python -c "open(...,'w')"`) and `xargs`-driven writes still slip — the tripwire is a safety net, and a default plan mode in settings is the hard guard. The `orchestration-check` description now covers the verdict-honoring advisory.

### Notes
- All three hooks remain fail-open and non-blocking. Hook behavior tests extended to lock in the new advisories and Bash patterns (`test/hooks.test.mjs`).

## [0.9.8]

Marketplace-readiness polish (ahead of an optional community-marketplace submission). One real behavior change — udflow now installs **disabled by default** — plus a readable display name.

### Added
- **`defaultEnabled: false`** on the marketplace entry — udflow now installs **disabled**, so its cost (multi-agent token usage) and its three always-on session hooks are **opt-in**: you enable it deliberately after installing. Follows the official best practice for plugins with cost/security implications and matches udflow's own risk-proportional, "stays out of the way" ethos.
- **`displayName: "Universal Dev Flow"`** (plugin manifest + marketplace entry) — a readable label in the plugin UI; the identifier stays `udflow`.

### Notes
- Shipped logic (skills / agents / hooks) is unchanged from 0.9.7; this is manifest metadata plus an install-default change.

## [0.9.7]

Tooling + docs only — the shipped plugin (`udflow/`) is unchanged from 0.9.6; this bump realigns the release tag with `master` after the post-0.9.6 CI/docs work. No hook, reviewer, or workflow behavior change.

### Changed
- **Release tagging is now automated** (`.github/workflows/validate.yml`): a `release` CI job reads the version from `udflow/.claude-plugin/plugin.json` and, once Validate passes on a push to `master`, auto-publishes the annotated `v<version>` tag + GitHub release (notes from this CHANGELOG) when none exists — idempotent. Replaces the earlier warn-only drift check, so plugin version / manifests / CHANGELOG / git tag / release can no longer drift and are never tagged by hand. (v0.9.7 is the first release cut by it.)
- **CI actions bumped to clear the Node 20 deprecation**: `actions/checkout` → v7.0.0, `actions/setup-node` → v6.4.0 (both run on Node 24; still SHA-pinned).

### Docs
- **README links to a live showcase**: [`udflow-public-demo`](https://github.com/simba6507/udflow-public-demo) — a public, captured `/udflow:run` (plan gate → risk-selected reviewers → gatekeeper verdict) — near the top of `README.md` / `README.zh-TW.md`.
- **`EVIDENCE.md` records that demo as a *showcase*, explicitly not a Type-B data point** (a maintainer-authored demonstration, not verified-over-time real-world work), so the graduation tally is unchanged.
- `README.zh-TW.md` punctuation normalized to full-width; the 0.9.6 tooling note clarified (warn-only, matching what its tag actually shipped).

## [0.9.6]

Adds a conditional, read-only **plan-grounding & intent-sharpening** step before plan approval on high-risk work — targeting the benchmark's #1 miss category (omission ~36%) at its cheapest point, the plan. Prompt/docs only — no hook or reviewer behavior change, language-neutral.

### Added
- **Plan grounding & intent sharpening** (`references/plan-grounding.md`, wired into `SKILL.md` Lifecycle + Plan Gate, gated by the `reviewer-selection.md` Risk Matrix): on High-risk / correctness-critical work, before presenting the plan, udflow (Stage A) **grounds** the plan in the code's reality via a read-only exploration pass (`Detect → Use → Else-Disclose`; real call sites, existing edge handling, true contracts — each anchored to `file:line`), then (Stage B, main thread) **sharpens** the requirement into a contract-level intent plus an implied edge-input checklist. The sharpened contract is routed into the Review Packet's intent (the measured recall lever — see Evidence), the edge checklist into the verification gate / `test-reviewer` scope, and any product ambiguity into `AskUserQuestion` at the gate. It **assists** the human approval (never replaces it), adds **depth not breadth** (reviewer selection unchanged), is **skipped for low/medium-risk** work, and is **never a hard dependency** (no exploration subagent → local fallback + disclosure, never an error).

### Changed
- `SKILL.md` (Reference Loading, Lifecycle step 2, Plan Gate step 4), `reviewer-selection.md` (new *Plan Grounding* trigger on the same risk gate), `review-packet.md` (populate intent/edge fields from the sharpened contract/checklist), `verification-gate.md` (edge inputs are pre-enumerated at plan time), and `deep-mode.md` (Stage A may run as a read-only Workflow node) updated to wire the step in. README (EN/zh) gained a *Plan grounding* note under Advanced.

### Fixed
- **`universal-dev-flow/SKILL.md` frontmatter `description` is now double-quoted** — the unquoted plain scalar contained a `: ` (in "Triggers: …"), which YAML disallows inside a plain scalar; lenient loaders accepted it but stricter validators (incl. `claude plugin validate`) may reject it. The string value is unchanged, so skill-triggering is identical.

Note (repo tooling, not shipped): CI now runs `claude plugin validate ./udflow` (the plugin itself) in addition to the marketplace root; `validate-structure.mjs` also asserts the root `package.json` version agrees with the plugin/marketplace/metadata/CHANGELOG versions; and a warn-only CI step flags a manifest-version vs `git tag` mismatch (release-drift guard).

### Notes (why this is the right lever)
- The cross-language benchmark (`EVIDENCE.md`) pins two facts this step is built on: omissions are the #1 miss (~36%), and the dominant recall lever is **contract-level intent in the Review Packet**, not more reviewers on the same content. Omissions originate at plan time and are cheapest to fix there; sharpening the intent before approval pushes exactly that lever. Risk-gated and read-only to stay consistent with udflow's risk-proportional, usability-over-strictness ethos.

## [0.9.5]

Sharper external-capability disclosure: don't mislabel an installed-but-failing capability as "not installed". Prompt/docs only — no hook or reviewer behavior change, language-neutral.

### Changed
- **Distinguish "absent" from "present-but-failed-to-execute"** (`external-capabilities.md`): a capability that is installed/detected but then fails when invoked (runtime / sandbox / permission / auth / process-spawn error) is disclosed as "detected but could not execute (reason)" with a pointer at config / auth / sandbox — **not** as "not installed", and not by relaying a tool's "run the installer" message when the tool is actually present. Relaying a false "not installed" sends the user to a useless reinstall and hides the real fix.
- **Concrete Codex case documented:** if `codex` is installed but fails to run (e.g. a Windows `CreateProcessAsUserW` / spawn error from `[windows] sandbox = "elevated"` in `~/.codex/config.toml`, or an auth problem), disclose it as "Codex detected but could not execute" and point at `~/.codex/config.toml` / `codex login` — do not report "`@openai/codex` not installed" or suggest `npm install` when the CLI is present. (Came from a real run where a sandbox `CreateProcessAsUserW` failure was surfaced to the user as "not installed".)

## [0.9.4]

User-facing communication now follows the user's language. Prompt/docs only — no hook or reviewer behavior change, fully language-neutral (language-adaptive, not biased to any one language).

### Changed
- **The plan, AskUserQuestion prompts, reviewer findings shown to the user, and the final summary now follow the language the user is communicating in** (`SKILL.md` Language And Text Integrity + Planning step), instead of defaulting to English when the user writes in another language. The plan is the most user-facing artifact in the workflow — its purpose is to be read and approved — so it should be in the user's language. Previously the all-English scaffolding nudged plans toward English even in a non-English conversation; this closes that gap (udflow already followed the user's language for *repository* content — now it does for its *own* communication too).
- **Hard guard on machine-checked tokens:** the verdict `READY` / `FIX REQUIRED` / `NOT READY` and severity labels `blocker` / `major` / `minor`, plus identifiers / file names / commands / API fields / reviewer names, must stay **verbatim in any language** — they are matched literally by tooling (the Stop `orchestration-check` hook tests for the literal `READY` token), so translating them would silently break the contract.

## [0.9.3]

Makes real-world usage loggable as evidence, so udflow's track record can grow from actual runs (not just the controlled benchmark). Docs + workflow output only — no hook or reviewer behavior change.

### Added
- **Evidence Record in the Final Output Contract** (`verification-gate.md`): after a real task on an actual project, udflow emits one compact, paste-ready record (task / intent / reviewers / verdict / verification / caught / missed / false alarms / outcome / cost / commit) that the user can drop straight into a project's `EVIDENCE.md` *Real-world runs* section or a "Verified udflow run" issue. Real-runs-only; never fabricates an outcome; the *missed* / *outcome-after-follow-up* fields are left for the user to confirm once the change has lived in the codebase. Emitted for substantial real runs, omitted for trivial edits, Q&A, and benchmark runs.

Note: the repo also gained `CONTRIBUTING.md`, a "Verified udflow run" issue template, and a restructured `EVIDENCE.md` (real-world runs are now the headline / graduation gate; the blind benchmarks are reframed as capability validation). Those are repo-root docs, not part of the shipped `udflow/` tree.

## [0.9.2]

Two gatekeeper improvements targeting the two biggest addressable failure categories found in a 77-bug / 12-repo / 6-language automated benchmark. Language-neutral.

### Changed
- **Gatekeeper re-rates severity by demonstrated impact** (`gatekeeper.md`): a finding describing a concrete wrong result / crash / security exposure / data loss / contract violation (with a repro or clear mechanism) is treated as **≥ major even if the reviewer filed it as minor** — so a real, demonstrated defect doesn't slip because its finder undersold it. Targets the "found-it-but-rated-minor" mode (~15% of misses in the benchmark). Zero added false-positive risk (it only escalates findings that already describe a concrete failure).
- **Gatekeeper enforces edge-input verification for behavior-changing code**: the absence of a test exercising the change's edge/boundary inputs (per `verification-gate.md`) is a verification gap — a read-only "looks fine" review does not establish an omission/boundary defect is absent, so READY is withheld until risky inputs are actually exercised. Targets the #1 failure category (omissions ~36%).

### Notes (benchmark this is based on)
- 77 real bugs, 12 repos, 6 languages, automated harness (clean extraction, bug-blind intent, judged vs the real fix diff): **~29% hit / ~39% touched / 1 false positive in 77**. Confirms at scale that the **near-zero false-positive rate is the robust strength**, and that blind/native-intent recall (~30%) sits near the diff-only floor — the earlier 84% required *specific, author-written* intent. Failure corpus: omission 36%, found-other-bug 18% (a real but different defect — real-world value above the hit rate), language-idiom 16%, severity-underrate 15%, domain-knowledge 15%.

## [0.9.1]

Structural fixes targeting the **solvable** causes of the misses found in the v0.9.0 cross-language benchmark (the lesson there: structure moves recall, prose does not). Language-neutral.

### Changed
- **Verification gate now requires exercising the change's risky edge inputs** (`verification-gate.md`): for behavior-changing code, add/run a focused test that feeds the boundary inputs the change implies — empty / zero / overflow / large, multibyte / non-ASCII, null / empty / duplicate / multiple values, malformed input, by-value vs receiver use, concurrency — and assert the result. A test that reproduces the boundary is the oracle a static read lacks; it is what catches the subtle idiom/encoding/overflow/omission bugs reviewers rationalize as "looks fine." Targets the top miss causes (no spec-oracle, invisible omissions, subtle language semantics).
- **Correctness-critical logic gets ≥2 independent lenses** (`reviewer-selection.md` risk matrix): parsing, numeric/encoding/overflow handling, concurrency, security/trust, data integrity, or any non-obvious-edge path is no longer reviewed by a lone reviewer — single-reviewer recall on subtle defects is low and a second lens recovers them (validated by the Round 2 panel re-test).
- **Reviewers must enumerate, not stop at the first finding** (`reviewer-common.md` + `review-packet.md`): a single pass surfaces only the most salient defect; finding one real issue is not grounds to conclude the rest is correct.

Honest note: the panel-default is validated by the benchmark's Round 2 re-test (a panel recovered misses a lone reviewer flatly missed); the edge-test requirement is reasoned from the miss analysis (a boundary test deterministically exposes the missed bugs) rather than re-benchmarked, since the blind code-review harness reviews code, not generated tests. No hook behavior change.

## [0.9.0]

Outcome of a cross-language blind benchmark (6 languages / 6 external repos / 32 real bugs; recorded in `EVIDENCE.md`). The changes are **language-neutral** by design — they target failure modes seen across C#, JS, Python, Java, Go, and Rust, never one language.

### Added
- **Reviewer defect-detection discipline** in the shared reviewer contract (`reviewer-common.md` + the delivered `review-packet.md` block): judge code on its merits, not its pedigree (do not assume idiomatic/canonical/"intentional" code is correct — a defect is real only with a concrete failure case); rate severity by impact (do not downgrade a demonstrated defect to `minor`); look for **omissions** against the implied contract; and reason in the **target language's real semantics**. Validated to add **zero** false positives (clean-code controls stayed clean).
- **Recall-vs-precision guidance** (`reviewer-selection.md`): for correctness-critical changes, prefer the multi-lens **panel** + requirement/intent context + **Deep Mode** over a single reviewer. The benchmark showed a single reviewer catches only a minority of subtle defects and that stronger wording alone does not lift recall, whereas a panel recovers defects a lone reviewer misses — at high precision.

### Notes (honest characterization from the benchmark)
- udflow's measured edge is **precision (near-zero false positives — 1 across ~90 blind reviews) + structural depth (panel / Deep Mode / intent)**, not single-pass recall (~34% hit / 50% touched on the blind set). Recall is bounded for subtle idiom/omission/domain defects; structure and intent are the levers, not reviewer prose.

## [0.8.1]

### Changed
- **Verification gate now warns about backgrounding build/test commands.** A lingering child process (a build server, file watcher, or dev server) that inherits a backgrounded command's output pipe keeps the background task stuck "running" long after the command finished. `verification-gate.md` now says to prefer foreground, and for the common .NET case (MSBuild node-reuse workers + the Roslyn `VBCSCompiler` server persist for minutes) to add `/p:UseSharedCompilation=false /nr:false` (or `MSBUILDDISABLENODEREUSE=1`) when backgrounding. Surfaced by a real session where a `dotnet test` that finished in ~2s left a background task wedged behind orphaned build servers. Root cause is the .NET SDK + harness background-pipe semantics (not udflow); this is a guard-rail, not a fix.

## [0.8.0]

Closes the documented plan-gate Bash gap with a narrow, low-false-positive tripwire (informed by an independent cross-model second opinion from Codex, then trimmed for usability).

### Added
- **Plan gate now also blocks *obvious* Bash working-tree writes** in plan mode: redirect-to-file (`>`, `>>`, `&>`), `tee` to a file, `sed -i` (including `-i.bak` and `--in-place`), and `git apply` (dry-run flags `--check`/`--stat`/`--numstat`/`--summary` are exempt — they write nothing). `Bash` is added to the `PreToolUse` matcher; the check (`bashLooksLikePlanWrite`) strips quoted strings first and **defaults to allow** — it deliberately does **not** block read-only Bash, `git checkout`/`git restore` (branch navigation), `/dev/null` / `NUL` redirects, or fd dups like `2>&1`. It is a safety net for the common cases, **not** full shell classification: by design it also lets no-space redirects (`echo x>f`), `>|`, and `$VAR`/`~` targets through, because tightening those would false-positive on arithmetic like `$((a>b))` — false positives are ranked worse than a documented miss. The workflow rule against Bash tree-writes during planning remains the real guarantee. Bash denials get a distinct, honest reason message (names the heuristic and the ExitPlanMode escape hatch). Covered by new behavioral tests including a documented-miss block that pins the intentional boundary.

### Changed
- README (EN/zh), `SKILL.md`, `implementer.md`, and `external-capabilities.md` updated from "Bash slips past it / not covered" to the accurate "obvious Bash writes are blocked; it's a narrow tripwire, not complete enforcement."

## [0.7.2]

Follow-ups surfaced by a `--deep` (deterministic-Workflow) dogfood review; all minor, no behavior change.

### Fixed
- `spec-reviewer`'s commented MCP example now matches the documented mapping (a PM tracker, e.g. `mcp__linear__*`, instead of `mcp__github__*` which is the code-reviewer's diff/PR server).

### Added
- A behavioral test that `Edit`/`MultiEdit` are denied in plan mode (previously only the static `hooks.json` matcher covered them; a regression dropping them from `plan-gate.js` would have passed the suite). Also normalized line endings to LF (`.gitattributes`) and isolated the plan-gate tests' `HOME` (set both `HOME` and `USERPROFILE`) so they don't touch the real `~/.claude/plans`.

## [0.7.1]

A pragmatic dogfood-review follow-up (udflow reviewing its own 0.7.0): usability-weighted fixes, no new complexity.

### Changed
- **README restructured for onboarding.** Quick start and the example transcript now come first; the wall of caveats is collapsed into a short "What you're opting into" and the deep-dive (plan gate, failure memory, deep mode, cost table, external capabilities) moved under a single "Advanced" section. The status banner is tightened (honest, not self-discouraging), and the plan-gate/Bash caveat is stated once instead of three times. Same honesty, far less to read before installing.
- **Docs corrected to match the shipped hooks:** the READMEs now say **three** hooks (the 0.7.0 `orchestration-check` Stop hook was missing from the count and the Components list). Deep mode (`/udflow:run --deep`) is now documented.
- **`orchestration-check` is now conservative:** it only warns when a `READY` verdict is asserted **and none** of the core panel agents appear in the transcript — eliminating false reminders on correct sessions without adding any transcript-format machinery.

### Added
- A junction-based test (EPERM-skip-guarded) for the plan-gate symlink/realpath exemption, and a "panel partially ran → stay silent" test for `orchestration-check`.
- CI prevention: `validate-structure.mjs` now asserts every hook wired in `hooks.json` is named in `README.md`, so a future hook can't ship with stale docs.

## [0.7.0]

A large honesty + hardening pass from a fresh-eyes multi-agent review (all findings A–M), plus native plan-mode integration and an optional ultracode/Workflow deep mode.

### Changed
- **Plan gate honesty + native plan mode.** udflow now drives Claude Code's native plan mode for its planning phase (Detect → Use → Else-Disclose) so the read-only hook is live even when your default mode isn't plan; if the runtime can't switch modes it proceeds read-only by discipline and discloses that the hook isn't enforcing. README/docs no longer claim an unconditional "no files changed before approval", and now state the gate covers structured edit tools only — **not `Bash`**.
- **Cost guardrails.** The repair loop's iteration cap is now consistent (Stuck Summary after the same blocker persists two iterations — not "no fixed cap"); escalation to a deeper/opus pass asks first; docs explain manual-only operation.
- **Failure memory is written by a single actor** (main thread / gatekeeper after the verdict); reviewers/implementer only propose entries — avoids concurrent lost-update corruption.
- **`opus` use is disclosed at the agent level** (gatekeeper/security-reviewer state the model actually used and reduced confidence on fallback). `ui-ux-reviewer` gained a concrete fallback baseline (WCAG AA contrast, ≥44px targets, required states).

### Added
- **Optional deep mode** (`references/deep-mode.md`): when an ultracode/Workflow capability is detected or opted in (`/udflow:run --deep`), the selected panel, gatekeeper barrier, and repair loop run as a deterministic Workflow (the panel actually runs), with adversarial verification of blocker/major findings and raised effort — depth, not breadth, and never a hard dependency.
- **`orchestration-check` Stop hook** (best-effort, non-blocking, fail-open): warns if a READY verdict is asserted without the core panel actually running as subagents.
- **Hook hardening**: stdin size cap + write-then-exit flush (so a deny can't be truncated), `UDFLOW_HOOK_DEBUG` opt-in trace, `permission_mode`/`permissionMode` alias, large-file read cap, and plan-gate symlink/realpath hardening.
- **Failure-memory injection is fenced for real** (per-run nonce delimiter + neutralization of role-marker/instruction-tag lines), with tests — replacing the prior prose-only fence.
- CI: reference/agent/hook existence checks, `metadata.version` + CHANGELOG-entry validation, a `compact` SessionStart trigger, Windows test matrix, pinned actions, and CODEOWNERS.
- README onboarding: Node prerequisite, marketplace-name explanation, and a troubleshooting section; an "early / experimental" status label.

### Fixed
- `gatekeeper` Inputs list now includes `code-reviewer`; `reviewer-common.md` no longer falsely claims each reviewer inlines the contract (it is delivered via the Review Packet's "Shared reviewer contract" block).

## [0.6.0]

### Changed
- **Plugin moved into the `udflow/` subdirectory; only that subdir is distributed.** The marketplace `source` is now `./udflow`, so installs no longer pull dev/CI files (`test/`, `.github/`, `package.json`) into the user's plugin cache. Install/update commands are unchanged.

### Removed
- `ai/FAILURE_MEMORY.md` — it was a runtime output accidentally committed during dogfooding and should never ship in a distributed plugin. Added `.gitignore` so workflow runtime output and scratch/process files can't be committed again.

### Added
- Distribution-hygiene checks in CI (`validate-structure.mjs` fails if runtime/dev artifacts or scratch files appear in the shipped tree).
- An "Artifact Hygiene" rule in the workflow: delete temporary verification scaffolding before finishing, and never commit the workflow's runtime output (e.g. `FAILURE_MEMORY.md`) into a distributed tool/plugin repo.

## [0.5.2]

### Fixed
- **Failure-memory digest no longer over-reports omissions.** The "(N older entries omitted)" note counted skipped template placeholders; it now counts only real dropped entries (was firing on the shipped sample). [dogfood review]
- **Failure-memory digest never collapses to an empty note.** An oversized newest entry previously dropped every entry via an early `break`; the newest entry is now always kept (bounded) and the note is suppressed when nothing is shown.
- **Plan-gate exemption is anchored to the user home.** Previously any path containing `/.claude/plans/` (incl. a repo-local one) bypassed the plan-mode write block; it now requires the resolved path under `~/.claude/plans/`. `NotebookEdit` is now gated too.
- Prevention-rule extraction regex anchored (won't capture a stray body line); `validate-structure.mjs` now fails explicitly on a plugin name mismatch / missing marketplace version instead of silently comparing the wrong entry.

### Added
- Committed hook test suite (`test/hooks.test.mjs`, `node --test`) locking in the above fixes; CI now `node --check`s both hooks and runs the tests (previously CI never executed the hook JS).
- `ai/FAILURE_MEMORY.md` recording the three lessons from this review.
- Injected failure-memory content carries a prose disclaimer marking it untrusted reference data (a real nonce-delimited fence + line neutralization landed later in 0.7.0); CI workflow adds `permissions: contents: read` and concurrency.

## [0.5.1]

### Changed
- **Codex is now off by default (explicit per-task opt-in).** udflow no longer escalates to Codex on its own; it only delegates when the user explicitly enables Codex for the task — even if Codex is installed and the repair loop is stuck. This makes third-party (OpenAI) code/context egress a conscious, consented choice. A missing opt-in or absent Codex never errors.

## [0.5.0]

### Added
- **Optional Codex escalation.** When the auto-fix loop is stuck, udflow may delegate one independent cross-model diagnosis to Codex (the OpenAI GPT-family rescue plugin) — strictly optional, detected via Detect → Use → Else-Disclose. If Codex is not installed it is never called and does not error.

### Docs
- README (EN + zh-TW): disclosed that Codex use sends code/context to an external (OpenAI) model at extra cost and only runs if the Codex plugin is installed; listed Codex under optional external capabilities.

## [0.4.0]

### Changed
- **Failure memory redesigned into three stages.** The SessionStart hook now injects a compact **digest** (entry title + prevention rule + tags, newest first, capped) instead of dumping the whole file with a blind ~12000-char truncation. Relevant full entries are retrieved during planning by affected files/area/language/tags, and file size is kept down by consolidation (merge duplicates, fold recurrences, prune obsolete) rather than truncation.
- Truncation is now entry-aware (never cuts mid-entry) and only a safety net; non-template files fall back to an entry-aware excerpt of the newest content.

### Added
- `Tags` field in the failure-memory entry template (and the sample), used by the digest and targeted retrieval.

### Docs
- Moved the "Good to know" disclosures to the top of the README (before Quick start) so risks are seen first, and reworded the plan-gate / failure-memory bullets to make clear the hooks are invisible during normal work.
- Rewrote the README "Failure memory" section to describe the three-stage read/recall/consolidation flow.

## [0.3.0]

### Changed
- **Language is now neutral.** Human-readable output follows the file/repo/user language and defaults to English instead of Traditional Chinese.
- **Framework-neutral quality bar.** `implementer` and `code-reviewer` no longer prefer Microsoft/.NET by default; they follow the project's language/framework and its official best practices (with .NET as just one example).
- The workflow now identifies the repo's architecture and primary language/framework first, implements to that language's official best practices, and — when existing code diverges materially — raises corrections at the plan gate instead of silently refactoring.

### Added
- English `README.md` (primary) and `README.zh-TW.md` (Traditional Chinese), cross-linked.
- A realistic example transcript and a "stays out of the way for small tasks" note in the README.
- A "Good to know" section disclosing token/cost, `opus` use, the always-on hooks, file writes, and auto-trigger behavior.
- CI workflow that validates plugin structure on push/PR, plus a status badge.
- This `CHANGELOG.md`.
- `keywords` in `plugin.json` for discoverability.
- `examples/FAILURE_MEMORY.sample.md` showing a filled-in entry.

## [0.2.1]

### Fixed
- `plan-gate` hook now exempts Claude Code's own plan files (`~/.claude/plans/`), so blocking writes in plan mode no longer interferes with the native plan workflow.

## [0.2.0]

### Added
- `LICENSE` (MIT).
- Failure-memory Entry Template in `references/verification-gate.md`.
- `references/reviewer-common.md` as the shared reviewer contract.

### Changed
- Trimmed the skill description and all 9 agent descriptions to cut per-session context cost while preserving triggering semantics.
- Deduplicated the 7 reviewers against the shared contract (kept each reviewer's domain content).

## [0.1.0]

### Added
- Initial release: plan-gated multi-agent workflow (`implementer` + 7 reviewers + `gatekeeper`), `plan-gate` and `load-failure-memory` hooks, opt-in MCP, and optional external capabilities.
