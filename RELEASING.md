# Releasing udflow

Releases are **automatic**: pushing to `master` runs CI, and when the manifest version is new the
`release` job tags it and publishes a GitHub release from the matching `CHANGELOG.md` section. You
never tag by hand. This file is the **manual pre-release smoke** for the one thing CI cannot prove.

## What CI already gates (automatic, on every PR + push)

- `validate-structure.mjs` — manifests parse; `plugin.json` / `marketplace.json` / `package.json` /
  `CHANGELOG.md` versions agree; SKILL-linked references and wired hooks exist; **hook wiring** (each
  lifecycle hook registered under the right event with a matcher that covers the tools/lifecycles it
  must fire for); **CC output-contract conformance** (`5g`: a hook that emits `hookSpecificOutput` is
  wired only to events Claude Code actually accepts it on — the compact-fidelity/PreCompact bug class);
  distribution hygiene; text integrity; bilingual README parity.
- `node --check` on all five hooks; `node --test` (behavioral hook tests).
- `claude plugin validate` — **best-effort, non-blocking** (Linux-only; the Claude Code CLI may not
  run fully headless in CI).

CI proves the hook **scripts' logic** and the **packaging/wiring**, but it cannot prove that a real
Claude Code session actually loads and fires the plugin after install — that needs a live runtime and
auth, which is why `claude plugin validate` is best-effort. Do the check below by hand before (or
right after) a release that touches hooks, the skill, `hooks.json`, or the manifests.

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
4. **Stop / orchestration-check** — end a session that asserts a `READY` verdict without running the
   panel; confirm the advisory `systemMessage` appears (and that an honest run stays silent).
5. **Compaction fidelity (SessionStart·`compact`)** — with `udflow` enabled, trigger a compaction
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
6. **Skill activation** — describe a non-trivial engineering task in plain language and confirm the
   `universal-dev-flow` skill engages (or `/udflow:run <task>` invokes it manually).

If any step fails, do **not** rely on the release for that surface — fix and re-run. Note the result
in the PR or the `EVIDENCE.md` log so the activation path has a paper trail.

## Contract conformance (Claude Code)

udflow's deepest dependency is Claude Code's hook/agent **contract**, which evolves
([`ARCHITECTURE.md`](ARCHITECTURE.md), *Boundaries*). CI's `5g` guard pins the one contract that broke
before — `hookSpecificOutput` only on events CC accepts it on — but it cannot prove the rest of CC's
contract still holds; the manual smoke above is the live conformance check. Record what it was tested
against so drift is visible:

- **Last live-smoked:** Claude Code — the compaction-fidelity `SessionStart·compact` path verified via a
  real `/compact` (2026-06-28); GitHub Copilot CLI **1.0.65** — hooks + skills load-verified.
- **When Claude Code changes a hook-output contract** (a new/removed event, or a changed accepted shape):
  update `HSO_ACCEPT_EVENTS` / the `WIRING` table in `.github/scripts/validate-structure.mjs`, re-run this
  smoke, and update the line above.

## Release signing (opt-in)

The release job signs each `vX.Y.Z` tag when the `GPG_PRIVATE_KEY` secret is set, and falls back to an
unsigned annotated tag otherwise (a signing problem never blocks a release). To activate, one-time:

1. Generate a **passphrase-less** GPG signing key whose email is **verified** on the maintainer's GitHub
   account: `gpg --quick-generate-key "Name <verified-email>" ed25519 sign 0` (leave the passphrase blank).
2. Register the **public** key on GitHub (Settings → SSH and GPG keys → New GPG key):
   `gpg --armor --export <KEYID>`.
3. Store the **private** key as the repo secret `GPG_PRIVATE_KEY`:
   `gpg --armor --export-secret-keys <KEYID> | gh secret set GPG_PRIVATE_KEY` (run from the repo dir).

After that, the next version bump produces a **Verified** tag. Confirm with `git verify-tag vX.Y.Z` or the
green *Verified* badge on the GitHub tags page. (A passphrase-protected key would need `GPG_PASSPHRASE` +
loopback-pinentry wiring in the workflow — avoided here by using a passphrase-less CI key.)
