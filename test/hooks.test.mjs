// Behavioral tests for the session hooks. Run with `npm test` (node --test).
// Hooks are CLI scripts that read a JSON event on stdin; we spawn them the same
// way Claude Code does. These lock in the fixes for the dogfood-review findings
// (digest omitted-count, oversized-entry cap, plan-gate anchoring) and guard the
// fail-open contract.
import { test } from "node:test";
import assert from "node:assert";
import cp from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS = path.join(root, "udflow", "hooks");
const MEM = path.join(HOOKS, "load-failure-memory.js");
const GATE = path.join(HOOKS, "plan-gate.js");
const globalMemExists = fs.existsSync(path.join(os.homedir(), ".claude", "FAILURE_MEMORY.md"));

function runHook(hookPath, input) {
  return cp.execFileSync("node", [hookPath], { input: JSON.stringify(input) }).toString();
}
function digestOf(input) {
  const out = runHook(MEM, input);
  return out.trim() ? JSON.parse(out).hookSpecificOutput.additionalContext : "";
}
function mkProject(memFile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "udflow-test-"));
  if (memFile != null) {
    fs.mkdirSync(path.join(dir, "ai"));
    fs.writeFileSync(path.join(dir, "ai", "FAILURE_MEMORY.md"), memFile, "utf8");
  }
  return dir;
}
function gate(input) {
  const out = runHook(GATE, input);
  return out.includes('"deny"') ? "DENY" : "ALLOW";
}

const TWO_ENTRIES_PLUS_PLACEHOLDER = `# FAILURE_MEMORY

## Entry Template

### <YYYY-MM-DD> — <short title>
- **Prevention rule**: the reusable rule.
- **Tags**: lang / area / type.

### 2026-06-18 — jsdom missing in CI
- **Prevention rule**: declare test-only deps as devDependencies.
- **Tags**: node / dependencies / ci.

### 2026-06-12 — hardcoded path separator
- **Prevention rule**: join paths via the platform API.
- **Tags**: cross-language / build / path.
`;

// --- load-failure-memory: digest correctness ---

test("B1: omitted note excludes the skipped template placeholder", () => {
  const ctx = digestOf({ cwd: mkProject(TWO_ENTRIES_PLUS_PLACEHOLDER) });
  assert.ok(ctx.includes("jsdom missing in CI"), "newest real entry present");
  assert.ok(ctx.includes("hardcoded path separator"), "older real entry present");
  assert.ok(!ctx.includes("<short title>"), "placeholder not injected");
  assert.ok(!/older entries omitted/.test(ctx), "must NOT claim entries were omitted when none were");
});

test("B2: an oversized newest entry still yields a non-empty digest (bounded, no lone note)", () => {
  const huge = "### 2026-06-20 — big\n- **Prevention rule**: " + "x".repeat(4000) + "\n";
  const ctx = digestOf({ cwd: mkProject(huge) });
  assert.ok(ctx.includes("2026-06-20 — big"), "newest entry survives the char cap");
  assert.ok(!/^\s*\(\d+ older entries omitted/.test(ctx.replace(/^Failure memory digest[^\n]*\n+/, "")),
    "must not be only an omitted-note with zero lessons");
});

test("MAX_ENTRIES: 22 entries -> 20 kept and omitted count is the real remainder", () => {
  let many = "# FM\n\n";
  for (let i = 1; i <= 22; i++) many += `### d${i} — entry ${i}\n- **Prevention rule**: rule ${i}.\n\n`;
  const ctx = digestOf({ cwd: mkProject(many) });
  assert.strictEqual((ctx.match(/— entry \d+/g) || []).length, 20, "keeps MAX_ENTRIES=20");
  assert.ok(/\(2 older entries omitted/.test(ctx), "omitted count = 22 - 20");
});

test("placeholder-only file injects nothing", () => {
  const ctx = digestOf({ cwd: mkProject("# FM\n\n### <YYYY-MM-DD> — <short title>\n- **Prevention rule**: x.\n") });
  assert.strictEqual(ctx, "");
});

test("empty file injects nothing", () => {
  assert.strictEqual(digestOf({ cwd: mkProject("") }), "");
});

test("missing memory file injects nothing (when no global file present)", (t) => {
  if (globalMemExists) return t.skip("global ~/.claude/FAILURE_MEMORY.md exists on this machine");
  assert.strictEqual(digestOf({ cwd: mkProject(null) }), "");
});

test("entry missing rule/tags degrades gracefully; CRLF parsed", () => {
  const ctx = digestOf({ cwd: mkProject("# FM\r\n\r\n### 2026-06-01 — bare\r\n- some note.\r\n") });
  assert.ok(ctx.includes("2026-06-01 — bare"));
  assert.ok(!ctx.includes("[tags:"), "no empty tags");
  assert.ok(!/— $/m.test(ctx), "no dangling em-dash for a missing rule");
});

// --- plan-gate: anchoring + tool coverage ---

test("B3: repo-local .claude/plans path is NOT exempt (denied in plan mode)", () => {
  const repoPlan = path.join(os.tmpdir(), "somerepo", ".claude", "plans", "notes.md");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: repoPlan } }), "DENY");
});

test("home ~/.claude/plans path IS exempt (allowed in plan mode)", () => {
  const homePlan = path.join(os.homedir(), ".claude", "plans", "plan-x.md");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: homePlan } }), "ALLOW");
});

test("normal file write is denied in plan mode, allowed otherwise", () => {
  const f = path.join(os.tmpdir(), "proj", "src", "app.ts");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: f } }), "DENY");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "default", tool_input: { file_path: f } }), "ALLOW");
});

test("NotebookEdit is gated in plan mode", () => {
  const nb = path.join(os.tmpdir(), "proj", "nb.ipynb");
  assert.strictEqual(gate({ tool_name: "NotebookEdit", permission_mode: "plan", tool_input: { notebook_path: nb } }), "DENY");
});

test("Read is never gated", () => {
  assert.strictEqual(gate({ tool_name: "Read", permission_mode: "plan", tool_input: { file_path: "/x/y.ts" } }), "ALLOW");
});

test("malformed stdin fails open (no deny, no crash)", () => {
  const out = cp.execFileSync("node", [GATE], { input: "not json {{{" }).toString();
  assert.strictEqual(out.trim(), "");
});

test("hooks.json PreToolUse matcher actually covers every gated tool", () => {
  const hj = JSON.parse(fs.readFileSync(path.join(HOOKS, "hooks.json"), "utf8"));
  const matcher = hj.hooks.PreToolUse[0].matcher;
  for (const tool of ["Write", "Edit", "MultiEdit", "NotebookEdit"]) {
    assert.ok(new RegExp(`^(?:${matcher})$`).test(tool), `${tool} must be in the matcher (else the gate never fires for it)`);
  }
});

test("project ai/FAILURE_MEMORY.md takes precedence and is named in the digest", () => {
  const ctx = digestOf({ cwd: mkProject("# FM\n\n### 2026-06-19 — proj entry\n- **Prevention rule**: r.\n") });
  assert.ok(ctx.includes("proj entry"));
  assert.ok(/FAILURE_MEMORY\.md/.test(ctx), "source path disclosed in the digest header");
});
