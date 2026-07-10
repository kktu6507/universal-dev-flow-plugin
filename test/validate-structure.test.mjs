// Negative-path tests for the CI structure validator (.github/scripts/validate-structure.mjs): each
// guard must FAIL on an injected defect in a temp copy of the repo, plus a clean-copy control.
// Split 2026-07-10 from test/hooks.test.mjs (test bodies preserved).
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { copyRepoTree, runValidator } from "./helpers.mjs";

// --- validate-structure CI guards: negative-path coverage (v0.10.2) ---
// The text-integrity (U+FFFD) and multilingual-README-parity checks are fail-only guards; lock in that they
// actually FAIL on a violation (not merely pass on the clean tree) by running the real validator against a
// temp copy of the repo with one injected defect. A future edit that silently disables a guard breaks these.

test("validate-structure: passes on a clean copy of the repo (control)", () => {
  const tree = copyRepoTree();
  try {
    assert.ok(!fs.existsSync(path.join(tree, "output")), "copyRepoTree must not drag run-scratch output/ into the temp tree");
    assert.ok(!fs.existsSync(path.join(tree, ".claude")), "copyRepoTree must not drag machine-private .claude/ into the temp tree");
    assert.strictEqual(runValidator(tree).code, 0, "the validator must pass on an unmodified copy");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: text-integrity check FAILS on a planted U+FFFD", () => {
  const tree = copyRepoTree();
  try {
    fs.appendFileSync(path.join(tree, "README.md"), "\nmojibake " + String.fromCharCode(0xFFFD) + " here\n");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "a tracked text file with U+FFFD must fail the build");
    assert.match(out, /text integrity/, "the failure must name the text-integrity check");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: text-integrity check FAILS on known mojibake markers", () => {
  const tree = copyRepoTree();
  try {
    fs.appendFileSync(path.join(tree, "README.md"), "\nmojibake " + String.fromCodePoint(0x7AB6) + " marker\n", "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "a known mojibake marker must fail the build");
    assert.match(out, /suspicious mojibake marker/, "the failure must name the mojibake marker guard");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: README parity FAILS on a top-level section-count mismatch", () => {
  const tree = copyRepoTree();
  try {
    fs.appendFileSync(path.join(tree, "README.md"), "\n## An English-only extra section\n\nbody\n");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "an asymmetric ## section count must fail the build");
    assert.match(out, /README parity/, "the failure must name README parity");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: README parity FAILS when the zh README omits a wired hook name", () => {
  const tree = copyRepoTree();
  try {
    const zhPath = path.join(tree, "README.zh-TW.md");
    fs.writeFileSync(zhPath, fs.readFileSync(zhPath, "utf8").split("plan-gate").join("PLANGATE_removed"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "zh omitting a wired hook name must fail the build");
    assert.match(out, /plan-gate/, "the failure must name the missing hook");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: README parity FAILS when either README drops a required entry link", () => {
  const tree = copyRepoTree();
  try {
    const zhPath = path.join(tree, "README.zh-TW.md");
    fs.writeFileSync(zhPath, fs.readFileSync(zhPath, "utf8").replace("template=verified-run.yml", "template=removed.yml"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "README entry links must stay present in both languages");
    assert.match(out, /missing required entry link/, "the failure must name the missing README link");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: README parity FAILS when the ja README omits a wired hook name", () => {
  const tree = copyRepoTree();
  try {
    const jaPath = path.join(tree, "README.ja.md");
    fs.writeFileSync(jaPath, fs.readFileSync(jaPath, "utf8").split("plan-gate").join("PLANGATE_removed"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "ja omitting a wired hook name must fail the build");
    assert.match(out, /plan-gate/, "the failure must name the missing hook");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: README parity FAILS when the ja README drops a required entry link", () => {
  const tree = copyRepoTree();
  try {
    const jaPath = path.join(tree, "README.ja.md");
    fs.writeFileSync(jaPath, fs.readFileSync(jaPath, "utf8").replace("template=verified-run.yml", "template=removed.yml"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "README entry links must stay present in every language");
    assert.match(out, /missing required entry link/, "the failure must name the missing README link");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: README parity FAILS when a translated README is deleted", () => {
  const tree = copyRepoTree();
  try {
    fs.rmSync(path.join(tree, "README.ja.md"));
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "deleting a translated README must fail the build");
    assert.match(out, /README\.ja\.md is missing/, "the failure must name the missing translated README");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: a version mismatch across manifests FAILS", () => {
  const tree = copyRepoTree();
  try {
    const pj = path.join(tree, "udflow", ".claude-plugin", "plugin.json");
    const obj = JSON.parse(fs.readFileSync(pj, "utf8"));
    obj.version = "9.9.9"; // disagree with marketplace.json / package.json / CHANGELOG
    fs.writeFileSync(pj, JSON.stringify(obj, null, 2), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "a version that disagrees across manifests must fail the build");
    assert.match(out, /version mismatch/, "the failure must name the version mismatch");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: §5j FAILS CLOSED when task-contract.md drops a guarded machine field", () => {
  const tree = copyRepoTree();
  try {
    const tc = path.join(tree, "udflow", "skills", "universal-dev-flow", "references", "task-contract.md");
    // Strip every occurrence of a field contract-check.mjs reads; the §5j guard must bite so a prose
    // edit can't silently gut the deterministic inputs while CI stays green (mirrors the 5d/5e guards).
    fs.writeFileSync(tc, fs.readFileSync(tc, "utf8").split("forbiddenPaths").join("XXX"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "dropping a guarded contract field must fail the build");
    assert.match(out, /no longer documents the machine field "forbiddenPaths"/, "the failure must name the dropped field");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: §5j FAILS CLOSED when review-packet.md drops a required template field", () => {
  const tree = copyRepoTree();
  try {
    const pk = path.join(tree, "udflow", "skills", "universal-dev-flow", "references", "review-packet.md");
    fs.writeFileSync(pk, fs.readFileSync(pk, "utf8").split("Verification evidence").join("XXX"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "dropping a packet template field must fail the build");
    assert.match(out, /review-packet\.md template is missing the required field/, "the failure must name the missing packet field");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: a missing SKILL-linked reference FAILS", () => {
  const tree = copyRepoTree();
  try {
    // SKILL.md links references/review-packet.md; deleting it must be caught by the broken-ref check.
    fs.rmSync(path.join(tree, "udflow", "skills", "universal-dev-flow", "references", "review-packet.md"));
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "a reference linked from SKILL.md but missing on disk must fail the build");
    assert.match(out, /missing reference/, "the failure must name the missing reference");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: dropping a sentinel from the compact final-report template FAILS (5d guard)", () => {
  const tree = copyRepoTree();
  try {
    // The realistic single-edit regression: remove the verify sentinel from the compact (Default)
    // template fence. The 5d guard must bite — and must NOT be masked by the intro-prose copy of the
    // same literals. .replace() hits the FIRST occurrence, which is the compact fence (before the
    // --report full fence), so this deletes it from the default rendering specifically.
    const fr = path.join(tree, "udflow", "skills", "universal-dev-flow", "references", "final-report.md");
    fs.writeFileSync(fr, fs.readFileSync(fr, "utf8").replace("udflow:verify=<pass|fail|unrun|na>", "verify status omitted"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "dropping a sentinel from the compact template fence must fail the build");
    assert.match(out, /compact template is missing the machine-contract literal/, "the failure must name the 5d sentinel guard");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: a mangled compact final-report fence fails CLOSED (5d guard)", () => {
  const tree = copyRepoTree();
  try {
    // Mangle the compact fence opener (first ~~~markdown = the compact fence). The region is bounded to
    // the compact section, so the guard must fail CLOSED — not fall through to the --report full fence
    // (which also holds the literals) and pass green.
    const fr = path.join(tree, "udflow", "skills", "universal-dev-flow", "references", "final-report.md");
    fs.writeFileSync(fr, fs.readFileSync(fr, "utf8").replace("~~~markdown", "```markdown"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "a mangled compact fence must fail closed, not fall through to the full fence");
    assert.match(out, /cannot locate the compact \(Default\)/, "the failure must name the fail-closed fence guard");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: reverting the --report full cost table to a single Tokens column FAILS (5e guard)", () => {
  const tree = copyRepoTree();
  try {
    // Revert the billable-component header (Input/Output/Cache-write/Cache-read) back to the old
    // single-`Tokens` column in the --report full cost table; the 5e guard must bite (AC2 contract).
    const fr = path.join(tree, "udflow", "skills", "universal-dev-flow", "references", "final-report.md");
    fs.writeFileSync(fr, fs.readFileSync(fr, "utf8").replace(
      "| Agent / phase | Input | Output | Cache-write | Cache-read | New | Share | Source | ~Cost |",
      "| Agent / phase | Tokens | Share | Source | ~Cost |"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "dropping the billable-component columns must fail the build");
    assert.match(out, /billable-component column/, "the failure must name the 5e cost-column guard");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: A6 dropping a guarded Fix-Class phrase from gatekeeper.agent.md FAILS (5f guard)", () => {
  const tree = copyRepoTree();
  try {
    // A6: the gatekeeper's Fix-Class safety rule (Extended-Safe / Residual; a Residual fix is "never
    // auto-applied") is a load-bearing contract. Removing the "never auto-applied" phrase must trip the
    // §5f contract-invariant guard so a prose edit can't silently gut the never-auto-ship rule.
    const gk = path.join(tree, "udflow", "agents", "gatekeeper.agent.md");
    fs.writeFileSync(gk, fs.readFileSync(gk, "utf8").split("never auto-applied").join("XXX"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "dropping a guarded Fix-Class phrase must fail the build");
    assert.match(out, /never auto-applied/, "the failure must name the dropped Fix-Class literal");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: missing release workflow FAILS (release asset guard)", () => {
  const tree = copyRepoTree();
  try {
    fs.rmSync(path.join(tree, ".github", "workflows", "validate.yml"));
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "missing release workflow must fail closed");
    assert.match(out, /missing release workflow/, "the failure must name the release workflow guard");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: missing release publisher script FAILS (release asset guard)", () => {
  const tree = copyRepoTree();
  try {
    fs.rmSync(path.join(tree, ".github", "scripts", "publish-release.mjs"));
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "missing release publisher script must fail closed");
    assert.match(out, /missing release publisher script/, "the failure must name the publisher script guard");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: release workflow must syntax-check the publisher script", () => {
  const tree = copyRepoTree();
  try {
    const p = path.join(tree, ".github", "workflows", "validate.yml");
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(
      "run: node --check .github/scripts/publish-release.mjs",
      "run: echo skipped-publisher-syntax-check"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "removing the publisher syntax check must fail closed");
    assert.match(out, /syntax-check/, "the failure must name the missing syntax-check contract");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: release workflow must delegate to the publisher script as an actual run line", () => {
  const tree = copyRepoTree();
  try {
    const p = path.join(tree, ".github", "workflows", "validate.yml");
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(
      "run: node .github/scripts/publish-release.mjs",
      "# run: node .github/scripts/publish-release.mjs\n        run: echo skipped-publisher"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "commented-out publisher command must fail closed");
    assert.match(out, /release job must call/, "the failure must name the release delegation contract");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: NOT READY example must stay marked non-evidence", () => {
  const tree = copyRepoTree();
  try {
    const p = path.join(tree, "examples", "not-ready-run.md");
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("Evidence tier: illustrative only, not Type-B evidence", "Evidence tier: publicly verifiable"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "illustrative NOT READY example must not lose its non-evidence marker");
    assert.match(out, /required provenance marker/, "the failure must name the provenance guard");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: illustrative packet/report examples must keep their disclaimers", () => {
  for (const [rel, marker] of [
    ["examples/review-packet.md", "not the verbatim packet"],
    ["examples/final-report-compact.md", "not a verbatim transcript"],
    ["examples/final-report-full.md", "not reconstructed"],
  ]) {
    const tree = copyRepoTree();
    try {
      const p = path.join(tree, rel);
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(marker, "claim removed"), "utf8");
      const { code, out } = runValidator(tree);
      assert.notStrictEqual(code, 0, `${rel} must not lose its illustrative/provenance marker`);
      assert.match(out, /required provenance marker/, "the failure must name the provenance guard");
    } finally { fs.rmSync(tree, { recursive: true, force: true }); }
  }
});

test("validate-structure: a shipped forbidden artifact FAILS (distribution hygiene)", () => {
  const tree = copyRepoTree();
  try {
    // A package.json inside the shipped plugin subdir is a dev artifact that must never ship.
    fs.writeFileSync(path.join(tree, "udflow", "package.json"), '{"name":"leak"}', "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "a runtime/dev artifact in the shipped tree must fail the build");
    assert.match(out, /distribution hygiene/, "the failure must name the distribution-hygiene check");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: a missing CHANGELOG entry for the current version FAILS", () => {
  const tree = copyRepoTree();
  try {
    const ver = JSON.parse(fs.readFileSync(path.join(tree, "udflow", ".claude-plugin", "plugin.json"), "utf8")).version;
    const cl = path.join(tree, "CHANGELOG.md");
    // Mangle the heading for the current version so the "## [<version>]" check can't find it.
    fs.writeFileSync(cl, fs.readFileSync(cl, "utf8").replace(`## [${ver}]`, "## [_removed_for_test_]"), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "a missing CHANGELOG entry for the manifest version must fail the build");
    assert.match(out, /CHANGELOG\.md has no/, "the failure must name the missing CHANGELOG entry");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: a hook dropped from its event FAILS (wiring gate)", () => {
  const tree = copyRepoTree();
  try {
    const hjPath = path.join(tree, "udflow", "hooks", "hooks.json");
    const hj = JSON.parse(fs.readFileSync(hjPath, "utf8"));
    delete hj.hooks.Stop; // orchestration-check.js no longer wired to any event
    fs.writeFileSync(hjPath, JSON.stringify(hj, null, 2), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "dropping a hook from its event must fail the build");
    assert.match(out, /Stop does not wire orchestration-check\.js/, "the failure must name the unwired hook");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

test("validate-structure: a PreToolUse matcher that stops covering a gated tool FAILS (wiring gate)", () => {
  const tree = copyRepoTree();
  try {
    const hjPath = path.join(tree, "udflow", "hooks", "hooks.json");
    const hj = JSON.parse(fs.readFileSync(hjPath, "utf8"));
    hj.hooks.PreToolUse[0].matcher = "Write|Edit"; // drops MultiEdit / NotebookEdit / Bash
    fs.writeFileSync(hjPath, JSON.stringify(hj, null, 2), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "narrowing the matcher below the gated tools must fail the build");
    assert.match(out, /PreToolUse matcher does not cover "Bash"/, "the failure must name the uncovered tool");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});

// --- 0.11.0 F4: matcher coverage is bound to the hook's own entry (cross-entry merge gap) ---

test("validate-structure: a second event entry can no longer cover another hook's matcher gap (scoped wiring gate)", () => {
  // Narrow plan-gate's OWN entry to drop MultiEdit, and add a SECOND PreToolUse entry that wires an
  // existing, README-named hook and whose matcher DOES cover MultiEdit. Under the old merged `.some()`
  // logic the gate passed (some entry covered MultiEdit); the scoped check must now fail because
  // plan-gate's own entry does not cover it.
  const tree = copyRepoTree();
  try {
    const hjPath = path.join(tree, "udflow", "hooks", "hooks.json");
    const hj = JSON.parse(fs.readFileSync(hjPath, "utf8"));
    const pre = hj.hooks.PreToolUse;
    pre[0].matcher = "Write|Edit|NotebookEdit|Bash"; // plan-gate entry: MultiEdit dropped
    pre.push({ matcher: "MultiEdit", hooks: [{ type: "command", command: pre[0].hooks[0].command.replace("plan-gate.js", "load-failure-memory.js") }] });
    fs.writeFileSync(hjPath, JSON.stringify(hj, null, 2), "utf8");
    const { code, out } = runValidator(tree);
    assert.notStrictEqual(code, 0, "a different entry's matcher must not satisfy plan-gate's own coverage");
    assert.match(out, /matcher does not cover "MultiEdit"/, "the failure must name the token plan-gate's own entry omits");
  } finally { fs.rmSync(tree, { recursive: true, force: true }); }
});
