# Changelog

All notable changes to this plugin are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.25.1]

Harden the **`--deep` + UI live-browser-evidence** rule so a *reachable* browser capability can no longer be silently skipped. Real-world dogfooding surfaced a gatekeeper that, with the Claude-in-Chrome capability connected and `--deep` engaged, downgraded the **required** live drive to a disclosed gap by **inferring** a user self-verification consent the user never gave (and citing reviewers' CSS/markup inference as a substitute). The contract already required the drive when the capability is *available*; this release makes "available-but-skipped" an explicit **unrun required check**, not a valid gap. Doc/contract only — **no new hook, no runtime code, no machine-token change**.

### Changed
- **`agents/gatekeeper.agent.md` (UI-specific rules) splits the live-browser-drive verdict.** The existing line now reads "an **unavailable** live browser drive is a disclosed gap"; a new line states that in `--deep` + UI, when a live browser capability **is detected and reachable** (e.g. `list_connected_browsers` shows a connected tab), the drive is mandatory and may **not** be downgraded to a disclosed/`deferred` gap on the basis of (a) an assumed user self-verification or (b) reviewers inferring visual correctness from CSS/markup. A skipped-while-available drive is an **unrun required check** (command-evidence authority), so `READY` is withheld until it actually runs; `deferred` is legitimate **only** with the user's explicit, verbatim-recorded consent — never inferred.
- **`references/browser-evidence.md` (Invariants) gains the matching "Available means mandatory" invariant**, so the rule lives where the live-drive protocol is defined as well as where the gatekeeper enforces it. Downgrade to a disclosed gap is permitted **only** when the capability is genuinely unavailable (Detect failed, or detected-but-could-not-execute with the recorded reason, per `references/external-capabilities.md`).

### Notes
- **Standard mode is unchanged** — browser evidence stays best-effort; an absent capability is still a documented gap, never a hard stop. The hardening targets only the `--deep` + UI *required* path when the capability is reachable.
- Verified live: drove `mcp__Claude_in_Chrome__*` against a local app (navigate → exercise changed states → screenshot → read console/network) — the exact flow the gatekeeper had skipped.
- ask-only / best-effort posture and zero-standing-dependency stance unchanged; the three hooks, the `udflow:verify=` / `udflow:delivery=` sentinels, and the verdict/severity literals are byte-identical. `node --test`, `node .github/scripts/validate-structure.mjs`, and `claude plugin validate .` / `./udflow` green.

## [0.25.0]

Add a **`--deep` (Tier-2) app-launch step**: when verification needs a live process (web app or backend/API) that isn't already running, udflow now **brings the app up itself** instead of only attaching to one — then drives the existing browser-evidence / verification steps. Closes the previously-documented gap where udflow assumed the app was already running. Doc/contract only — **no new hook, no runtime code, no machine-token change**.

### Added
- **`references/app-launch.md` — new Tier-2 launch contract.** Detect → Use → Else-Disclose for bringing the target runtime up in `--deep`: **attach if already running** (never relaunch / tear down what udflow didn't start); else **delegate to the built-in `/run` skill** (preferred — it owns project-specific / per-stack launch patterns, so udflow keeps no launch-command table of its own), then `mcp__Claude_Preview__*` `preview_start`, then a documented repo run command. Because `--deep` is itself the opt-in, it **auto-launches without a second prompt** but **discloses** that it launched and how. Covers **UI + backend/API** scope. **Teardown:** owns only what it started and reaps cleanly (no lingering dev-server / watcher / MSBuild `VBCSCompiler` holding the output pipe). **Honest disclosure:** distinguishes "no launch capability" from **detected-but-could-not-execute** (a launch that fails on missing config / auth — e.g. an Entra `ClientId` gap → switched to a dev/test-auth profile), and forbids silently swapping auth/config profiles and presenting the result as if production config was exercised. Never a hard dependency: an un-launchable app is a disclosed gap the `gatekeeper` weighs, never an error.

### Changed
- **Wired the launch step into the Tier-2 flow.** `references/deep-mode.md` gains app-launch as Tier-2 *Use* item 6 (live-browser drive becomes item 7, after the app is reachable), and the obligation persists in the no-Workflow *Else* fallback (like the browser obligation). `references/browser-evidence.md` (*When it applies* + *Use*) now ensures the app is up first. `references/external-capabilities.md` registers `/run` as the sibling launch capability. `SKILL.md` adds the reference + a Verification-step line. `udflow/skills/run/SKILL.md` documents `--deep` auto-launch. Both READMEs: deep-mode bullet, `--deep` flag row, and a new `/run` capability row (EN ↔ zh-TW parity preserved).

### Notes
- **Standard mode is unchanged** — it never auto-launches; an unreachable app stays a documented gap exactly as before. Auto-launch is keyed strictly on `--deep` + a needed live process.
- ask-only / best-effort posture and zero-standing-dependency stance unchanged; the three hooks, the `udflow:verify=` / `udflow:delivery=` sentinels, and the verdict/severity literals are byte-identical. `node --test`, `node .github/scripts/validate-structure.mjs`, and `claude plugin validate .` / `./udflow` green.

## [0.24.1]

Extend the `destructive-guard` deny-list (0.24.0, item 11) to **PowerShell-native destructive cmdlets**. **Live Copilot CLI verification** (1.0.65, Windows) showed the model rewrites `rm -rf` into `Remove-Item -Recurse -Force`, which the POSIX-only deny-list missed — while git operations were already caught cross-platform and the guard's `ask` was confirmed honored under Copilot.

### Changed
- **`destructive-guard.js` now also matches the common PowerShell forms** the model emits on Windows / Copilot: `Remove-Item -Recurse` (the cmdlet form of `rm -rf` — incl. the `ri` alias and PowerShell's abbreviated `-r…` flag), `Format-Volume`, and `Clear-Disk` — same narrow, **ask-only** posture. The `rm` alias is intentionally excluded (the POSIX `rm -rf` pattern owns it, where `rm -r` alone stays a documented allow), and a non-recursive `Remove-Item` / `Remove-Item -Force` on a single file stays allowed to avoid false-asks. Documented misses now also list piped deletes (`… | Remove-Item`) and cmd.exe `rd /s` / `del /s`. The `permissionDecisionReason` and both READMEs list the new forms.

### Notes
- **Copilot CLI compatibility verified live (1.0.65, 2026-06-26):** plugin + skills load at this version; all hooks fire (Copilot names its shell tool `Bash`, so the PreToolUse matcher matches); plan-gate no-ops (no `plan` mode); the failure-memory digest and `UDFLOW_ENFORCE_STOP` block are no-ops (Copilot doesn't surface injected/Stop output); and the `destructive-guard` `ask` is **honored** — it gated `git reset --hard` and Copilot surfaced the guard's reason + opt-out.
- ask-only / best-effort posture unchanged; no other hook touched; machine-checked tokens unchanged; EN ↔ zh-TW README parity preserved. `node --test`, `node .github/scripts/validate-structure.mjs`, and `claude plugin validate .` / `./udflow` green.

## [0.24.0]

Implement borrow-backlog items 1–11 from the 2026-06 competitive survey of top Claude Code plugins, in their **optimal/lean** form (most ideas were already covered by udflow; the genuine deltas are small). One new hook, two hook deltas, the rest doc/prompt. Dogfooded via udflow `--deep --report full` (spec / test / code / security / architecture / operability panel + gatekeeper at max effort) → **READY**.

### Added
- **`destructive-guard.js` — new all-modes destructive-command safety net** [item 11, from cc-safety-net]. In every mode it returns `permissionDecision:"ask"` (never a hard deny) on a narrow, high-confidence deny-list of *unrecoverable* Bash commands — `git reset --hard`, `git push --force`/`-f`/`--force-with-lease`, `rm -rf`/`-fr`, `find … -delete`, `dd of=<device>`, `mkfs`, `shred` — closing the post-plan-approval gap the plan gate (plan-mode-only) leaves open. Per-project opt-out `"udflow": { "destructiveGuard": false }` (default on; missing/malformed → on, fail-safe). Reuses plan-gate's hardening (stdin cap, watchdog, quoted-span stripping, settings precedence, write-then-exit); **fail-OPEN** on an unparseable input, **fail-CLOSED-to-ASK** once a pattern matches. Documented misses (interpreter one-liners, `bash -c`, `$VAR`/glob targets, separated `rm -r -f`, an apostrophe mis-pair) match plan-gate's accepted-miss posture — best-effort, ask-only, never the sole protection. Wired as a second `PreToolUse` `Bash` entry; covered by behavioral + cross-shell tests and the structure validator (WIRING + README parity).
- **Opt-in hard Stop enforcement `UDFLOW_ENFORCE_STOP`** [item 9, from claude-review-loop]. Default OFF and **byte-identical** to prior behavior. When set, `orchestration-check.js`'s verdict-not-honored advisory is upgraded to `{"decision":"block"}` **only** on the highest-confidence, fully sentinel-based signal: a real id-bound gatekeeper `FIX REQUIRED`/`NOT READY` verdict **and** an explicit `udflow:delivery=shipped`, and not already re-entered (`stop_hook_active`). Prose inference can warn but never blocks; the model always holds a one-token escape (`udflow:delivery=held`). Stop enforcement is Claude-Code-only (Copilot doesn't surface Stop output — disclosed).

### Changed
- **Failure-memory lifecycle: supersede + auto-expire** [item 7, from claude-smart / hello2cc]. `references/verification-gate.md` consolidation gains *supersede* (a changed-mind/replaced rule is folded or title-annotated `(superseded by …)`) and *auto-expire* (a resolved one-time env failure is dropped or annotated `(expired)`). `load-failure-memory.js`'s SessionStart digest now **skips any entry whose title ends with** an `(expired)`/`(superseded …)` marker (trailing-anchored, fails-toward-showing — a mid-title mention is not retired), so a stale lesson stops biasing the always-on context before consolidation deletes it. No `Status:` schema field (avoids forking the delete-on-consolidate lifecycle).
- **gatekeeper: quorum-stop, minority-report, and `[unverified]` downrank** [item 8, from octopus / cavekit]. A *selected* reviewer that produced no usable result is a panel gap → cannot be `READY` (stricter than the post-verdict Stop-hook net). For any non-unanimous / contested / downranked finding the gatekeeper now states what concrete evidence would flip the verdict. An `[unverified]`-tagged finding (a hunch the reviewer's read-only sandbox genuinely cannot run) is capped below `blocker` and downranked — the precision counterpart to the existing upward re-rate.
- **Reviewer recall levers** [item 6, from cavekit / harness]: a "read both sides of a crossed contract" omission lens (`reviewer-common.md`, mirrored into the `review-packet.md` shared contract) and a fail-first→pass test preference for behavior-changing acceptance criteria (`verification-gate.md`). The benchmark-refuted per-dimension checklist (6c) was **not** adopted.
- **Repair-iteration verification scoping** [item 5, from superpowers]: a repair iteration re-runs only the failing / changed-path checks (carried-forward-green marked distinctly), then re-runs the **full required set once** before `READY` so `udflow:verify=pass` still rests on a real full-suite green. A long-run `output/udflow/progress.md` commit-hash ledger (re-read after compaction) is documented [item 10] — doc-only, no persistence hook.
- **Artifacts-as-files for large diffs** [item 3, from superpowers]: a large filtered review diff may be handed as an `output/udflow/review/diff.patch` path (small diffs stay inline; inline on write failure), reusing the kept-but-gitignored evidence convention.
- **Bounded model down-tier policy** [item 2, from claude-forge]: `reviewer-selection.md` documents that under `opus` + `--lite`, leaf reviewers may use the session default tier; `spec`/`security`/`gatekeeper` excluded; disclose the model used. Policy only — **no agent frontmatter pin**.

### Notes
- **Lean by design.** The survey's heavier ideas — a Haiku `{ok}` gate (item 1), a router-skill (item 4), a budget counter / STOP-file (item 5b), a per-dimension reviewer checklist (item 6c) — were **dropped or confirmed already-covered**, because building them would regress udflow's pragmatism axiom, its own recall benchmark (recall comes from lens breadth + contract intent, not from one reviewer "trying harder"), or its zero-standing-dependency posture. No vector DB, no standing worker, no new runtime dependency.
- **Defaults unchanged.** `UDFLOW_ENFORCE_STOP` off = byte-identical Stop behavior; the existing three hooks are otherwise unchanged; machine-checked tokens (`udflow:verify=` / `udflow:delivery=`, the verdict and severity literals) are byte-identical and still emitted last. EN ↔ zh-TW README top-level `##` section-count parity preserved.
- **Dogfooded.** The `--deep --report full` panel surfaced 1 security major (an undisclosed apostrophe-mispair miss → fixed via disclosure parity with plan-gate) plus several minors (a `git push --force` regex tighten, README disclosure drift, six test-coverage additions) — all fixed before READY. `node --test test/*.mjs` (156 pass / 0 fail / 4 Windows-EPERM symlink skips), `node .github/scripts/validate-structure.mjs`, and `claude plugin validate .` / `./udflow` all green.

## [0.23.0]

Four user-requested enhancements, all gated to existing opt-in modes and built on the Detect → Use → Else-Disclose protocol — **no hook change, no machine-token change**: the three hooks, the `udflow:verify=` / `udflow:delivery=` sentinels, the verdict/severity literals, reviewer selection, the acceptance-criteria gate, and the opus tiers are all unchanged.

### Added
- **Live browser evidence via Claude in Chrome** (new `references/browser-evidence.md`, linked from `SKILL.md`, lazy-loaded only for UI verification): a Detect → Use → Else-Disclose protocol for driving a real browser (`mcp__Claude_in_Chrome__*`; alternatives `mcp__Claude_Preview__*` / `mcp__playwright__*`). In **Tier-2 `--deep` + UI in scope** the live drive is a **required** verification step (absence → a disclosed gap the `gatekeeper` weighs); standard-mode browser evidence is unchanged (best-effort). The orchestrator/main thread drives it (reviewers stay read-only/isolated); a screenshot budget of one canonical shot per *changed* state (no crawl, no silent caps); evidence is **distilled** (path + one-line result + console/network anomalies only) before entering the Review Packet, so raw DOM/vision is never fanned to every reviewer. `references/deep-mode.md` (Tier 2), `references/external-capabilities.md`, and `references/verification-gate.md` point to it. It carries an explicit **data-sensitivity disclosure** (mirroring the codebase's Codex / ui-ux-pro-max / observability norm): driving a real authenticated browser and reading its page text / network / console — and capturing screenshots — can expose cookies / tokens / PII, so prefer a non-production target, create `output/udflow/evidence/.gitignore` (`*` + `!.gitignore`), never paste sensitive `--report full` screenshots into public PRs/issues, and avoid destructive live interactions.

### Changed
- **`--report full` cost broken into billable components** (`references/final-report.md`): the Cost table now itemizes **Input / Output / Cache-write / Cache-read** (plus the New-tokens total and the share bar), each cell carrying its `observed` / `estimate` / `not reported` basis (an unobserved per-subagent split is never shown as observed), with the per-model rate assumption named. The compact one-line cost summary is unchanged; the compact `~~~markdown` fence and its sentinel/verdict literals are byte-identical (the 5d guard is untouched).
- **ui-ux-pro-max required at planning for design-system work** (`SKILL.md` step 2, `references/external-capabilities.md`): when a task's scope is **design generation / a design system** (new screens or components, visual redesign, design tokens/system, theming, brand), consulting an available `ui-ux-pro-max` is now **required** — record its style / palette / font / UX decisions in the plan, or disclose the fallback to the internal `ui-ux-reviewer`. Adds a **visual-consistency** clause (reuse the existing visual system, or justify a better alternative) and defers any **asset generation** (file-writing logo/mockup/banner) to post-approval implementation so the plan-gate read-only invariant holds. The trigger is narrowed — small UI tweaks keep the existing soft consult.
- **`--report full` embeds the final changed-UI screenshots** (`references/final-report.md`, `references/verification-gate.md`): the UI/UX evidence row now embeds the **final post-fix** after-change screenshot of each **changed** UI state as a clickable relative path under `output/udflow/evidence/`; an Artifact Hygiene carve-out keeps these as **evidence** (create `output/udflow/evidence/.gitignore` with `*` + `!.gitignore` so the screenshots are never committed yet the ignore file itself travels; the relative report links resolve only on the local working tree), not throwaway scaffolding. The compact report stays text-only.
- **New structure-validator guard (5e)** (`.github/scripts/validate-structure.mjs` + a paired `test/hooks.test.mjs` regression): asserts the `--report full` cost table keeps its `Input` / `Output` / `Cache-write` / `Cache-read` columns (mirrors the existing 5d compact-fence guard), so the new cost breakdown cannot silently revert to a single `Tokens` column with every other gate still green.

### Notes
- **Token discipline preserved/strengthened.** New cost lives only in already-opt-in modes (`--deep` / `--report full`); the new browser-evidence reference is lazy-loaded so non-UI runs never pay for it; screenshots are vision-only in `--deep` / `--report full`; evidence distillation keeps raw DOM/vision out of the per-reviewer context; `SKILL.md` gains only thin pointers (detail in lazy-loaded references), keeping the always-on prefix stable.
- **No hook / sentinel change.** The three hooks are byte-unchanged; the machine-checked tokens are byte-identical and still emitted last; reviewer selection, the gate, the repair loop, and the opus tiers are unchanged. EN ↔ zh-TW README in sync (top-level `##` section-count parity preserved).
- Dogfooded via udflow `--deep --report full` (spec / test / architecture / security / ui-ux / operability panel + gatekeeper at max effort): the panel surfaced **2 security majors** — the browser drive's missing data-sensitivity disclosure, and the screenshot → embedded-in-report distribution-leak path — both **fixed before READY**, plus several clarity minors (deep-mode scope-binding, the 5e cost-table guard, ui-ux-pro-max hard-dependency phrasing, a destructive-interaction guardrail, link portability). `node --test` and `node .github/scripts/validate-structure.mjs` green. Note: udflow's own repo has no web UI, so the req1/req4 runtime (live browser / screenshots) could not be exercised here — disclosed as a runtime gap; the contract/doc changes are validator- and test-verified.

## [0.22.0]

Borrow four context/cost-discipline ideas from the headroom compression project and fold them into udflow's own contract references — making the existing cost discipline **more concrete and harder to drift**. Spec/docs-only: **no code, no hook, no machine-token change**; reviewer selection, gate logic, and opus tiers are unchanged.

### Changed
- **Filtered-diff retrieval pointer** (`references/review-packet.md`, mirrored in `references/reviewer-common.md`): the Review Packet's `Changed diff (filtered)` field must now carry a retrieval pointer — *what* was trimmed (cap / path scope / excluded paths / truncated hunks) and the exact command to regenerate the **same-scoped** untrimmed diff — so a reviewer who needs more follows a pointer instead of reconstructing what was dropped or running a bare `git diff` that yields a differently-scoped view. The Handoff Template gains `— Trimmed:` / `— Regenerate (same scope):` sub-lines, the filtered-diff contract bullet now backs the existing "does not cap your investigation" promise with the concrete pointer, and a matching scope-discipline bullet was added to `reviewer-common.md` so the source-of-truth owns the contract (closing a prior block-only asymmetry).
- **Per-content-type "filter noise" recipes** (`references/verification-gate.md`): the single "filter noise, not signal" rule is expanded into concrete recipes by content type — diffs (`--stat` then targeted `git diff <path>`), test/build output (failing assertion + first failing frame, not passing-test spam), logs (error lines + context, never the failing stanza), searches (`rg -l`/`-c` to locate then pull context). Each is framed as *how to filter without dropping signal*; the existing absolute ("preserves 100% of the decision-relevant detail … Never trade recall for fewer tokens") is retained verbatim. The one-line rule in the synced spots (`review-packet.md` handoff block + `reviewer-common.md`) gains the same compact typed cues and is now **byte-identical between the two** (an existing `;` vs `, but` drift was reconciled).
- **Cache-friendly context ordering** (`references/runtime-policy.md`): a new principle — keep the stable shared preamble byte-stable (the verbatim reviewer-contract block is cacheable precisely because it is identical per handoff), load delivery-only references late (`final-report.md` already loads at delivery), and append rather than reorder/rewrite context already in the window — so the provider's prompt-cache prefix keeps hitting (cache reads bill ~1/10). Framed cost-free (ordering/timing, never content); an honest-scope note records that the Handoff Template field order is intentionally left as-is for readability.
- **Tagged cost-estimate basis** (`references/final-report.md`): the cost-honesty rule is standardized — **every figure carries its basis** (`observed` vs `estimate`), an estimate must state its assumption (per-model rate + date, or tokens-only + "× your plan's rate"), an unobserved subagent figure is `not reported` (never guessed), and the grand total is never shown as pure `observed` (the full-report Total row carries its `observed + estimate` basis verbatim). The fenced compact/full Cost lines and the `Source` column literals are unchanged, so the validate-structure 5d compact-fence guard and the machine sentinels are untouched.

### Notes
- **Quality unchanged by construction.** These are context-hygiene and contract-clarity edits; the analysis reviewers and gatekeeper perform is identical. The machine-checked tokens (`blocker` / `major` / `minor`, `READY` / `FIX REQUIRED` / `NOT READY`, the `udflow:` sentinels) are byte-identical and still emitted last; reviewer selection, the acceptance-criteria gate, the repair loop, the opus tiers, the three hooks, and the sentinel contracts are all unchanged.
- **No README change** — none of the four edits adds a user-facing knob, so the "Options & opt-ins" tables are untouched and bilingual README top-level section-count parity is preserved.
- Dogfooded via udflow `--deep` (spec / test / architecture panel + adversarial verification + gatekeeper at max effort) → **READY** on the first iteration; one non-blocking minor noted and applied (aligned the cost-basis prose with the unchanged `observed + estimate` Total-row literal).
- Spec/docs-only — no code or hook change. `node --test` green (128 pass / 0 fail / 2 environment-conditional skips) and `node .github/scripts/validate-structure.mjs` passes (versions agree across `plugin.json` / `marketplace.json` / `package.json` + this CHANGELOG entry; bilingual README parity).

## [0.21.0]

Cut udflow's token cost without touching review or verification quality, plus a consolidated README reference of every opt-in. The savings come entirely from **output presentation, context hygiene, and noise-filtering** — the analysis the reviewers and gatekeeper do is unchanged. **No change to reviewer selection, gate logic, or opus tiers — review/verification quality is unchanged.**

### Changed
- **Compact final report by default + `--report full` opt-in** (`references/final-report.md`): the end-of-run report now renders compact by default — Summary one-liner, Verification Checks table, acceptance-criteria line, Findings severity table, a one-line cost summary, the Final Verdict, and the two machine sentinels last (plus the `Live run` evidence block on real runs). `--report full` restores the detailed tables (Outcome, per-agent activity, Files Changed, full cost table + `█`/`░` share bar, Assumptions / Missing-Tests / Risks). The **duplicate mermaid token-share pie chart was removed** in both modes (it only restated the cost table). The verdict + severity literals (`READY` / `FIX REQUIRED` / `NOT READY`, `blocker` / `major` / `minor`) and the `udflow:verify=` / `udflow:delivery=` sentinels are preserved verbatim and still emitted as the last lines; command-exit-status authority and the no-telemetry cost-honesty note are retained.
- **Report contract split into its own reference** (`references/final-report.md`, lazy-loaded at delivery): the Final Output Contract / Presentation / Cost-honesty / Evidence-Record sections moved out of `references/verification-gate.md` (which keeps all during-verification content), so the report template is only loaded when a run reaches delivery. `SKILL.md` step 9 and Reference Loading were repointed accordingly.
- **"Filter noise, not signal" command-output discipline** (`references/verification-gate.md`, `references/reviewer-common.md`, mirrored in `references/review-packet.md`): run checks at minimal verbosity and filter command/inspection output to decision-relevant detail (failures over passing spam; `git diff --stat` to orient then targeted `git diff <path>`; `rg -l`/`-c` to locate then pull context) — with the explicit guardrail **"never omit decision-relevant detail; a smaller view is free only when it keeps 100% of the signal."**
- **Filtered diff carried in the Review Packet, reviewer Read freedom kept** (`references/review-packet.md`): the orchestrator runs `git diff` once (filtered / capped) and hands it to reviewers as a shared starting point, with an explicit clause that reviewers keep **full Read / Grep freedom** — read further whenever the diff is insufficient (omissions / cross-file issues often require it). Nothing discourages reading.
- **Strengthened reviewer no-echo output rule** (`references/reviewer-common.md`, mirrored in `references/review-packet.md`): reference code by `path:line`; do not restate or echo the diff or file contents already provided — cite location instead. The existing "expand to prose only where one line would lose evidence" exception is retained.
- **New README "Options & opt-ins" overview** (`README.md` / `README.zh-TW.md`): one consolidated section listing every flag / setting / env var / external capability with purpose · impact · default — including the new `--report full` — placed after "What you're opting into", linking the existing detailed sections rather than duplicating them. EN ↔ zh-TW in sync; flag tokens and config keys verbatim across both.

### Notes
- **Quality unchanged by construction.** Cutting presentation never lowers quality (the analysis already happened); cutting context only removes noise, never signal. The machine-checked tokens (`blocker` / `major` / `minor`, `READY` / `FIX REQUIRED` / `NOT READY`, the `udflow:` sentinels) are byte-identical and still emitted last, so `orchestration-check.js` parses the report exactly as before. Reviewer selection, the acceptance-criteria gate, command-exit-status-over-prose authority, gatekeeper re-rating, the repair loop, the opus tiers (`security-reviewer` + `gatekeeper`), the three hooks, and the sentinel contracts are all unchanged.
- Spec/docs-only — no code or hook change. `node --test` and `node .github/scripts/validate-structure.mjs` expected green (versions agree across `plugin.json` / `marketplace.json` / `package.json` + this CHANGELOG entry; bilingual README parity).

## [0.20.2]

Fix a follow-on to the 0.19.0 cross-harness hook fix: the plugin could still brick the GitHub Copilot CLI on Windows under **PowerShell StrictMode**. The 0.19.0/0.20.1 hook commands kept a trailing `${CLAUDE_PLUGIN_ROOT}` belt-and-suspenders argument; under PowerShell that is an *unset variable* reference, and with `Set-StrictMode` enabled (a user-profile setting some shells load) it throws a **terminating error before `node` starts** — so the in-script fail-open can't help, the hook "errors", and Copilot fail-closed denies every Bash/edit. The hook commands now contain **zero shell-template tokens** and resolve the plugin root purely from `process.env`.

### Fixed
- **StrictMode-safe hook launch — no shell-template token at all** (`hooks/hooks.json`): each command dropped the trailing `${CLAUDE_PLUGIN_ROOT}` argument (and the `process.argv[1]` fallback). It is now `node -e "try{var r=process.env.CLAUDE_PLUGIN_ROOT||process.env.COPILOT_PLUGIN_ROOT||process.env.PLUGIN_ROOT;if(r)require(r+'/hooks/<hook>.js')}catch(e){process.exit(0)}"`. With no `${}` to expand, the command is identical under bash, PowerShell, and cmd, and survives PowerShell StrictMode. Both harnesses provide the root as an environment variable (Claude Code sets `CLAUDE_PLUGIN_ROOT`; the Copilot CLI sets `CLAUDE_PLUGIN_ROOT` / `COPILOT_PLUGIN_ROOT` / `PLUGIN_ROOT`), so `process.env` resolves it on both. Fail-open is preserved and airtight: `require` runs only when a root env var is set (so the path is always absolute, never a bare specifier that could trigger a `node_modules` lookup), any error inside it → `catch` → exit 0, and an unset root simply skips the hook. The three hook scripts are byte-unchanged.

### Notes
- **No behavior change on Claude Code.** The scripts are untouched and the root still resolves from `process.env.CLAUDE_PLUGIN_ROOT` (a documented Claude Code hook env var); deny JSON and machine tokens are identical. Verified under `bash -c`, `pwsh -c`, and `pwsh -c "Set-StrictMode -Version Latest; …"`: a plan-mode Write is DENIED, a non-plan Bash is ALLOWED, an unresolvable root fails open. `test/hooks-portability.test.mjs` now forbids any `${}` token and adds a StrictMode regression case.
- `node --test` green; `node .github/scripts/validate-structure.mjs` passes.

## [0.20.1]

Harden the Stop-hook `orchestration-check` against two provenance/binding spoofs in which a real `Task` / `tool_result` block could silence a release-gating advisory. Both need an uncommon transcript shape, but they touch the product's core promise — a panel/verdict gate that actually fires — so they are fixed at the source and pinned by regression tests. Hook scripts are otherwise unchanged and every existing orchestration-check path behaves identically.

### Fixed
- **Panel/gatekeeper provenance reads the structured field, not the serialized input** (`hooks/orchestration-check.js`): panel-presence and gatekeeper-id detection previously `JSON.stringify`'d the whole `Task.input` and regex-scanned it for `subagent_type`, so free text in a sibling field — e.g. a real `gatekeeper` Task whose **prompt** quoted the literal token `subagent_type: spec-reviewer` — could falsely mark the spec/test reviewers as having run and silence the panel-missing advisory. Detection now reads only the explicit `subagent_type` / `agentType` / `agent_type` field (a string input is JSON-parsed first; anything unreadable yields `""`, i.e. "did not run" — fail-safe toward warning, never toward a silent pass). Merely *mentioning* a reviewer name in prose was already handled and still warns.
- **Verdict id-less fallback is transcript-level, not per-result** (`hooks/orchestration-check.js`): the gatekeeper verdict binds by `tool_use_id`, with an id-less fallback for older / id-free transcripts. That fallback was applied per-result, so a stray id-less `tool_result` containing the word `READY` (e.g. a deploy/build log) appended after an id-bound gatekeeper `NOT READY` became the last verdict and silenced the verdict-not-honored advisory. The id-less fallback now applies only when **no** pre-final `tool_result` carries an id at all (binding genuinely impossible), matching the code's documented intent.

### Notes
- **Behavior preserved.** All existing orchestration-check paths are unchanged (the id-less verdict tests, the prose / non-Task spoof tests, the localized-summary tests). Two regression tests added to `test/hooks.test.mjs` pin the two gaps — each fails on the prior hook and passes on this one. `node --test` green (127 tests); `node .github/scripts/validate-structure.mjs` passes (versions agree across `plugin.json` / `marketplace.json` / `package.json` + this CHANGELOG entry; bilingual README parity).
- **Scope/severity:** an external panel review labeled the provenance gap a release blocker via a repro that does not actually reproduce (a gatekeeper prompt merely *mentioning* the reviewers — which correctly warns). The real trigger requires the literal `subagent_type:` token inside a single input value, which orchestrators do not naturally emit; it is fixed regardless as defense-in-depth on the core gate.

## [0.20.0]

GitHub Copilot CLI compatibility for subagents: agent files renamed to `*.agent.md` and explicitly wired via the `plugin.json` `agents` array, so the review/gatekeeper panel loads under Copilot CLI as well as Claude Code. Claude Code behavior is unchanged (identity is frontmatter `name:`; hooks and skills untouched). Plan-gate enforcement and deep-mode Workflow remain Claude-only (Copilot has no plan mode).

### Changed
- **Agent files renamed `<name>.md` → `<name>.agent.md`** (`agents/`, all nine: `implementer`, `spec-reviewer`, `test-reviewer`, `code-reviewer`, `security-reviewer`, `architecture-reviewer`, `operability-reviewer`, `ui-ux-reviewer`, `gatekeeper`) and **wired via a new `plugin.json` `agents` array** — the convention/manifest the GitHub Copilot CLI needs to discover and load them. Renames only: each agent body and its frontmatter `name:` (which is the identity Claude Code uses) are byte-unchanged. No `hooks` or `skills` field was added to `plugin.json` (those are replace-default in Claude Code; an explicit `hooks` path would double-load the hooks) — only `agents`.
- **Prose pointers** (`SKILL.md`, `references/review-packet.md`, `references/runtime-policy.md`) updated to the new `agents/gatekeeper.agent.md` path; **README Compatibility** (`README.md` + `README.zh-TW.md`) updated to note subagents now load under Copilot CLI (this change), skills already use the Copilot-discoverable `skills/<name>/SKILL.md` layout, and plan-gate enforcement + deep-mode Workflow stay Claude-only.

### Notes
- **Behavior preserved on Claude Code.** Hooks (`hooks/`) and skills are untouched; the agent roster Claude Code loads is identical (same nine frontmatter `name:` values). A new regression test (`test/agents-manifest.test.mjs`) asserts the manifest `agents[]` set equals the `*.agent.md` files on disk and that the frontmatter-name set is exactly the expected nine. The validator now (a) looks for `agents/<name>.agent.md` and (b) fails the build if a roster agent is not wired in `plugin.json` `agents[]`.
- `node --test` green; `node .github/scripts/validate-structure.mjs` passes (versions agree across `plugin.json` / `marketplace.json` / `package.json` + this CHANGELOG entry; bilingual README parity).
- **Honest limit:** cross-harness loading is derived from each tool's documented plugin format and the in-repo structural guards (validator + `agents-manifest.test.mjs`); it has not been live-verified on a Copilot CLI install. The earlier hook-portability fix (0.19.0) *is* tested across shells.

## [0.19.0]

Make the plugin's hooks **cross-harness portable** so they never hard-block a non-Claude-Code host. Previously each hook ran `node "${CLAUDE_PLUGIN_ROOT}/hooks/<hook>.js"`, which relies on POSIX `${VAR}` shell expansion. The GitHub Copilot CLI runs hooks via **PowerShell** on Windows, where `${CLAUDE_PLUGIN_ROOT}` is an empty PowerShell variable (env vars are `$env:`), not the path — so `node` got an unresolved path, the hook "errored", and Copilot **fail-closed denied every Bash/edit**, bricking the session. The hooks now resolve the plugin root from the environment at runtime and fail **open**.

### Changed
- **Portable, fail-open hook launch** (`hooks/hooks.json`): each hook command is now `node -e "try{require((process.env.CLAUDE_PLUGIN_ROOT||process.env.COPILOT_PLUGIN_ROOT||process.env.PLUGIN_ROOT||process.argv[1])+'/hooks/<hook>.js')}catch(e){process.exit(0)}" "${CLAUDE_PLUGIN_ROOT}"`. Node — not the shell — resolves the plugin root from `process.env` at runtime, so no shell `${}` expansion is needed (the GitHub Copilot CLI exports `CLAUDE_PLUGIN_ROOT` / `COPILOT_PLUGIN_ROOT` / `PLUGIN_ROOT` as env vars); the trailing `${CLAUDE_PLUGIN_ROOT}` is a belt-and-suspenders fallback (via `process.argv[1]`) for a host that supplies the root only via `${}`-template substitution (e.g. Claude Code); the `try/catch` makes an unresolvable root **allow** (exit 0) instead of error, so a hook can never brick a session. The three hook scripts (`plan-gate.js`, `load-failure-memory.js`, `orchestration-check.js`) are byte-unchanged.
- **README Compatibility note** (`README.md` + `README.zh-TW.md`): Claude Code is the primary target; under other harnesses (e.g. GitHub Copilot CLI) the hooks now degrade gracefully (fail-open) rather than block, and the full workflow still needs Claude's plan mode / subagents. Includes how to disable udflow for Copilot only.

### Notes
- **Behavior preserved on Claude Code.** The hook scripts are unchanged, so the deny JSON and machine tokens (`blocker` / `major` / `minor`, `READY` / `FIX REQUIRED` / `NOT READY`, the `udflow:` sentinels) are identical. Verified by running the exact new command under both `bash -c` and `powershell -c`: a plan-mode Write is DENIED, a non-plan Bash is ALLOWED, and an unresolvable root fails open (exit 0). New regression test `test/hooks-portability.test.mjs` locks this in.
- `node --test` green; `node .github/scripts/validate-structure.mjs` passes (versions agree across `plugin.json` / `marketplace.json` / `package.json` + this CHANGELOG entry; bilingual README parity).

## [0.18.0]

Cut the tokens udflow spends on review without changing review behavior. Three surgical edits to the shared reviewer contract: compress the rules delivered into every reviewer handoff, report each finding as one compact line instead of a prose paragraph, and stop the seven reviewer agents from restating the base-output fields (defer to the single source of truth). The recall rules are preserved verbatim in meaning; the saving is the recurring, output-billed finding text plus a one-time per-agent dedup.

### Changed
- **Reviewer findings → one compact line** (`references/review-packet.md`, `references/reviewer-common.md`): a finding is now reported as a single line — `severity` · `file:line`/contract/component/path · the concrete failure or violated contract · smallest safe fix — rather than a prose paragraph, with an escape hatch ("expand to prose only where one line would lose evidence"). Same fields as before — a density change, not a field change — kept in sync between the runtime-delivered block and the source of truth.
- **Compressed four rules of the "Shared reviewer contract" block** (`references/review-packet.md`): judge-on-merits, severity-by-impact, look-for-omissions, and enumerate — trimmed connective prose while preserving every operative clause (the omission trigger "a value … that should be set" is retained).
- **Deduplicated reviewer base-output** (`agents/*-reviewer.md`, all seven): each reviewer's `## Required output` now defers to `references/reviewer-common.md` ("one compact line per finding") instead of restating the base fields, so future base-output edits touch only the source of truth. Each reviewer's domain-specific `plus:` fields are unchanged.

### Notes
- **Behavior preserved (效果不變).** The machine-checked tokens (`blocker` / `major` / `minor`, `READY` / `FIX REQUIRED` / `NOT READY`, the `udflow:` sentinels) are byte-identical and equal in count before vs after; every recall rule's operative clause is retained. The reviewer-contract change was verified by dogfooding udflow's own panel — `spec-reviewer` / `test-reviewer` / `code-reviewer` / `architecture-reviewer` plus `gatekeeper` → `READY`; the panel caught (and the repair fixed) an over-compression — a deleted omission trigger and a finding field that would have suppressed omission findings — before the gate. The agent-file dedup touched only the base-output reference line (no machine token, no domain field; all references still resolve).
- **Honest token trade-off.** The delivered instruction block grows ~+18 tokens once per reviewer handoff, while each finding's output drops ~50% — output-billed and recurring per finding and per repair-loop re-run — so the net is down for any review producing ≥1 finding (a zero-finding reviewer is a negligible net increase); the agent-file dedup additionally trims one restated line per reviewer. Spec/docs-only — no code or hook change. `node --test`: 104 tests, 0 fail (102 pass / 2 skipped; skip count is OS-symlink-privilege dependent). `node .github/scripts/validate-structure.mjs` passes — version agrees across `plugin.json` / `marketplace.json` / `package.json` / this CHANGELOG entry.

## [0.17.0]

Make the merged final report **visual**: tables wherever a list fits, light terminal-renderable cues, and a mermaid chart for richer viewers.

### Changed
- **Report presentation** (`references/verification-gate.md`): the end-of-run report now uses **tables** for Files Changed, Checks, Cost, Findings, Per-agent activity, Outcome, and Failure Memory (Assumptions / Missing Tests / Risks stay narrative bullets); a `█`/`░` **Share bar** in the cost table (observed figures only); **status glyphs** (✅ / ❌ / ⚠️ for checks, 🔴 / 🟠 / 🟡 for severities, a verdict glyph); and a **mermaid `pie`** of the token split that renders in IDE / GitHub viewers (a terminal shows the code block, so the table stays the readable primary). A new **Presentation** rule block governs all of it.
- `SKILL.md` (step 9), `README.md` / `README.zh-TW.md`: note the visual presentation (EN/zh in sync).

### Notes
- **Glyphs are decoration only — the machine-checked literals (`READY` / `FIX REQUIRED` / `NOT READY`, `blocker` / `major` / `minor`, the `udflow:` sentinels) stay as plain words beside them**, so the Stop hook reads the report exactly as before. Honesty preserved: bars and charts are drawn only from observed figures and never imply precision the no-telemetry numbers lack. Spec/docs-only — no code or hook change. `node --test`: 104 tests, 0 fail (102 pass / 2 skipped; skip count is OS-symlink-privilege dependent). `node .github/scripts/validate-structure.mjs` passes — version agrees across `plugin.json` / `marketplace.json` / `package.json` / this CHANGELOG entry.

## [0.16.0]

Merge udflow's end-of-run output into **one report**. A substantial run used to emit three overlapping artifacts — the Final Output Contract template, the compact **Run Card**, and the table-based **Run Report** — duplicating verdict / checks / findings / acceptance / cost. They are now a single report whose top-level structure is the contract's sections, with the Run Card and Run Report detail folded in and the machine sentinels kept as the footer.

### Changed
- **Single end-of-run report** (`references/verification-gate.md`): the Final Output Contract is now the one report. `Summary` carries the **Outcome** (requirement → change → effect) and **Per-agent activity** tables; `Verification` carries **Acceptance criteria**, **External capabilities**, the **UI/UX** after-change screenshot, and the **token & cost** table (observed vs estimated, no telemetry). The standalone `## Run Card` and `## Run Report` sections are **removed** — their content lives in those sections, and the two machine sentinels (`udflow:verify=` / `udflow:delivery=`) remain the last lines. The Evidence Record (real runs) is unchanged and sits just above the footer.
- `SKILL.md` (step 9), `skills/run/SKILL.md`, `README.md` / `README.zh-TW.md`: describe the single report instead of "Run Card + Run Report" (EN/zh in sync).

### Notes
- No behavior change for the Stop hook: the merged report still carries the verdict literal (`## Final Verdict`), the `blocker`/`major`/`minor` labels (`## Findings`), and the sentinel footer (read by a last-match scan), so `orchestration-check.js` reads it identically. Spec/docs-only — no code or hook change. `node --test`: 104 tests, 0 fail (102 pass / 2 skipped; skip count is OS-symlink-privilege dependent). `node .github/scripts/validate-structure.mjs` passes — version agrees across `plugin.json` / `marketplace.json` / `package.json` / this CHANGELOG entry.

## [0.15.0]

Make logging a real run **paste-friendly end to end**: slim the `Verified udflow run` issue form so a run files in as essentially three picks and one paste, and have udflow print a matching record at the end of a real run.

### Changed
- **`Verified udflow run` issue form slimmed to a paste-first shape** (`.github/ISSUE_TEMPLATE/verified-run.yml`): from 14 fields down to **two dropdowns (run type, final verdict) + a reviewers checkbox group + one required `Run details` textarea + an optional evidence/links box**. `Run details` is pre-seeded with the Live-run skeleton (date, stack, language, task, intent, verification, **caught**, **missed**, **false alarms**, **outcome**), so a contributor pastes udflow's `### Live run` block straight in or fills the skeleton. The honest-negatives prompts (Missed / False alarms / Outcome) are kept so the form still pulls more than just wins; the categorical fields stay structured for normalization and the graduation tally.
- **Evidence Record intro no longer overstates** (`references/verification-gate.md`): it previously implied the single `### Live run` block could drop into *either* `EVIDENCE.md` *or* the issue "with no reformatting"; it now says the block pastes into `EVIDENCE.md` **and** the issue form's `Run details` box.
- `CONTRIBUTING.md`, `README.md` / `README.zh-TW.md`: the contribute-a-run guidance matches the slimmer form (EN/zh in sync).

### Added
- **Issue-form sheet at the end of a real run** (`references/verification-gate.md`, Evidence Record): after the `### Live run` block, udflow now prints the few remaining form choices — `[select]` run type + verdict, `[check]` reviewers, `[paste]` the block into `Run details` — so "drop it straight into the issue" actually holds. Marker words / prose follow the user's language; field names + option literals stay verbatim; the sheet carries a "keep in sync with `verified-run.yml`" note.

### Notes
- Spec / docs / issue-template only — no code or hook change. `node --test`: 104 tests, 0 fail (102 pass / 2 skipped; the skip count is OS-symlink-privilege dependent). `node .github/scripts/validate-structure.mjs` passes — version agrees across `plugin.json` / `marketplace.json` / `package.json` / this CHANGELOG entry.

## [0.14.1]

Docs-only — a bilingual README sync pass after 0.11.0–0.14.0.

### Changed
- **Cost table surfaces the `--lite` knob** (`README.md`, `README.zh-TW.md`): the Light row now reads "`--lite` — core only", mirroring how the Deep row already shows `--deep`, so all three cost tiers (lite / default / deep) map to their knob.

### Notes
- A bilingual README audit otherwise found the docs already in sync with 0.11.0–0.14.0 (verify sentinel + values, command-evidence authority, acceptance-criteria gate, Run Card / Run Report) and EN↔zh symmetric. In particular the cost-table token figures are correct and were **not** changed — zh `50萬 / 200萬 / 1000萬` = `0.5M / 2M / 10M`, matching EN `~0.5–2M / ~2–7M / >10M` (萬 = 10⁴).
- No code or hook change. `node --test`: 104 tests / 100 pass / 0 fail / 4 skipped (unchanged); `node .github/scripts/validate-structure.mjs` passes.

## [0.14.0]

Adds a richer, more legible end-of-run **Run Report** (**prose/persona only**; no hook) on top of the compact Run Card — so after a multi-agent run the user can see what each agent did, what the change achieved, and what it cost.

### Added
- **Run Report** (`references/verification-gate.md`, `SKILL.md` step 9): for substantial tasks the orchestrator follows the compact Run Card with a table-based report containing —
  - **Outcome** — requirement / acceptance criterion → what changed → effect / improvement (before → after);
  - **Per-agent activity** — each agent/phase: what it did, what it found (by severity), what it fixed;
  - **Token & cost** — per-agent **observed** tokens + an **estimated** orchestrator figure + a grand total + an approximate **$** band. Honesty rules built in (udflow ships no telemetry): subagent token figures are observed (from the tooling, e.g. `subagent_tokens`), the main-thread figure is an estimate, "not reported" is used when a figure was not surfaced, figures are *new tokens* (the billable `/cost` total is ~20–30× higher via cache reads), and `~Cost` is a rough band with stated rate assumptions — never a fabricated bill;
  - **UI/UX evidence** — the after-change screenshot for UI work (per the Browser Evidence discipline), or "no UI/UX impact"; only real captured screens, never fabricated.

### Changed
- `README.md` / `README.zh-TW.md`: the verification-gate section documents the Run Report and its no-telemetry observed-vs-estimated honesty posture.

### Tests
- **No new behavioral tests** — prose/persona change with no new hook code or machine-checkable surface (the report is orchestrator-produced, not hook-enforced). `node --test` is unchanged at 104 tests / 100 pass / 0 fail / 4 skipped (the 4 skipped are platform symlink/case tests), and `node .github/scripts/validate-structure.mjs` passes (version 0.14.0 agreement across the four manifests, CHANGELOG entry, README parity, hook wiring).

## [0.13.0]

Adds suggestion #4 — a downward **`--lite` cost knob** plus up-front cost visibility, so cost is "visible **and** adjustable" (**prose/persona only**; no hook). It complements the existing risk-proportional auto-scaling and the `--deep`/`--no-deep` upward knob.

### Added
- **`--lite` cost floor** (`references/reviewer-selection.md`, `references/deep-mode.md`, `skills/run/SKILL.md`, `SKILL.md`): `/udflow:run --lite` forces the smallest sufficient panel (core `spec-reviewer` + `test-reviewer`, plus `code-reviewer` when code changed), skips the other conditional reviewers and deep mode — the downward counterpart to `--deep`. **Safety floor:** when a genuine high-risk signal is present (auth / secrets / schema-migration / destructive / …), `--lite` keeps the one directly-relevant safety reviewer and discloses it rather than silently dropping coverage — a disclosed recall/cost tradeoff, not a license to skip a needed discipline.
- **Up-front cost visibility**: the orchestrator states the selected review panel and its cost tier (lite / default / deep) at the plan gate so the user can adjust before approving; the Run Card's `Cost` line now carries the tier (`references/verification-gate.md`, `SKILL.md` step 2 + step 5). The "which panel / how much" was already recapped in the Run Card after the fact (0.11.0); this makes it visible and adjustable up-front too.

### Changed
- `README.md` / `README.zh-TW.md`: the "Cost per run" section documents the three cost knobs (lite / default / deep) and up-front adjustability.

### Tests
- **No new behavioral tests** — prose/persona change with no new hook code or machine-checked surface (panel selection is orchestrator-followed, not hook-enforced). `node --test` is unchanged at 104 tests / 100 pass / 0 fail / 4 skipped (the 4 skipped are platform symlink/case tests; confirming no hook was disturbed), and `node .github/scripts/validate-structure.mjs` passes (version 0.13.0 agreement across the four manifests, CHANGELOG entry, README parity, hook wiring).

## [0.12.0]

Adds suggestion #3 — user-approved **acceptance criteria** with a per-item gate check (**prose/persona only**; no hook and no new sentinel, keeping udflow's "gate = gatekeeper" philosophy and minimal surface). The deepest release signal isn't "no bugs," it's "did what you asked, and confirmed it."

### Added
- **Acceptance-criteria gate** (`SKILL.md`, `agents/gatekeeper.md`, `references/review-packet.md`, `references/verification-gate.md`): for non-trivial work the orchestrator turns the requirement into a short, numbered, **user-approved** acceptance-criteria checklist at the plan gate (on high-risk work these *are* the plan-grounding sharpened contract), carries it into the Review Packet, and the `gatekeeper` checks **each item** — `met` (with evidence) / `unmet` / `deferred` (only with explicit user consent). An `unmet`, non-deferred criterion **blocks `READY`**. The Run Card and Final Output Contract surface the per-criterion result. This is a distinct gate from command-evidence: green checks do not imply the requirement was met.

### Changed
- The Review Packet's "Success criteria" field and template slot become first-class **"Acceptance criteria (user-approved)"** (`references/review-packet.md`); `plan-grounding.md` notes the sharpened contract forms the user-approved acceptance criteria; `spec-reviewer.md` judges requirement fidelity against the criteria (the `gatekeeper` makes the final per-criterion ruling); `README.md` / `README.zh-TW.md` document the acceptance-criteria gate.

### Tests
- **No new behavioral tests** — this is a prose/persona change with no new hook code or machine-checked surface (the gate is the `gatekeeper` persona, not a hook). `node --test` is unchanged at 104 tests / 100 pass / 0 fail / 4 skipped (the 4 skipped are platform symlink/case tests; confirming no hook was disturbed), and `node .github/scripts/validate-structure.mjs` passes (version 0.12.0 agreement across the four manifests, CHANGELOG entry, README parity, hook wiring).

## [0.11.0]

Adds the **depth** half of udflow's "no verification, no delivery" promise — a verification sentinel, a gatekeeper command-evidence authority rule, and a user-visible Run Card — alongside a batch of repo hardening (a SessionStart symlink-containment fix, a Stop-hook panel-safety-net fix, a CI wiring-gate fix) and two doc-honesty corrections. The new sentinel is **opt-in** and the hooks stay **fail-open / non-blocking**; when the sentinel is absent, behavior is identical to 0.10.8.

### Added
- **Verification sentinel `udflow:verify=pass|fail|unrun|na`** (`orchestration-check.js`, `SKILL.md`, `references/verification-gate.md`): the orchestrator MAY end its summary with a machine-readable rollup of whether the REQUIRED checks (build/test/typecheck on behavior-changing code) actually ran and exited zero. A new, third Stop-hook advisory warns — deterministically and language-neutrally — when the sentinel reports `fail`/`unrun` while the session is delivering, mirroring the v0.10.8 delivery sentinel (authoritative when present, no prose inference, fail-open). Absent the token the branch is inert, so existing sessions behave exactly as before. Both the verify and the delivery sentinel use a last-match scan, so the final rollup line wins over an earlier in-prose mention; `verifySentinel` is a tolerant decoder whose contract surface is the four literals `pass|fail|unrun|na`.
- **Gatekeeper command-evidence authority** (`agents/gatekeeper.md`): a new "Command-evidence authority (exit status over reviewer prose)" rule — a required check that exited non-zero, or was claimed but never actually ran, blocks `READY` no matter how clean the reviewer findings are; clean reviews can never upgrade a red/unrun required check. "The reviewers think it is fine" never overrides "the build is red."
- **User-visible Run Card** (`references/verification-gate.md`, `SKILL.md` step 9): substantial runs end with a compact card — verdict + which checks/reviewers ran + top findings + auto-fixed + remaining + approximate cost — in the user's language, keeping the verdict/severity/sentinel tokens verbatim. Directly addresses "many agents ran a long time and cost a lot, but I can't tell what happened."
- **Structured per-check verification evidence** (`references/review-packet.md`, `references/runtime-policy.md`): the Review Packet's "Verification evidence" field is now a per-check table (command / type / required? / ran? / real exit status / blocked-reason) the gatekeeper reads as authority; the table is for the gatekeeper/human only and is never parsed by the Stop hook (which reads only the single rollup token).

### Fixed
- **load-failure-memory: realpath containment + regular-file check** (`load-failure-memory.js`): the SessionStart hook read `<project>/ai/FAILURE_MEMORY.md` with no containment, so a malicious repo whose `ai/` (or `ai/FAILURE_MEMORY.md`) is a symlink/junction escaping the tree could redirect the auto-read to an out-of-project file (bounded — the content is already neutralized + nonce-fenced + labeled untrusted). It now injects only a regular file whose realpath stays inside the project root (or `~/.claude` for the global file), mirroring `plan-gate.js`'s realpath containment; symlink/junction escapes and non-regular targets are silently skipped (fail-open). The containment check returns the validated realpath and that realpath is what gets read, so the inode checked is the inode read — no second, unvalidated symlink resolution.
- **orchestration-check: the panel-missing advisory no longer self-suppresses on a mere block-token mention** (`orchestration-check.js`): it was gated on `!finalReportsBlock` (true whenever the final text contained `NOT READY`/`FIX REQUIRED` anywhere), so a mixed-history close ("was NOT READY earlier, but READY now, shipping") with no panel run was silently excused. It now gates on an honest HOLD (`holdsDelivery` / the `udflow:delivery=held` sentinel), so the contradictory mixed-history case warns while an honest hold stays silent.
- **validate-structure: hook matcher-coverage is bound to the hook's own entry** (`.github/scripts/validate-structure.mjs`): the wiring gate computed matcher coverage with `.some()` across all entries for an event, so once a second entry existed a different hook's matcher could falsely satisfy coverage for the target hook (latent today — one PreToolUse entry). Coverage is now scoped to entries whose command wires the target hook; strictly more restrictive, so the clean repo still passes.

### Changed (docs)
- **README failure-memory protection is no longer overstated** (`README.md`, `README.zh-TW.md`): the troubleshooting line said a repo memory file "can't act as instructions" (absolute), contradicting the project's own "best-effort / defense-in-depth" framing; it now says the injected content is treated as untrusted reference data — defense-in-depth, not an absolute guarantee.
- **README "installed" → "enabled"** (`README.md`, `README.zh-TW.md`): the plan-gate "honest limits" line said the hook runs "while installed", but `marketplace.json` sets `defaultEnabled:false` — hooks run only when enabled. Corrected (the zh line gains the "when enabled" qualifier for parity).

### Tests
- orchestration-check: `udflow:verify=fail`/`unrun` + delivering warns (exit-status-is-authority message); `verify=fail` + `delivery=held` and `verify=pass|na` + shipped stay silent; no `verify` token leaves the new branch inert (regression guard); verdict-not-honored still takes precedence (exactly one advisory); case/space tolerance and `udflow:` anchoring; a localized summary still warns; a `verify` token in a user message stays silent (finalText-scoped). orchestration-check F3: a mixed-history "NOT READY … READY, shipping, no panel" now warns; an honest hold stays silent. load-failure-memory: a symlink/junction escaping the project is not injected (skipped where links can't be created); a normal in-tree file still injects. validate-structure: a second event entry can no longer cover another hook's matcher gap. `node --test`: 104 tests / 100 pass / 0 fail / 4 skipped (the 4 skipped are platform symlink/case tests that can't run without privilege).

## [0.10.8]

Fixes a localized false positive that 0.10.7 itself introduced, by repairing the leaky base predicate behind it — and adds the **architectural** fix that ends the prose-inference cycle: an optional, language-neutral delivery sentinel. No change to defaults, reviewer selection, or the hooks' fail-open / non-blocking contract.

### Fixed
- **orchestration-check: an honest, non-English "not shipping" no longer cries wolf** (`orchestration-check.js`). Root cause: `assertsReadyVerdict` matched the bare `READY` inside `NOT READY`, so `claimsComplete`/`claimsShipReady` were true for honest *disclosures* of a block — and 0.10.7's `holdsDelivery` is English-only, so a localized honest hold carrying the verbatim `Blocker/Major/Minor` labels was wrongly nagged. `assertsReadyVerdict` now requires an **affirmative** `READY` (not the one in `NOT READY`), de-leaking every dependent predicate at once (this was also the latent cause of the `finalShipReady` over-fire). A localized honest hold is silent again; a localized *dishonest* "claims READY despite NOT READY" still warns.

### Added
- **Delivery sentinel — the structural fix (signal at the source).** The orchestrator MAY end its final summary with a machine-readable line — `udflow:delivery=held` (not delivering / honoring a block) or `udflow:delivery=shipped` (delivering) — and the Stop hook reads it **deterministically and language-neutrally** instead of inferring "shipping vs holding" from translated prose (the fragile part that produced the repeated false-positive class). When present it is authoritative for both advisories; when absent the prose heuristic remains as the fallback, so nothing hard-depends on it. `SKILL.md` step 9 instructs the orchestrator to emit it. This is the move that ends the "fix one prose case, break another" cycle for the verdict-not-honored check.

### Tests
- A non-English honest hold (verbatim severity labels) stays silent; `udflow:delivery=held` silences both advisories even with ship-ready prose; `udflow:delivery=shipped` warns on a blocking verdict even with hold-sounding prose. Verified empirically across the English contradictory / honest-partial / localized-honest / localized-dishonest / sentinel cases before adoption. `node --test`: 82 pass / 0 fail / 2 skipped.

## [0.10.7]

Closes a real miss on the highest-value advisory (a contradictory final), hardens one failure-memory neutralization gap, adds a static hook-wiring gate, and corrects several docs that drifted from the 0.10.6 behavior. No change to defaults, reviewer selection, or the hooks' fail-open / non-blocking contract.

### Fixed
- **orchestration-check: a contradictory final no longer slips through** (`orchestration-check.js`): the verdict-not-honored advisory was gated on the final NOT quoting the block token (`!finalReportsBlock`), so a final that *acknowledged* the block yet still claimed ship-ready ("the gatekeeper returned NOT READY, but it's ready to ship") was wrongly silenced. It now gates on whether the final **honestly holds delivery** — an explicit not-ship/stop/hold decision — so the contradictory case warns, while an honest "complete, but NOT READY, so I'm not shipping" stays silent. The hold check keys on the ship *decision*, not on problem words like "unresolved"/"blocked", and deliberately avoids `finalShipReady` (which is true for any text containing the bare "READY" inside "NOT READY" + "gatekeeper", so it would have cried wolf on honest reports). Verified empirically across the contradictory, honest-stop, honest-partial, and "unresolved-but-shipping" cases.
- **load-failure-memory: a role-marker in an entry TITLE is now neutralized** (`load-failure-memory.js`): a digest title renders as `- <title>`, and the role-marker regexes were strictly line-anchored, so a hostile `### system: ...` title slipped past as `- system: ...`. The neutralizer now tolerates a leading list marker, closing the gap. (The structured digest already injects titles + tags only, not the rule prose; an unstructured file still uses the neutralized, fenced raw fallback — a disclosed best-effort limit.)

### Added
- **CI hook-wiring gate** (`validate-structure.mjs`): the validator now asserts the three lifecycle hooks stay registered under the right events with matchers that cover the tools/lifecycles they must fire for (PreToolUse→plan-gate over Write/Edit/MultiEdit/NotebookEdit/Bash; SessionStart→load-failure-memory over startup/resume/clear/compact; Stop→orchestration-check) — an auth-free stand-in for a live install→enable→reload activation smoke, so a wiring regression that is still valid JSON can't pass green.
- **`RELEASING.md`** — documents what CI gates automatically and the manual clean-profile activation smoke (install→enable→reload→confirm each hook + the skill fire) that a headless runner can't do.

### Changed
- **Docs corrected to match 0.10.6 behavior:** the failure-memory digest is described as **titles + tags** (not "+ prevention rule") in `README.md`, `README.zh-TW.md`, `references/verification-gate.md`, and the hook's own header comment, and the raw-fallback limit is now disclosed in the README. The reviewers are described as **inspection-only** (Read/Grep/Glob/Bash, no editor tools; non-mutating by role/instruction, not a sandbox) instead of "read-only", and `references/reviewer-common.md` now carries an explicit "use Bash for inspection only; do not modify the working tree" instruction so the contract is actually backed.

### Tests
- orchestration-check: contradictory-final warns; honest "complete but not shipping" stays silent; a "unresolved … but ready to ship" override still warns. load-failure-memory: a `system:` title is neutralized despite the `- ` prefix. validate-structure: a hook dropped from its event fails; a PreToolUse matcher narrowed below the gated tools fails. `node --test`: 79 pass / 0 fail / 2 skipped.

## [0.10.6]

Binds orchestration-check evidence to the actual tools (not just any structured block), reduces the failure-memory injection surface, and clears two doc nits from the fourth external review. No change to defaults, reviewer selection, or the hooks' fail-open / non-blocking contract.

### Fixed
- **orchestration-check is now tool-BOUND, not just structure-scoped** (`orchestration-check.js`): 0.10.5 read evidence from any `tool_use` / `tool_result`, so a non-`Task` tool_use whose input merely contained `subagent_type: <reviewer>` (e.g. an `Edit` writing that string) could satisfy the panel check, and any `tool_result` that merely contained the verdict vocabulary (e.g. a `Bash` log printing "NOT READY") could trip the verdict-not-honored advisory. Panel presence is now read **only from real `Task` invocations** (a tool_use whose `name` is `"Task"`), and the gatekeeper verdict **only from a gatekeeper Task's own `tool_result`** (bound by `tool_use_id`; falls back to any pre-final tool_result when the transcript carries no ids, e.g. older formats). Both were reproduced against the live hook and now behave correctly, while a real gatekeeper Task result still warns.

### Changed
- **Failure-memory digest no longer injects prevention-rule prose** (`load-failure-memory.js`): the auto-injected SessionStart digest now lists entry **titles + tags only**; the imperative prevention-rule text is read on demand during planning (the full file is unchanged). This keeps repo-controlled imperative prose out of the always-on context — a smaller injection surface than relying on the nonce fence + untrusted-data label alone. (Unstructured memory files still use the raw, neutralized, fenced fallback — a disclosed best-effort limit.)
- **README "installed" → "enabled"** (`README.md`, `README.zh-TW.md`): the always-on-hooks line said hooks run "while the plugin is installed", which contradicted the opt-in / `defaultEnabled:false` framing; it now says "enabled" (installing without enabling does nothing).
- **MCP wildcard examples carry a narrow-it caveat** (`agents/spec-reviewer.md`, `security-reviewer.md`, `test-reviewer.md`, `ui-ux-reviewer.md`, `operability-reviewer.md`): each commented `mcp__<server>__*` example now points to the read-only-narrowing guidance in `references/external-capabilities.md` (the `code-reviewer` GitHub example was already de-wildcarded in 0.10.4).

### Tests
- orchestration-check: a non-Task tool_use carrying `subagent_type` does not count as a panel run; a verdict token in a non-gatekeeper tool_result is not read as the verdict; a gatekeeper Task's bound tool_result still IS. load-failure-memory: the digest indexes title + tags but omits the rule prose; hostile content stays nonce-fenced, labeled untrusted, and role-markers neutralized. `node --test`: 73 pass / 0 fail / 2 skipped.

## [0.10.5]

Completes the orchestration-check provenance hardening from the external review. No change to defaults, reviewer selection, or the hook's fail-open / non-blocking contract.

### Fixed
- **orchestration-check now derives evidence from STRUCTURED transcript blocks only** (`orchestration-check.js`): 0.10.3 stopped trusting human-typed text, but still trusted *all* assistant content — so an orchestrator that recapped the verdict vocabulary in its own prose ("…FIX REQUIRED… NOT READY…") before a "done" close could trigger a **false** "verdict not honored", and naming `subagent_type: <reviewer>` in prose (rather than a real Task call) could **silence** the panel-missing check. Panel presence is now read only from `Task` `tool_use` invocations, and the gatekeeper verdict only from `tool_result` (subagent output) — never from free prose, human or assistant. Both spoofs were reproduced against the live hook and now behave correctly, while a real structured panel + `tool_result` verdict still warns as before.

### Tests
- Two assistant-prose regression tests (a verdict token in the orchestrator's own prose is not read as the gatekeeper's verdict; a `subagent_type:` named in prose does not count as a panel run), alongside the existing human-prose pair. `node --test`: 68 pass / 0 fail / 2 skipped.

## [0.10.4]

Docs, CI, and least-privilege polish from the external-review backlog, plus one cross-platform `plan-gate` fix the new macOS runner surfaced. No change to defaults or reviewer selection.

### Fixed
- **plan-gate now resolves symlinks on the exemption root, not just the target** (`plan-gate.js`): the `~/.claude/plans` write-exemption realpath-resolved the *target* path but built the exemption root straight from `os.homedir()`. When the home path itself contains a symlink (e.g. a symlinked home, or a temp-dir home that resolves through macOS's `/var → /private/var`), the two sides compared in different spaces and a legitimate plan-file write was wrongly denied. Both sides are now realpath-resolved. Surfaced by adding `macos-latest` to CI; real `/Users/...` homes were unaffected, but a symlinked home would have hit it.

### Changed
- **MCP examples steer away from server wildcards** (`agents/code-reviewer.md`, `references/external-capabilities.md`, `docs/advanced/external-capabilities.md`): a `mcp__<server>__*` allowlist grants *every* tool the server exposes — including mutating ones (a GitHub MCP's create-PR / comment / merge), which silently breaks the read-only reviewer contract. The commented `code-reviewer` example now lists specific read tools (e.g. `mcp__github__get_pull_request`) instead of `mcp__github__*`, and both capability docs warn to narrow any wildcard whose server has write tools.
- **`Fail-open` is stated precisely** (`README.md`, `README.zh-TW.md`): the safety-posture line conflated two mechanisms. It now distinguishes the hook's own try/catch → exit-0 (a plugin property) from the no-Node case, where the hook process never starts and Claude Code treats the failed spawn as non-fatal (a host property) — so the "nothing is blocked" guarantee isn't over-attributed to the plugin.

### CI
- **macOS is now in the test matrix** (`.github/workflows/validate.yml`): added `macos-latest` alongside ubuntu/windows so the README's "same behavior on macOS" claim is actually exercised — in particular `plan-gate.js`'s APFS case-folding branch and the darwin-specific case-insensitivity tests, previously never run in CI.

### Tests
- **Negative-path coverage for the release gate** (`test/hooks.test.mjs`): `validate-structure` now has failing-case tests for a version mismatch, a missing SKILL-linked reference, a shipped forbidden artifact, and a missing CHANGELOG entry — so a future edit that silently weakens any of those guards is caught.

## [0.10.3]

Hardening from an external review: the Stop hook no longer trusts free-typed text as evidence of a review verdict or a panel run, the failure-memory hook resolves the project root the same way the plan gate does, and machine-local Claude settings are repo-ignored. No change to defaults, reviewer selection, or hook contracts.

### Fixed
- **orchestration-check reads verdict/panel evidence only from model & subagent output** (`orchestration-check.js`): both checks scanned the *entire* raw transcript, so human-typed text could spoof them — a user message quoting the verdict vocabulary (`READY / FIX REQUIRED / NOT READY`, with `NOT READY` last) plus a benign "all done / looks good" close fired a false *verdict-not-honored* advisory, and pasting `subagent_type: …` into a user message silently satisfied the panel-presence check. Detection is now scoped to trusted lines — assistant turns and `tool_result` blocks (the gatekeeper's verdict arrives as a `tool_result` inside a user-role line, so those stay trusted); free human-typed user text is excluded. This closes a false positive on the highest-value check (the bad failure direction) and the panel false-negative.
- **load-failure-memory resolves the project root via `CLAUDE_PROJECT_DIR` first** (`load-failure-memory.js`): it used `process.cwd()` / the event cwd and never consulted `CLAUDE_PROJECT_DIR`, so it could anchor the failure-memory lookup to a different root than `plan-gate.js` (e.g. a session launched from a subdirectory finding no `ai/FAILURE_MEMORY.md`). It now matches the plan gate's precedence (`CLAUDE_PROJECT_DIR` → event cwd → `process.cwd()`).

### Chore
- **`.gitignore` now ignores `.claude/settings.local.json`**: the machine-local settings file (per-developer permission allowlists) was protected only by each developer's *global* git excludes, so a contributor whose global excludes lacked the rule could accidentally commit it. The rule now travels with the clone.

### Tests
- Two orchestration-check regression tests pin the reproduced spoofs (a `NOT READY` token in a human message is not read as the gatekeeper's verdict; a pasted `subagent_type:` does not count as a panel run), plus one load-failure-memory test pinning the `CLAUDE_PROJECT_DIR` resolution. The memory-digest tests are now hermetic (they strip ambient `CLAUDE_PROJECT_DIR`). `node --test`: 62 pass / 0 fail / 1 skipped.

## [0.10.2]

Follow-up polish from the 0.10.1 review backlog — boundary tests, release-job resilience, an empirically-detected plan-gate case check, and two new CI guards. No change to defaults, reviewer selection, or hook contracts.

### Fixed
- **plan-gate filesystem case detection is now empirical** (`plan-gate.js`): the `~/.claude/plans` write-exemption decided case-insensitivity from `process.platform`, which misreads a case-sensitive APFS (macOS) or a case-insensitive Linux mount. It now probes the exemption subtree itself (the deepest existing ancestor of `~/.claude/plans` — flip its basename case and test whether that resolves; the cased `.claude` basename also makes it engage for numeric / caseless home directory names), falling back to the platform default only when undeterminable.
- **`MAX_STDIN` is now byte-based** (`load-failure-memory.js`, `plan-gate.js`): the stdin cap compared `String.length` (UTF-16 code units); it now counts `Buffer.byteLength(...)` so the bound is the intended byte budget.
- **orchestration-check: dropped the redundant `existsSync`** — the subsequent `statSync` already fails open on a missing path (ENOENT → catch); a comment now records the sampled-size / unbounded-read TOCTOU as an accepted best-effort gap.

### Added
- **CI text-integrity gate** (`validate-structure.mjs`): tracked text (`.md` / `.json` / `.mjs` / `.js` / `.yml`) is scanned for U+FFFD replacement characters, so mojibake / broken encoding fails the build.
- **CI bilingual README parity** (`validate-structure.mjs`): `README.zh-TW.md` must name every wired hook (like `README.md`) and the two READMEs must have the same top-level (`##`) section count (ignoring `##` lines inside fenced code blocks), and the zh counterpart cannot be deleted while the English one exists — a structural-drift guard that does not compare translated prose.
- **Release-job resilience** (`.github/workflows/validate.yml`): explicit `set -euo pipefail`; the publish guard captures the release's draft state once and **promotes a stray draft** (`gh release edit --draft=false`) instead of failing on create; master-push runs are now non-cancellable (workflow-level `cancel-in-progress` fires only on `pull_request`) so a release is never killed mid-publish, while a job-level `concurrency` group serializes publishes; and the CHANGELOG→release-notes `awk` uses POSIX literal brackets (`[[]` / `[]]`) so it extracts correctly on both mawk and gawk.

### Tests
- The 32 MB transcript cap is now bracketed on all sides: over-cap (skips), just-under-cap (warns), exactly-at-cap (warns — pins `>` not `>=`), directory and non-existent paths (fail open). New plan-gate test: an uppercase `~/.claude/PLANS` IS exempt on a case-insensitive FS (positive partner to the case-sensitive test), plus a scoped-fold assertion that a non-plans path stays denied. The two new CI guards now have negative-path coverage — the validator runs against a temp copy of the repo with an injected U+FFFD, a `##` section-count mismatch, and a missing zh hook name, asserting each one FAILS.

### Docs
- `run/SKILL.md`: the `references/deep-mode.md` pointer is now self-resolving (`../universal-dev-flow/references/deep-mode.md`).
- `mcp.example.json`: pinned the two npm-published example servers (`@modelcontextprotocol/server-github`, `@playwright/mcp`) and moved the non-npm `semgrep-mcp` / `osv-mcp` out of the runnable entries into the comment (they need uvx/pipx; a literal `npx -y <name>` would fetch an unrelated npm package).

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
