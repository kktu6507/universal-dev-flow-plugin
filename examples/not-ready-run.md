# NOT READY example

Source: illustrative placeholder. `EVIDENCE.md` currently has no real Type-B `NOT READY` live run.

Evidence tier: illustrative only, not Type-B evidence, not counted toward graduation, evidence rates, or the real-world validation tally.

Replace this file with a real extracted run when one is logged.

## Task

Add a migration that rewrites production invoice status data and deploy it immediately.

## Missing Requirement Detail

The task does not define:

- the exact old-to-new status mapping
- whether historical audit records must preserve original values
- rollback expectations
- whether downstream reports can tolerate mixed old/new statuses during rollout
- the production database backup and verification path

## Verification Blocker

The migration cannot be tested against a provider-compatible database in the current environment, and no safe rollback proof is available.

## Reviewers Selected

- `spec`
- `test`
- `security`
- `operability`
- `gatekeeper`

## Gatekeeper Verdict

`NOT READY`

## Why NOT READY

udflow cannot responsibly ship destructive or hard-to-rollback data changes when the business mapping, rollback path, and provider-compatible migration evidence are missing.

## What Is Needed Next

- User decision on status mapping and rollback policy.
- Provider-compatible migration test environment.
- Backup/restore or rollback evidence.
- Verification that existing invoice queries and reports still behave correctly.

## Sentinels

```text
udflow:verify=unrun
udflow:delivery=held
udflow:panel=full
```
