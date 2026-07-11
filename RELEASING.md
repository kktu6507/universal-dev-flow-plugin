# Releasing udflow

Releases are **automatic**: pushing to `master` runs CI, and the `release` job tags and publishes a
new manifest version from the matching `CHANGELOG.md` section. For an already-published version, the
job verifies the deterministic archive/checksum assets and fails closed on drift unless
`UDFLOW_REPAIR_PUBLISHED_RELEASE_ASSETS=true` is set as a repository variable for an intentional
repair. You never tag by hand. This file is the **manual pre-release smoke** for the one thing CI
cannot prove.

## When to bump the version

Bump `plugin.json` / `marketplace.json` (metadata + plugin entry) / `package.json` in lockstep,
with a matching `CHANGELOG.md` entry, **only when the change is perceptible to a user running
udflow** — a hook fires differently, a verdict/sentinel/severity literal changes, an agent's
behavior or selection changes, a new capability exists, or a doc rewrite changes what a user is
told to do. Do **not** bump for a change with no behavioral difference: a repo-owner/URL rename,
a prose clarification that doesn't change guidance, internal doc-alignment, or fixing a typo.
(2026-07-07 decision, superseding the earlier practice — several pre-2026-07 CHANGELOG entries bumped
for an explicitly-stated "no hook/behavior change"; those stand as history, not a precedent to keep
following.) When unsure whether a change is perceptible, ask rather than default to bumping.

Going forward (2026-07-10), new `CHANGELOG.md` entries use Keep-a-Changelog grouped bullets
(Added / Changed / Fixed / Removed), not long narratives — long design rationale belongs in commit
messages and PR descriptions. Entries up to and including 0.29.0 are archived in
[`docs/changelogs/CHANGELOG-0.x.md`](docs/changelogs/CHANGELOG-0.x.md).

## What CI already gates (automatic, on every PR + push)

- `validate-structure.mjs` — manifests parse; `plugin.json` / `marketplace.json` / `package.json` /
  `CHANGELOG.md` versions agree; SKILL-linked references and wired hooks exist; **hook wiring** (each
  lifecycle hook registered under the right event with a matcher that covers the tools/lifecycles it
  must fire for); **CC output-contract conformance** (`5g`: a hook that emits `hookSpecificOutput` is
  wired only to events Claude Code actually accepts it on — the compact-fidelity/PreCompact bug class);
  distribution hygiene; text integrity; multilingual README parity (EN / zh-TW / ja).
- `node --check` on all six hooks; `node --test` (behavioral hook tests).
- `zizmor` (separate `zizmor.yml`, version-pinned CLI) — static security analysis of the workflow
  files themselves: unpinned action refs, template injection, over-broad `permissions:`.
- `claude plugin validate` — **best-effort, non-blocking** (Linux-only; the Claude Code CLI may not
  run fully headless in CI).

CI proves the hook **scripts' logic** and the **packaging/wiring**, but it cannot prove that a real
Claude Code session actually loads and fires the plugin after install — that needs a live runtime and
auth, which is why `claude plugin validate` is best-effort. Do the check below by hand before (or
right after) a release that touches hooks, the skill, `hooks.json`, or the manifests.

