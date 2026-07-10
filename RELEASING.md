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
2. **SessionStart hook** — put a tiny `ai/FAILURE_MEMORY.md` with one `### ` entry in the project,
   start a fresh session, and confirm the failure-memory **digest** (titles + tags, nonce-fenced,
   labeled untrusted) is injected. With no file, nothing should appear.
3. **PreToolUse plan gate** — enter plan mode and ask Claude to edit a file; the write must be
   **denied** with the plan-gate reason. Outside plan mode the same edit is allowed.
4. **PreToolUse destructive guard** — outside plan mode, ask for a narrow unrecoverable command such
   as `git reset --hard` in a disposable project and confirm `destructive-guard.js` asks before it.
   Confirm a benign command is allowed.
5. **PreToolUse contract guard** — create a disposable `output/udflow/contract.md` fixture with a
   populated JSON fenced block (an `acceptanceCriteria` entry and a `mustNotChange` entry), then ask
   Claude to edit it in a way that removes the `mustNotChange` entry; confirm `contract-guard.js` **asks**
   before the edit, naming the entry that would be lost. Confirm a pure-append edit (adding a new AC,
   leaving everything else intact) is allowed with no prompt. Confirm `"udflow": { "contractGuard": false }`
   in the project's `.claude/settings.json` suppresses the ask for the same removal.
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

- **Last live-smoked:** Claude Code — the compaction-fidelity `SessionStart·compact` path verified via a
  real `/compact` (2026-06-28); GitHub Copilot CLI **1.0.65** — hooks + skills load-verified.
- **2026-07-10 — in-session partial verification (NOT the full smoke):** Claude Code **2.1.206** /
  Windows 11 — the `universal-dev-flow` skill engaged for a real task (step 8's equivalent), and
  `plan-gate.js` live-fired during a real plan-mode phase via its `~/.claude/plans/` write-exemption path
  (the plan-mode deny path was not triggered live; it is covered behaviorally by the test suite), with the
  suite green including the newly-added `contract-guard` syntax check. The full 8-step clean-profile
  **Manual activation smoke was NOT run** and remains an open pre-/post-release action for the maintainer —
  0.33.0 (2026-07-07) added the `contract-guard` hook without a recorded smoke; this line makes that gap
  visible instead of silent.
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
