# Closure (stage 7): checklist, journal schema, postmortem, failure memory

Loaded when mitigations are holding and the fix or remediation is in place — or whenever the user asks to wrap up.

## Closure checklist (all required)

An incident is closed only when every line holds. This prevents the permanent-degraded-state failure mode — flags left off, maintenance mode forgotten, damaged data quietly kept:

- [ ] fix deployed, if a code or data fix exists (config / infra / external-dependency remediation may have nothing deployable)
- [ ] production-verified — the declared fixed-check ran green in production (required for every fault domain)
- [ ] observation window passed without regression
- [ ] all mitigations restored — flags back on, maintenance mode lifted, scaled back to normal
- [ ] data repaired and verified, if corruption occurred
- [ ] extracted production data deleted (the ephemeral-handling promise from `references/repro-and-fix.md`)
- [ ] postmortem written
- [ ] journal status flipped to `closed`

## Journal schema

One journal per incident at `udflowOp/incidents/INCIDENT-<YYYYMMDD>-<slug>.md`. Every stage appends. Sanitization discipline, restated: nothing unmasked enters the journal — it is committed to git as the audit trail, so mask PII and secrets before writing, always. Before the journal (or a postmortem file) is committed, run a deterministic redaction pass — a secret/PII pattern scan (keys, tokens, passwords, emails, card-like numbers) over the file; agent judgment alone is not sufficient for a committed audit trail. At closure, offer to commit it.

~~~markdown
# INCIDENT-<YYYYMMDD>-<slug>

- Status: open | mitigated | closed
- Severity: SEV1 | SEV2 | SEV3
- Started: <timestamp> — Detected: <timestamp>
- Systems affected: <list>
- Current owner: <who>

## Timeline
- <timestamp> — <event / observation / action>

## Actions log
- <timestamp> — <what was done> — approved by: <who> (card: "<quoted decision-card text>") — result: <outcome>

## Evidence
- <sanitized log excerpt / exact error message>
- Fuller raw evidence (if retained): <where it lives, outside the repo>

## Fixed-check
- Declared: <the check, written before fixing>
- Red: <timestamp + failing output>
- Green: <timestamp + passing output>

## Closure checklist
- <the closure checklist above, with per-line state>
~~~

## Postmortem

Append it to the journal, or write a sibling file next to it. Factual, blame-free, short:

- **Trigger vs root cause** — distinguish them: the deploy was the trigger; the unvalidated input handling was the root cause.
- **Detection gap** — how long from start to noticed, and why: no alert, an ignored alert, no metric at all?
- **What went well / what went poorly** — two or three honest bullets each.
- **Gate-gap analysis** — the udflow-specific question: *which dev-flow gate SHOULD have caught this before ship?* A reviewer lens missing from the panel? The verification gate (a required check that never ran)? A missing acceptance criterion? An ops-profile red flag that was recorded and then ignored? Answer with a concrete, one-sentence prevention rule — not "be more careful".

## Failure-memory closure loop

From the postmortem, PROPOSE a failure-memory entry — context, what broke, root cause, fix, prevention rule, tags — using the exact template in `../../../examples/FAILURE_MEMORY.sample.md` (or the target file's own Entry Template when it already defines one).

- The MAIN THREAD is the single writer to `udflowOp/memory/FAILURE_MEMORY.md`. Never write it from a subagent — mirror universal-dev-flow's single-writer rule (`../../universal-dev-flow/references/verification-gate.md`, Failure Memory).
- The entry's prevention rule is what the dev flow's planning step reads before the next change: the incident feeds the exact gate that should have caught it. This loop is the point of the postmortem — without it, the lesson evaporates when the session ends.

## Lightweight comms

The journal's timeline makes stakeholder status updates a copy-edit, not a writing task. Offer to draft one, matched to the audience (internal versus customer-facing). No status-page automation — publishing an update stays a human action.