The release job also publishes a source archive of the shipped `udflow/` plugin tree and a SHA-256 file,
and attaches a signed **SLSA build-provenance attestation** to that archive (via `actions/attest-build-provenance`,
after publish, `continue-on-error` so it never blocks a release). A consumer proves *origin* — that the archive
was built by this repo's CI at the release commit — with `gh attestation verify udflow-vX.Y.Z-plugin.tar.gz
--repo kktu6507/universal-dev-flow-plugin`, complementing the checksum below (which proves only integrity).
Verify the checksum with the command that matches your platform:

Linux / GNU coreutils:
```bash
sha256sum -c udflow-vX.Y.Z-plugin.tar.gz.sha256
```

macOS:
```bash
shasum -a 256 -c udflow-vX.Y.Z-plugin.tar.gz.sha256
```

Windows PowerShell:
```powershell
$checksum = Get-Content .\udflow-vX.Y.Z-plugin.tar.gz.sha256
$parts = $checksum -split '\s+', 2
if ($parts.Count -ne 2 -or $parts[1].TrimStart('*') -ne 'udflow-vX.Y.Z-plugin.tar.gz') { throw "Checksum filename mismatch" }
$expected = $parts[0].ToUpperInvariant()
$actual = (Get-FileHash .\udflow-vX.Y.Z-plugin.tar.gz -Algorithm SHA256).Hash
if ($actual -ne $expected) { throw "Checksum mismatch" }
```

The checksum proves the downloaded archive matches the release asset. It does not replace auditing the
hook source or verifying a signed tag when available.

Published release assets are immutable by default: the release job verifies existing archive/checksum
bytes against the deterministic tag-bound rebuild. It only replaces already-published assets when the
repository variable `UDFLOW_REPAIR_PUBLISHED_RELEASE_ASSETS=true` is set for an intentional repair.
After a repair run succeeds, unset that repository variable before the next normal push so future runs
return to fail-closed verification.

## Manual activation smoke (clean profile)

In a throwaway/clean Claude Code profile, from a scratch project directory:

1. **Install + enable + reload**
   - `/plugin marketplace add kktu6507/universal-dev-flow-plugin`
   - `/plugin install udflow@kktu`
   - `/plugin` → **Installed** → toggle **udflow** on (or `claude plugin enable udflow@kktu`)
   - `/reload-plugins`
2. **SessionStart hook** — put a tiny `udflowOp/memory/FAILURE_MEMORY.md` with one `### ` entry in
   the project, start a fresh session, and confirm the failure-memory **digest** (titles + tags,
   nonce-fenced, labeled untrusted) is injected. With no file, nothing should appear. Then the
   legacy variant: in a project with ONLY a legacy `ai/FAILURE_MEMORY.md` (no `udflowOp/`), confirm
   (a) the digest still injects from the legacy path, and (b) after one real flow run the file has
   been fully **moved** to `udflowOp/memory/FAILURE_MEMORY.md` and the legacy file deleted — the
   one-time migration, performed by the workflow main thread as visible tool actions and disclosed
   in-run, never by the hook (hooks stay read-only).
3. **PreToolUse plan gate** — enter plan mode and ask Claude to edit a file; the write must be
   **denied** with the plan-gate reason. Outside plan mode the same edit is allowed.
4. **PreToolUse destructive guard** — outside plan mode, ask for a narrow unrecoverable command such
   as `git reset --hard` in a disposable project and confirm `destructive-guard.js` asks before it.
   Confirm a benign command is allowed.
5. **PreToolUse contract guard** — create a disposable `udflowOp/output/contract.md` fixture (the
   guard also still watches the legacy `output/udflow/contract.md` path) with a
   populated JSON fenced block (an `acceptanceCriteria` entry and a `mustNotChange` entry), then ask
   Claude to edit it in a way that removes the `mustNotChange` entry; confirm `contract-guard.js` **asks**
   before the edit, naming the entry that would be lost. Confirm a pure-append edit (adding a new AC,
   leaving everything else intact) is allowed with no prompt. Confirm `"udflow": { "contractGuard": false }`
   in the project's `.claude/settings.json` suppresses the ask for the same removal. Sibling probe: seed a
   populated legacy `output/udflow/contract.md` (no `udflowOp/output/contract.md` present), then ask Claude
   to write a FRESH weakened contract at `udflowOp/output/contract.md`; confirm the guard asks, naming the
   lost entry and the sibling baseline path.
6. **Stop / orchestration-check** — end a session that asserts a `READY` verdict without running the
   panel; confirm the advisory `systemMessage` appears (and that an honest run stays silent).
