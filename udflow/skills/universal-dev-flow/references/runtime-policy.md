# Runtime Policy

This workflow must preserve reviewer independence, context quality, and thread hygiene.

## Subagent Availability

Use formal multi-agent review only when the current runtime and higher-level tool policy allow subagent use. If subagents cannot be spawned or used, say so explicitly and do not present local self-review as formal multi-agent review.

## Context Isolation (Claude Code native)

In Claude Code, each subagent runs in its own isolated context window and returns only its result to the main thread; it does not inherit full thread history by default. This means the "do not dump full history into reviewers" discipline is enforced by the platform, not just by prose.

Therefore:
- Give each reviewer a focused Review Packet, not raw history.
- If a reviewer genuinely needs multi-turn requirement evolution, contradictory prior decisions, or historical evidence that cannot be safely summarized, include that evidence explicitly in its packet and record why it is needed and what stale/sensitive-context risk remains.
- Never route the entire conversation into a reviewer by default.

## Thread Hygiene

- Spawn only selected reviewers.
- Keep reviewer tasks concrete, bounded, and self-contained.
- Do not duplicate work between reviewers or between the main thread and subagents.
- Do not spawn `gatekeeper` until selected reviewer findings are available.
- Close reviewer agents when their output is no longer needed.
- Avoid repeated waits unless the next critical path step is blocked by reviewer output.
- If a spawned reviewer is stale after a material fix, send a new Review Packet or rerun the reviewer instead of relying on outdated findings.

## Gatekeeper Sequencing

`gatekeeper` receives:

- current Review Packet
- selected reviewer list and why each was selected
- reviewer findings
- verification evidence
- unresolved risks and missing tests
- external-capability disclosures (which MCP/skills/subagents were unavailable and the resulting gaps)
- conflict-resolution notes when reviewers disagree

`gatekeeper` must judge review sufficiency. If the selected panel omitted a necessary discipline, or a required check was skipped because an external capability was unavailable, the verdict cannot be `READY` until that gap is addressed or explicitly justified.
