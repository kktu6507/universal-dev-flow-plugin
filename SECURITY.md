# Security

udflow is a Claude Code plugin whose **hooks auto-execute in every enabled session**. That makes
its trust model worth stating plainly. This file covers what the hooks can and cannot do, the
supply-chain posture (and its current gaps), the one untrusted-input surface, and how to report a
problem. Architecture context: [`ARCHITECTURE.md`](ARCHITECTURE.md), *Boundaries & external
dependencies*.

## Reporting a vulnerability

Email the maintainer (contact in the plugin submission / `CONTRIBUTING.md`) with details and, if
possible, a reproduction. Please do **not** open a public issue for an unfixed vulnerability. Best-
effort response — this is a solo-maintained, pre-1.0 project (bus factor of one).

## What the hooks can and cannot do

The six Node hooks run in every enabled session and are constrained **by construction** (verify it
yourself — they are short, dependency-free, readable scripts in `udflow/hooks/`):

- **Local-only.** No network, no subprocess, no downloaded/eval'd code — Node built-ins
  (`fs`/`os`/`path`/`crypto`) only. They never transmit your code, transcript, or environment anywhere.
- **Fail-open.** Any error, or no Node on PATH → the hook does nothing and exits 0. A hook can never
  break a session.
- **Non-destructive.** They never change system/security settings, alter file permissions, or delete
  anything. `destructive-guard` and `contract-guard` only return `ask` (a prompt) — on, respectively, a
  narrow deny-list of unrecoverable commands and a content-based diff showing a contract/design.md
  weakening — never a `deny`, never a delete.
- **Read scope.** Hooks read only bounded local files needed for their guardrails:
  `load-failure-memory` reads project `ai/FAILURE_MEMORY.md` or global
  `~/.claude/FAILURE_MEMORY.md`; `plan-gate`, `destructive-guard`, `contract-guard`, and
  `compact-fidelity` read project `.claude/settings*.json` for opt-outs; `contract-guard` additionally
  reads the current on-disk content of the one `output/udflow/contract.md` path and any file whose
  basename is `design.md`, only to simulate the tool's proposed edit locally (the tool is never actually
  invoked); `orchestration-check` reads the transcript path supplied by the hook event with a size cap.
  Reviewer subagents are separate from hooks: they have no editor-specific tool grants, but their grant
  still includes `Bash` (`Read`/`Grep`/`Glob`/`Bash`), so review-only behavior is a workflow/prompt
  discipline rather than a hard capability boundary.

Per-project opt-outs exist for each guarding hook (`planGate` / `destructiveGuard` / `contractGuard` /
`preserveOnCompact` in `.claude/settings.json`), and the whole plugin ships **disabled** — you opt in.

## Recommended safe install

1. Install from a tagged release or pinned commit instead of a moving branch.
2. Review the shipped plugin's `hooks/` directory before enabling the plugin (repo path:
   `udflow/hooks/`); the auto-executing surface is intentionally small.
3. Run [`/udflow:doctor`](udflow/skills/doctor/SKILL.md) after install to confirm hooks load and fail open as documented.
4. When a signed tag is available, verify it locally with `git verify-tag vX.Y.Z`.
5. When release assets include a plugin archive and `.sha256`, verify the checksum before unpacking or comparing the shipped tree.

The marketplace quick start is a convenience path and may follow the marketplace/repo state. Release
checksums integrity-check the published archive; authenticity still depends on a signed tag or pinned
SHA. They do not authenticate that default clone path. For stronger pinning, use a tagged/SHA checkout
where your runtime supports it, or compare the verified archive against the installed `udflow/` tree
before enabling.

## Supply chain & integrity (current posture)

udflow is distributed as **source**: `marketplace add` clones the repo. Releases support opt-in signed
tags and publish a checksum-bearing archive of the shipped plugin tree when the release workflow runs.
Build provenance / SLSA remains future work. Reduce trust risk by:

- **Pin what you install.** Prefer a **tagged release** or a specific commit SHA over a moving branch.
  The official community-marketplace listing (when live) pins a reviewed commit SHA — the strongest
  channel.
- **Audit the tree.** Everything that executes is readable text + zero-dependency Node scripts in
  the shipped plugin's `hooks/` directory (repo path: `udflow/hooks/`); the whole plugin is small
  enough to read before enabling. There is no compiled artifact and no third-party runtime
  dependency to trust.
- **Verify release material.** Use `git verify-tag vX.Y.Z` for signed tags when available, and compare
  the release archive against its `.sha256` file when assets are present.
- **Run [`/udflow:doctor`](udflow/skills/doctor/SKILL.md)** after install to confirm the hooks behave
  as documented (fires + fails open) in your environment.

## Untrusted-input surface (one, mitigated)

`load-failure-memory` reads project `ai/FAILURE_MEMORY.md` and, when present, user-controlled
global `~/.claude/FAILURE_MEMORY.md`, then injects a digest of entry titles into every session. A
hostile repository could therefore place crafted content in the project file — a prompt-injection
vector. Mitigations (defense-in-depth, in the hook source): the digest is
**nonce-fenced**, **role-marker-neutralized**, and explicitly **labeled untrusted**, and it carries
titles/tags only (not free body text). To remove the surface entirely, delete the applicable
failure-memory file — with no project or global failure-memory file present the hook is a no-op.

## Integrity roadmap

- **Signed release tags — wired (opt-in, gated).** The release job
  ([`.github/workflows/validate.yml`](.github/workflows/validate.yml)) **GPG-signs** each `vX.Y.Z` tag
  when the `UDFLOW_SIGN_PRIVATE_KEY` repo secret is set; without it the flow is unchanged (unsigned annotated
  tag), and a signing problem can never block a release (it falls back to unsigned). To activate: add
  the secret + register the matching **public** key on the maintainer's GitHub account (so the tagger
  email is a *verified* one). Verify any release locally with `git verify-tag vX.Y.Z`. Setup steps:
  `RELEASING.md`.
- **Release checksums — wired.** The release job publishes `udflow-vX.Y.Z-plugin.tar.gz` plus
  `udflow-vX.Y.Z-plugin.tar.gz.sha256` for the shipped `udflow/` tree.
- **Build provenance** — consider SLSA provenance for releases (future).