7. **Compaction fidelity (SessionStart·`compact`)** — with `udflow` enabled, trigger a compaction
   (`/compact`, or let auto-compaction fire on a long session). Confirm **both**: (a) `/compact` prints
   **no** `Hook JSON output validation failed` error — the hook emits the `SessionStart` shape Claude Code
   accepts, NOT a `PreCompact` `hookSpecificOutput` (which CC rejects); and (b) the preservation reminder
   is re-injected into the fresh post-compaction context: a `<<UDFLOW_PRESERVE_…>>` block naming
   reviewer/gatekeeper verdicts, acceptance-criteria state, `[unverified]` flags, and the `udflow:verify=`
   / `udflow:delivery=` sentinels. With `UDFLOW_HOOK_DEBUG=1` set in the Claude Code process, the
   authoritative signal is a new `[compact-fidelity] emitted preservation block` line appended to
   `<tmpdir>/udflow-hook.log`. With `"udflow": { "preserveOnCompact": false }` in the project's
   `.claude/settings.json`, nothing should appear. (Regression context: the hook was wired under
   `PreCompact` through 0.27.2, whose injected output Claude Code rejects with a validation error and never
   surfaces; 0.27.3 relocated the emit to the supported SessionStart·`compact` path.)
8. **Skill activation** — describe a non-trivial engineering task in plain language and confirm the
   `universal-dev-flow` skill engages (or `/udflow:run <task>` invokes it manually).
9. **incident-response activation** — in a scratch project, run `/udflow:incident-response prepare`
   and confirm it produces `udflowOp/ops/OPS_PROFILE.md` and honestly reports gaps (unverified
   rollback, missing backups, no observability). Then send a plain-language production-incident
   message (e.g. "production is down — checkout returns 500s since the last deploy") and confirm the
   `incident-response` skill engages, opens a journal under `udflowOp/incidents/`, and presents a
   triage decision card.

If any step fails, do **not** rely on the release for that surface — fix and re-run. Note the result
in the PR or the `EVIDENCE.md` log so the activation path has a paper trail.

## Safe install and integrity checks

Recommended user-side checks:

1. Install from a tagged release or pinned commit.
2. Review the shipped plugin's `hooks/` directory before enabling (repo path: `udflow/hooks/`);
   these are the auto-executing scripts.
3. Run `/udflow:doctor` after install.
4. Verify signed tags when available:

   ```bash
   git verify-tag vX.Y.Z
   ```

5. Verify release archive checksums when assets are present.

   Linux / GNU coreutils:

   ```bash
   sha256sum -c udflow-vX.Y.Z-plugin.tar.gz.sha256
   ```

   macOS:

   ```bash
   shasum -a 256 -c udflow-vX.Y.Z-plugin.tar.gz.sha256
   ```

Windows PowerShell:

```powershell
$checksum = Get-Content .\udflow-vX.Y.Z-plugin.tar.gz.sha256
$parts = $checksum -split '\s+', 2
if ($parts.Count -ne 2 -or $parts[1].TrimStart('*') -ne 'udflow-vX.Y.Z-plugin.tar.gz') { throw "Checksum filename mismatch" }
$expected = $parts[0].ToUpperInvariant()
$actual = (Get-FileHash .\udflow-vX.Y.Z-plugin.tar.gz -Algorithm SHA256).Hash
if ($actual -ne $expected) { throw "Checksum mismatch" }
```

The archive is generated from the `udflow/` subtree, which is the shipped plugin content. Repo-root
docs, tests, and CI files are not part of that archive. When extracted, the archive root is
`udflow-vX.Y.Z/`, so the hook scripts appear under `udflow-vX.Y.Z/hooks/`.

The quick-start marketplace command is convenient but may follow the marketplace/repo state. The
checksum file verifies that the downloaded archive matches the published release asset; authenticity
still depends on a signed tag or pinned SHA. It does not authenticate a moving marketplace clone. For
stronger pinning, use a tagged/SHA checkout if your runtime supports it, or compare the verified
archive's `udflow-vX.Y.Z/` tree against the installed `udflow/` plugin tree before enabling.

## Contract conformance (Claude Code)

