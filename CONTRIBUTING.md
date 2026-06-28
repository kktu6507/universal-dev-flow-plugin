# Contributing to udflow

Thanks for helping improve udflow.

udflow is a Claude Code plugin for plan-gated implementation, risk-selected review, verification, repair loops, and release-readiness judgment. It is **not** meant to be a maximal bug scanner. Keep the strongest claim honest: low-noise review discipline, explicit verification gates, and a gatekeeper verdict.

## Good contributions

- **Verified run reports** from real udflow usage (the most valuable kind — see below)
- False-positive reports
- Missed-defect reports
- Reviewer prompt improvements
- Hook hardening
- Documentation and onboarding improvements
- Reproducible tests for hook behavior
- Benchmark / evidence entries with verifiable ground truth

## Evidence standards

Please distinguish **adoption feedback** from **measured evidence**.

Good evidence has a **verifiable ground truth**, such as:

- a real task where the `READY` verdict **held up** (no defect escaped afterward)
- a real task where a defect **escaped** after `READY`
- a known historical bug tested **blind** against udflow's reviewers, judged against the real fix
- a **false positive** with concrete code and reasoning

Testimonials, stars, install counts, and "it felt useful" are welcome **adoption** signals — but they are **not** counted as measured correctness evidence. See [`EVIDENCE.md`](EVIDENCE.md) for how runs are counted (udflow ships **no telemetry**, so this is a manual, curated log).

## Reporting a verified run

Open a **"Verified udflow run"** issue. The form is short — pick the **run type** and **final verdict**, then paste the **"Live run" block udflow prints at the end of a real run** into the one **The run** box (or fill the skeleton): the task, the intent you gave, the **reviewers** that ran, the verification you ran, what udflow **caught**, what it **missed**, any **false positive**, whether the verdict **held up** after follow-up use, and a PR / commit / sanitized log — a verifiable artifact is what turns a claim into evidence. Easiest path: udflow prints that block at the end of a real run with a one-click link to this form, so it files in two picks and one paste.

**Sanitize** private code, secrets, credentials, customer data, and proprietary business rules before posting. If a run can't be shared safely, a sanitized summary with the outcome is still useful.

## Local development

Run the hook tests:

```bash
npm test
```

The tests exercise the Claude Code hook scripts (`udflow/hooks/*.js`) as CLI programs and preserve the **fail-open** and **plan-gate** behavior. `node .github/scripts/validate-structure.mjs` runs the structure / distribution-hygiene checks.

## Pull requests

1. Keep the change scoped.
2. Update documentation when behavior changes.
3. Add or update tests for hook behavior. **When you change a reviewer/agent prompt, re-run the `eval/` behavioral fixture suite** (`eval/README.md`) and update `eval/baseline.md` — a clear drop in hit-recall or a new false positive on a clean control is a regression to fix before merging.
4. Update `CHANGELOG.md` for user-visible changes — and bump the version in the four manifests (`udflow/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` ×2, `package.json`) when the shipped `udflow/` tree changes. Pure repo-root docs (README, EVIDENCE, this file) don't ship and don't need a bump.
5. Do not commit the workflow's runtime output (failure-memory files) or temporary verification artifacts into this repo.

## Tone and claims

Keep claims conservative and evidence-based.

- **Preferred:** "udflow is a release-readiness workflow with low-noise review behavior and explicit verification gates."
- **Avoid:** "udflow catches all bugs."

Recall depends on the task intent, reviewer context, and the specificity of the Review Packet — so the honest framing is precision + process, not exhaustive bug-finding.
