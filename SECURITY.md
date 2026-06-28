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

The five Node hooks run in every enabled session and are constrained **by construction** (verify it
yourself — they are short, dependency-free, readable scripts in `udflow/hooks/`):

- **Local-only.** No network, no subprocess, no downloaded/eval'd code — Node built-ins
  (`fs`/`os`/`path`/`crypto`) only. They never transmit your code, transcript, or environment anywhere.
- **Fail-open.** Any error, or no Node on PATH → the hook does nothing and exits 0. A hook can never
  break a session.
- **Non-destructive.** They never change system/security settings, alter file permissions, or delete
  anything. `destructive-guard` only returns `ask` (a prompt) on a narrow deny-list of unrecoverable
  commands — it never denies and never deletes.
- **Read scope.** `load-failure-memory` reads your `FAILURE_MEMORY.md`; nothing else is read by the
  hooks. The reviewer subagents are read-only by tool grant (`Read`/`Grep`/`Glob`/`Bash`).

Per-project opt-outs exist for each guarding hook (`planGate` / `destructiveGuard` / `preserveOnCompact`
in `.claude/settings.json`), and the whole plugin ships **disabled** — you opt in.

## Supply chain & integrity (current gaps, stated honestly)

udflow is distributed as **source**: `marketplace add` clones the repo. There is **no release signing,
checksum, or provenance today** — see *Roadmap*. Until then, reduce trust risk by:

- **Pin what you install.** Prefer a **tagged release** or a specific commit SHA over a moving branch.
  The official community-marketplace listing (when live) pins a reviewed commit SHA — the strongest
  channel.
- **Audit the tree.** Everything that executes is readable text + zero-dependency Node scripts; the
  whole plugin is small enough to read before enabling. There is no compiled artifact and no
  third-party runtime dependency to trust.
- **Run [`/udflow:doctor`](udflow/skills/doctor/SKILL.md)** after install to confirm the hooks behave
  as documented (fires + fails open) in your environment.

## Untrusted-input surface (one, mitigated)

`load-failure-memory` reads a **committed** `FAILURE_MEMORY.md` and injects a digest of its entry
titles into every session. A hostile repository could therefore place crafted content in that file —
a prompt-injection vector. Mitigations (defense-in-depth, in the hook source): the digest is
**nonce-fenced**, **role-marker-neutralized**, and explicitly **labeled untrusted**, and it carries
titles/tags only (not free body text). To remove the surface entirely, delete the file — with no
`FAILURE_MEMORY.md` present the hook is a no-op.

## Roadmap (owner-side)

- **Signed release tags** — add a signing key to the release workflow so each `vX.Y.Z` tag is
  verifiable as the maintainer's (requires a maintainer-held key in CI secrets).
- **Build provenance** — consider SLSA provenance / a published checksum for releases once a signing
  identity exists.