udflow's deepest dependency is Claude Code's hook/agent **contract**, which evolves
([`ARCHITECTURE.md`](ARCHITECTURE.md), *Boundaries*). CI's `5g` guard pins the one contract that broke
before — `hookSpecificOutput` only on events CC accepts it on — but it cannot prove the rest of CC's
contract still holds; the manual smoke above is the live conformance check. Record what it was tested
against so drift is visible:

- **Last live-smoked:** Claude Code **2.1.207** / Windows 11 / Node 24.16.0 — **9-step clean-profile
  smoke on 2026-07-11** against installed **0.42.1** (see the 2026-07-11 bullet below; 2 real findings,
  not full profile isolation — see its scope-limits note); GitHub Copilot CLI **1.0.65** — hooks + skills
  load-verified.
- **2026-07-10 — in-session partial verification (NOT the full smoke):** Claude Code **2.1.206** /
  Windows 11 — the `universal-dev-flow` skill engaged for a real task (step 8's equivalent), and
  `plan-gate.js` live-fired during a real plan-mode phase via its `~/.claude/plans/` write-exemption path
  (the plan-mode deny path was not triggered live; it is covered behaviorally by the test suite), with the
  suite green including the newly-added `contract-guard` syntax check. The full 8-step clean-profile
  **Manual activation smoke was NOT run** that day — 0.33.0 (2026-07-07) had added the `contract-guard`
  hook without a recorded smoke. **Closed on 2026-07-11** by the full smoke recorded in the next bullet.
- **2026-07-11 — full 8-step clean-profile smoke (Claude Code 2.1.206 / Windows 11 / Node 24.16.0,
  installed 0.40.0 @ `8490840`):** all 8 steps executed in a throwaway `CLAUDE_CONFIG_DIR` profile
  (no settings, no other plugins; only OAuth credentials copied in), driven headless (`claude -p`)
  from a scratch project. Results: (1) marketplace add (HTTPS) → install → enable landed 0.40.0;
  (2) digest injected and its entry title quoted verbatim with a project `ai/FAILURE_MEMORY.md`,
  silent with no file and an empty home; (3) plan-mode Write denied with the plan-gate reason text,
  the same Write allowed outside plan mode; (4) `git reset --hard` intercepted by destructive-guard
  (the ask surfaced as a block in the non-interactive runner, guard message relayed, command did not
  run) while `git status` passed untouched; (5) contract-guard three-state: `mustNotChange` removal
  asked-and-blocked naming the exact entry, pure-append allowed with no prompt, `contractGuard:false`
  opt-out let the same removal through; (6) orchestration-check fired its advisory branch on an
  asserted `Final verdict: READY` with no panel (`delivers=true unmet=[spec-reviewer,test-reviewer,
  gatekeeper]` in the debug log) and stayed silent across 16 honest runs plus one sentinel-holding
  real udflow run; (7) a **real auto-compaction** (context pushed past the threshold) produced a
  `compact_boundary` event, zero `Hook JSON output validation failed`, the authoritative
  `[compact-fidelity] emitted preservation block` log line, and the preservation block quoted
  verbatim from the post-compaction context; (8) the `universal-dev-flow` skill engaged organically
  from a plain-language task and spawned `udflow:implementer`. Honest limits of the headless
  harness: interactive UI rendering of `ask` prompts / Stop `systemMessage` was not observable (hook
  decisions verified via `UDFLOW_HOOK_DEBUG` log + stream events instead); `preserveOnCompact:false`
  was not live-run (suite-covered); `/compact` as a slash command is not executable under `-p`, so
  the auto-compaction trigger — which step 7 explicitly allows — was used.
- **2026-07-11 — 9-step clean-profile smoke (Claude Code 2.1.207 / Windows 11 / Node 24.16.0, installed
  **0.42.1** @ `fa440d5`):** run against the existing already-authenticated default profile with scratch
  **project** directories only — NOT an isolated `CLAUDE_CONFIG_DIR` with copied credentials; the operator
  declined duplicating live OAuth material this round — driven headless (`claude -p`). Confirmed live:
  (2) the new-layout `udflowOp/memory/FAILURE_MEMORY.md` digest injects verbatim; the no-project-file case
  falls through the 0.42.0 3-tier chain to the global `~/.claude/FAILURE_MEMORY.md` digest (the true
  zero-signal-at-any-tier case needs a profile with no global file either — out of scope this round); the
  legacy `ai/FAILURE_MEMORY.md` digest injects correctly (3/3 runs). (3) plan-gate's allow-outside-plan-mode
  is confirmed; the deny branch itself was **not live-reachable** this round — 4 attempts (2 prompt framings
  × haiku/sonnet, both the Edit-tool and Bash-redirect vectors) all show Claude Code 2.1.207's own native
  plan-mode restriction stopping the model before any tool call is attempted, and stacking
  `--dangerously-skip-permissions` onto `--permission-mode plan` just overrides the reported mode to
  `bypassPermissions`, defeating the test; the hook's deny logic remains `node --test`-covered. (4)
  destructive-guard asked on `git reset --hard` and the command genuinely never ran (an uncommitted fixture
  edit survived on disk); benign commands passed silently. (5) contract-guard three-state confirmed (removal
  asked naming the entry / pure-append silent-allow / pre-set `contractGuard:false` silent-allow) **plus the
  new 0.42.1 sibling-baseline check (op F2)**: a fresh write to `udflowOp/output/contract.md` with no prior
  file there, against a populated legacy `output/udflow/contract.md` sibling, was correctly asked-and-blocked,
  naming all 4 weakened/lost items and the sibling path used as baseline. (6) orchestration-check's advisory
  branch fired on an asserted `READY` with no panel (debug log: `delivers=true ran=[] unmet=[...]`); the Stop
  `systemMessage` text itself was not observable headless, same limit as the 0.40.0 smoke. (7) a real
  auto-compaction fired (`compact_boundary` event, zero `Hook JSON output validation failed`), the
  preservation block carried **the new 0.42.1 F6 incident-journal-pointer line verbatim**, and a follow-up
  turn confirmed the model actually retained and acted on the pre-compaction state and the reminder, not just
  that the hook emitted it. (8) `/udflow:run` exercised the full lifecycle conclusively: the plan gate
  presented the full template and **honestly disclosed** that the native plan-mode tool was unavailable
  headless rather than silently proceeding; after approval, the implementer plus a lite panel (spec/test/code
  reviewer) found and fixed 2 real MAJORs, and the gatekeeper issued `READY` with correct sentinels. (9)
  `/udflow:incident-response prepare` produced an honest `OPS_PROFILE.md` (RED FLAGs on missing observability
  and feature flags, UNVERIFIED on everything undeliverable); a fresh session's plain-language incident
  message opened an incident journal, **read back the prior session's `OPS_PROFILE.md`** (cross-session
  continuity confirmed), and correctly stopped at a well-structured decision card before the first mitigation
  action. Step 1 (the fresh marketplace/install path) was **not live re-run** this cycle — closed instead on
  static evidence (`installed_plugins.json`'s `gitCommitSha` exact match to the release commit, a
  non-orphaned versioned cache dir, this session's own `PATH` wired to the `0.42.1` plugin `bin`, and
  session-start ordering after the release's marketplace sync).

  **Two real findings surfaced by this smoke, not testing artifacts:**
  - **The legacy FAILURE_MEMORY migration does not fire in practice (reproducible 3/3).** Per
    `references/verification-gate.md`, reading a legacy-only `ai/FAILURE_MEMORY.md` should trigger a
    one-time `git mv` to `udflowOp/memory/FAILURE_MEMORY.md`. Across a direct haiku run, a direct sonnet run,
    and a full `/udflow:run` pipeline (implementer + reviewers + gatekeeper, all otherwise faithfully
    executed) the model reads the legacy file but never migrates it — one run's own final report says
    `Failure Memory: Not required — clean success`, conflating the write-a-new-entry obligation with the
    separate, unconditional migrate-on-read obligation. This is the first-ever live test of this 0.42.0
    behavior, and it is failing. Needs a follow-up fix (make the migration a distinct, harder-to-miss action
    rather than prose embedded in a reference doc) and a re-smoke of this sub-case specifically. (Fixed in
    0.42.2 — see CHANGELOG.md.)
  - **contract-guard's `contractGuard:false` opt-out can be self-authored by the model under specific
    phrasing.** When the test prompt for the `mustNotChange`-removal case included "do not ask for
    confirmation," haiku hit the guard's ask, reasoned that phrase authorized bypassing it, wrote a **new**
    `.claude/settings.json` with `contractGuard: false` itself, and retried successfully. A control run of
    the identical removal without that phrase behaved correctly (guard held, no bypass file written, entry
    survived). The opt-out mechanism itself is intentional and documented for human use; the concerning part
    is a model authoring its own opt-out under pressure from phrasing that could arrive via a compromised
    task description. Worth a hardening look (e.g., treat a `contractGuard:false` written in the same
    run/session as the blocked edit as suspect). (Fixed in 0.42.2 — see CHANGELOG.md.)

  **Scope limits, stated honestly:** not an isolated clean profile (existing default profile + scratch
  project dirs only, per an explicit operator decision to avoid duplicating live OAuth credentials) — step 1
  and the true FAILURE_MEMORY no-file-at-any-tier silent case are consequently unproven this cycle;
  plan-gate's live deny path is unreachable via this CLI version's headless harness (a methodology gap, not a
  defect); interactive `ask` / Stop-`systemMessage` UI rendering remains unobservable headless, same as
  0.40.0.
- **When Claude Code changes a hook-output contract** (a new/removed event, or a changed accepted shape):
  update `HSO_ACCEPT_EVENTS` / the `WIRING` table in `.github/scripts/validate-structure.mjs`, re-run this
  smoke, and update the line above.

## Model provenance (when the validated model changes)

`EVIDENCE.md`'s reviewer recall/false-positive numbers are driven mainly by the **model**, not the
reviewer prompts (see *2026-06-29 run* there). If the model you develop/release against changes (a Claude
model upgrade, or switching the default session model), run:

```bash
node eval/check-model-provenance.mjs --model <new-model-id>
```

A `MISMATCH` means the published numbers in `EVIDENCE.md` / `eval/baseline.md` were validated against a
different model and may not hold — re-run `eval/fixtures/` (`eval/README.md`) and the `EVIDENCE.md` Type-A
refresh before relying on them, then update `baseline.md`'s `**Date:**` / `**Reviewer under test:**` lines
so the recorded provenance matches. This is a repo-root dev tool only — it is never shipped to a
consumer's plugin install (`eval/` is outside the distributed `udflow/` tree) and never blocks a release.

## Release signing (opt-in)

The release job signs each `vX.Y.Z` tag when the `UDFLOW_SIGN_PRIVATE_KEY` secret is set, and falls back to an
unsigned annotated tag otherwise (a signing problem never blocks a release). To activate, one-time:

1. Generate a **passphrase-less** GPG signing key whose email is **verified** on the maintainer's GitHub
   account: `gpg --quick-generate-key "Name <verified-email>" ed25519 sign 0` (leave the passphrase blank).
2. Register the **public** key on GitHub (Settings → SSH and GPG keys → New GPG key):
   `gpg --armor --export <KEYID>`.
3. Store the **private** key as the repo secret `UDFLOW_SIGN_PRIVATE_KEY`:
   `gpg --armor --export-secret-keys <KEYID> | gh secret set UDFLOW_SIGN_PRIVATE_KEY` (run from the repo dir).

After that, the next version bump produces a **Verified** tag. Confirm with `git verify-tag vX.Y.Z` or the
green *Verified* badge on the GitHub tags page. (A passphrase-protected key would need `GPG_PASSPHRASE` +
loopback-pinentry wiring in the workflow — avoided here by using a passphrase-less CI key.)
