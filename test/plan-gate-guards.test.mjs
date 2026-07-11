// Behavioral tests for the PreToolUse guard hooks: plan-gate (plan-mode write gate), destructive-guard
// (all-modes ask on unrecoverable commands), and contract-guard (contract.md / design.md tripwire).
// Split 2026-07-10 from test/hooks.test.mjs (test bodies preserved; the per-hook opt-out suites are
// table-driven). Hooks are CLI scripts that read a JSON event on stdin; we spawn them the same way
// Claude Code does.
import { test } from "node:test";
import assert from "node:assert";
import cp from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CGUARD, DGUARD, GATE, HOOKS,
  cguard, contractMd, contractPath, dguard, gate, gateInProject, isolatedHome,
  mkCGuardProject, mkProjectWithSettings, runHook, writeContract,
} from "./helpers.mjs";

// --- plan-gate: anchoring + tool coverage ---

test("B3: repo-local .claude/plans path is NOT exempt (denied in plan mode)", () => {
  const repoPlan = path.join(os.tmpdir(), "somerepo", ".claude", "plans", "notes.md");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: repoPlan } }), "DENY");
});

test("home ~/.claude/plans path IS exempt (isolated home)", (t) => {
  const { home, env } = isolatedHome();
  t.after(() => { try { fs.rmSync(home, { recursive: true, force: true }); } catch (e) {} });
  const homePlan = path.join(home, ".claude", "plans", "plan-x.md");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: homePlan } }, env), "ALLOW");
});

test("plan-gate: a junction under ~/.claude/plans whose target escapes is NOT exempt (denied)", (t) => {
  // realpathDeepest must resolve a symlink/junction so a "plans"-named link can't redirect
  // a write outside the exemption. Uses a junction (no admin needed on Windows); EPERM-skip.
  // Isolated home so it never creates/writes the developer's real ~/.claude/plans.
  const { home, env } = isolatedHome();
  t.after(() => { try { fs.rmSync(home, { recursive: true, force: true }); } catch (e) {} });
  const plansDir = path.join(home, ".claude", "plans");
  let link;
  try {
    fs.mkdirSync(plansDir, { recursive: true });
    const target = fs.mkdtempSync(path.join(os.tmpdir(), "udflow-escape-"));
    link = path.join(plansDir, "udflow-test-junction");
    fs.symlinkSync(target, link, "junction");
  } catch (e) {
    return t.skip("cannot create a junction here: " + (e && e.code));
  }
  const escaped = path.join(link, "escaped.ts"); // resolves to <target>/escaped.ts, outside plans
  assert.strictEqual(
    gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: escaped } }, env),
    "DENY",
    "a junction whose target escapes ~/.claude/plans must not be exempt"
  );
});

test("plan-gate: a symlinked HOME still exempts ~/.claude/plans (realpath BOTH sides)", (t) => {
  // The exemption compares realpath(target) against realpath(~/.claude/plans). If HOME itself is
  // reached through a symlink (e.g. macOS, where the temp dir resolves via /var -> /private/var, or
  // any symlinked home), the root must be resolved too or the legitimate plan write is wrongly denied.
  // Fails on every platform if only the target is realpath-resolved. Skip where a dir symlink can't be
  // created (Windows without privilege).
  const realHome = fs.mkdtempSync(path.join(os.tmpdir(), "udflow-realhome-"));
  const linkParent = fs.mkdtempSync(path.join(os.tmpdir(), "udflow-linkhome-"));
  const linkHome = path.join(linkParent, "home-link");
  t.after(() => {
    try { fs.rmSync(realHome, { recursive: true, force: true }); } catch (e) {}
    try { fs.rmSync(linkParent, { recursive: true, force: true }); } catch (e) {}
  });
  try {
    fs.mkdirSync(path.join(realHome, ".claude", "plans"), { recursive: true });
    fs.symlinkSync(realHome, linkHome, "dir");
  } catch (e) {
    return t.skip("cannot create a directory symlink here: " + (e && e.code));
  }
  const env = { ...process.env, HOME: linkHome, USERPROFILE: linkHome };
  delete env.CLAUDE_PROJECT_DIR;
  const planFile = path.join(linkHome, ".claude", "plans", "p.md"); // under the SYMLINKED home
  assert.strictEqual(
    gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: planFile } }, env),
    "ALLOW",
    "a plan file under a symlinked home's ~/.claude/plans must stay exempt"
  );
});

test("plan-gate: on a case-sensitive FS, an uppercase ~/.claude/PLANS path is NOT exempt", (t) => {
  // The exemption folds case only on case-insensitive filesystems (Windows/macOS). On Linux a
  // real directory literally named PLANS must not inherit the lowercase 'plans' exemption.
  if (process.platform === "win32" || process.platform === "darwin") return t.skip("case-insensitive FS");
  const { home, env } = isolatedHome();
  t.after(() => { try { fs.rmSync(home, { recursive: true, force: true }); } catch (e) {} });
  const upper = path.join(home, ".claude", "PLANS", "x.md");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: upper } }, env), "DENY",
    "uppercase PLANS must not be exempt on a case-sensitive FS");
});

test("plan-gate: on a case-insensitive FS, an uppercase ~/.claude/PLANS path IS exempt (same dir)", (t) => {
  // Mirror of the case-sensitive test: empirical FS detection must treat PLANS == plans on a
  // case-insensitive volume (Windows/macOS), so a home-dir plan file under either casing is exempt.
  if (process.platform !== "win32" && process.platform !== "darwin") return t.skip("case-sensitive FS");
  const { home, env } = isolatedHome();
  t.after(() => { try { fs.rmSync(home, { recursive: true, force: true }); } catch (e) {} });
  fs.mkdirSync(path.join(home, ".claude", "plans"), { recursive: true }); // the probe samples this subtree
  const upper = path.join(home, ".claude", "PLANS", "plan-x.md");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: upper } }, env), "ALLOW",
    "uppercase PLANS must be exempt on a case-insensitive FS (it is the same directory as plans)");
  // The case-fold is scoped to the plans root: a same-home NON-plans uppercase path stays denied.
  const notes = path.join(home, ".claude", "NOTES", "x.md");
  assert.strictEqual(gate({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: notes } }, env), "DENY",
    "case-folding must be scoped to the plans root, not blanket-lowercasing every path into exemption");
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

test("Edit and MultiEdit are behaviorally gated in plan mode", () => {
  const f = path.join(os.tmpdir(), "proj", "app.ts");
  for (const tool of ["Edit", "MultiEdit"]) {
    assert.strictEqual(gate({ tool_name: tool, permission_mode: "plan", tool_input: { file_path: f } }), "DENY", `${tool} must be denied in plan mode`);
  }
});

test("Read is never gated", () => {
  assert.strictEqual(gate({ tool_name: "Read", permission_mode: "plan", tool_input: { file_path: "/x/y.ts" } }), "ALLOW");
});

test("Bash tripwire: obvious working-tree writes are denied in plan mode", () => {
  for (const command of [
    "echo hello > out.txt",
    "echo more >> log.md",
    "cat a b &> merged.txt",
    "cat a &>> merged.txt",          // &>> append-both
    "printf x | tee notes.txt",
    "printf x | tee -a notes.txt",   // tee -a (flag-skip path)
    "sed -i 's/a/b/' src/app.ts",
    "sed -i.bak 's/a/b/' app.ts",    // -i<suffix> (dominant GNU/BSD form)
    "sed --in-place 's/a/b/' app.ts",// GNU long form
    "git apply fix.patch",
    "echo x > out.txt 2>&1",         // real file redirect alongside a fd dup
    "   echo x > f",                 // leading whitespace (the ^ branch)
    "cat a >> OUTPUT.TXT",           // uppercase path (case-insensitive)
    "echo x > src/out.txt",          // redirect to a path with a directory
    "ls; echo x > f",                // redirect in the second chained command
    "git status; git apply fix.patch", // git apply mid-chain after ;
    "ls && git apply p.patch",       // git apply after &&
    "perl -i -pe 's/a/b/' app.ts",   // perl in-place edit
    "perl -i.bak -pe1 src/app.ts",   // perl -i<suffix>
    "perl -pi -e 's/x/y/' f.txt",    // perl -pi (combined flags)
    "truncate -s 0 build.log",       // truncate resizes/creates a file
    "truncate -s0 f",                // truncate, no space
    "dd if=/dev/zero of=out.bin bs=1 count=1", // dd writing via of=
    "(dd if=/dev/zero of=out.bin bs=1 count=1)", // dd via of= inside a subshell — `(` is an anchor too
    "((dd if=/dev/zero of=out.bin bs=1 count=1))", // nested subshell — the inner `(` still anchors (single-char class, no paren balancing)
    "ln -s ../secret link",          // symlink creation
    "ln target.txt hardlink.txt",    // hard link creation
    "ls; ln -sf a b",                // ln after a chain separator
  ]) {
    assert.strictEqual(gate({ tool_name: "Bash", permission_mode: "plan", tool_input: { command } }), "DENY", `should block: ${command}`);
  }
});

test("Bash tripwire: read-only / benign commands are allowed in plan mode", () => {
  for (const command of [
    "git status",
    "git diff HEAD~1",
    "git log --oneline -20",
    "git checkout main",            // branch nav — intentionally NOT blocked (usability)
    "git restore --staged .",       // intentionally NOT blocked
    "git apply --check fix.patch",  // dry run — writes nothing, exempt
    "git apply --stat fix.patch",   // report-only, exempt
    "ls -la src",
    "cat package.json",
    "rg --files",
    "grep -n 'foo > bar' app.ts",   // '>' is a quoted arg to grep, not a redirect
    "sed -n 'p' app.ts",            // sed without -i is read-only
    "node --check hooks/plan-gate.js",
    "echo hi > /dev/null",          // /dev/null excluded
    "ls 2>&1 | grep x",             // fd dup, not a file write
    "perl -ne 'print if /foo/' app.txt", // perl without -i is read-only
    "perl -pe 's/a/b/' app.txt",    // perl -pe (no -i) writes to stdout, not the file
    "dd if=/dev/zero of=/dev/null bs=1 count=1", // of=/dev/null excluded
    "(dd if=/dev/zero of=/dev/null bs=1 count=1)", // of=/dev/null exemption holds inside a subshell too
    "(dd if=/dev/zero of=NUL bs=1 count=1)", // of=NUL exemption holds inside a subshell too (Windows null device)
    "dd if=disk.img bs=1M | sha256sum", // dd without of= writes stdout, not a file
    "cat truncate.md",              // 'truncate' as an argument, not the command
    "grep -n println src/app.rs",   // 'ln' inside a word is not the ln command
  ]) {
    assert.strictEqual(gate({ tool_name: "Bash", permission_mode: "plan", tool_input: { command } }), "ALLOW", `should allow: ${command}`);
  }
});

test("Bash tripwire: only fires in plan mode (a write is allowed outside plan)", () => {
  assert.strictEqual(gate({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "echo x > out.txt" } }), "ALLOW");
});

test("Bash tripwire: documented conservative misses stay allowed (boundary is intentional)", () => {
  // These can write but are deliberately NOT caught — tightening would add false positives
  // (e.g. arithmetic $((a>b))), which the design ranks as worse than a documented miss.
  // The workflow rule (no Bash tree-writes while planning) is the real guarantee, not this gate.
  for (const command of [
    "echo x>f",                     // no-space redirect glued to a word char
    "echo data>>app.log",           // no-space append
    "echo x >| forced.txt",         // >| noclobber-override redirect
    'echo x > "out file.txt"',      // quoted target stripped before the redirect match
    "echo x > $OUT",                // variable redirect target
    "echo can't > a.txt won't",     // paired word-internal apostrophes erase the redirect
  ]) {
    assert.strictEqual(gate({ tool_name: "Bash", permission_mode: "plan", tool_input: { command } }), "ALLOW", `documented miss should stay allowed: ${command}`);
  }
});

test("Bash tripwire: a quoted redirection target is a literal, not a real write", () => {
  assert.strictEqual(gate({ tool_name: "Bash", permission_mode: "plan", tool_input: { command: "echo 'value > threshold'" } }), "ALLOW");
});

test("Bash tripwire: the deny reason names the heuristic and the escape hatch", () => {
  const out = runHook(GATE, { tool_name: "Bash", permission_mode: "plan", tool_input: { command: "sed -i 's/a/b/' app.ts" } });
  assert.match(out, /"deny"/);
  assert.match(out, /best-effort|ExitPlanMode/, "bash deny reason should be actionable");
});

test("malformed stdin fails open (no deny, no crash)", () => {
  const out = cp.execFileSync("node", [GATE], { input: "not json {{{" }).toString();
  assert.strictEqual(out.trim(), "");
});

test("hooks.json PreToolUse matcher actually covers every gated tool", () => {
  const hj = JSON.parse(fs.readFileSync(path.join(HOOKS, "hooks.json"), "utf8"));
  const matcher = hj.hooks.PreToolUse[0].matcher;
  for (const tool of ["Write", "Edit", "MultiEdit", "NotebookEdit", "Bash"]) {
    assert.ok(new RegExp(`^(?:${matcher})$`).test(tool), `${tool} must be in the matcher (else the gate never fires for it)`);
  }
});

// --- plan-gate: field alias + stdin cap (findings I/J) ---

test("plan-gate honors camelCase permissionMode alias", () => {
  const f = path.join(os.tmpdir(), "proj", "app.ts");
  assert.strictEqual(gate({ tool_name: "Write", permissionMode: "plan", tool_input: { file_path: f } }), "DENY");
});

test("plan-gate fails open (allow) on oversized stdin", () => {
  // The hook caps stdin and exits early, which can EPIPE the parent's write — use
  // spawnSync (tolerant of the early close) and assert it did not deny (fail-open).
  const big = "x".repeat(6 * 1024 * 1024);
  const input = JSON.stringify({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: "/p/app.ts", content: big } });
  const r = cp.spawnSync("node", [GATE], { input, maxBuffer: 64 * 1024 * 1024 });
  assert.strictEqual((r.stdout || "").toString().includes('"deny"'), false, "over-cap stdin must fail open, not deny");
});

test("plan-gate deny JSON is fully flushed even with a large payload", () => {
  const big = "y".repeat(2 * 1024 * 1024); // under the 5MB cap
  const input = JSON.stringify({ tool_name: "Write", permission_mode: "plan", tool_input: { file_path: "/p/app.ts", content: big } });
  const out = cp.execFileSync("node", [GATE], { input, maxBuffer: 64 * 1024 * 1024 }).toString();
  const j = JSON.parse(out); // must be complete, parseable JSON (not truncated)
  assert.strictEqual(j.hookSpecificOutput.permissionDecision, "deny");
});

// --- plan-gate: project opt-out (P2.2) ---

const PLAN_WRITE = { tool_name: "Write", permission_mode: "plan", tool_input: { file_path: path.join(os.tmpdir(), "proj", "app.ts") } };

// Table-driven (P2b split): the five same-shape settings-variant tests share one body; each row
// keeps its original test name and assertion message.
for (const row of [
  { name: "plan-gate P2.2: udflow.planGate=false in settings.json allows in plan mode",
    settings: { udflow: { planGate: false } }, expected: "ALLOW",
    msg: "the opt-out must disable the gate for this project" },
  { name: "plan-gate P2.2: settings.local.json opt-out overrides settings.json",
    settings: { udflow: { planGate: true } },                                  // project: enforce
    localSettings: { udflow: { planGate: false } },                            // local: disable (higher precedence)
    expected: "ALLOW", msg: "the local override must take precedence" },
  { name: "plan-gate P2.2: no flag still denies in plan mode (default enforce)",
    settings: { permissions: { allow: [] } },                                  // unrelated settings, no udflow key
    expected: "DENY", msg: "an absent flag must keep the gate on" },
  { name: "plan-gate P2.2: planGate=true explicitly enforces (deny)",
    settings: { udflow: { planGate: true } }, expected: "DENY" },
  { name: "plan-gate P2.2: malformed project settings fail safe to enforce (deny)",
    settings: "{ not: valid json ", expected: "DENY",
    msg: "a broken settings file must not silently drop the gate" },
]) {
  test(row.name, () => {
    const dir = mkProjectWithSettings(row.settings);
    if (row.localSettings) {
      fs.writeFileSync(path.join(dir, ".claude", "settings.local.json"), JSON.stringify(row.localSettings), "utf8");
    }
    assert.strictEqual(gateInProject(PLAN_WRITE, dir), row.expected, row.msg);
  });
}

test("plan-gate P2.2: the opt-out resolves from the event cwd when CLAUDE_PROJECT_DIR is unset", () => {
  const dir = mkProjectWithSettings({ udflow: { planGate: false } });
  const env = { ...process.env }; delete env.CLAUDE_PROJECT_DIR;
  assert.strictEqual(gate({ ...PLAN_WRITE, cwd: dir }, env), "ALLOW", "the cwd fallback must locate the project opt-out");
});

// --- destructive-guard: all-modes "ask" on unrecoverable Bash commands (item 11) ---

test("destructive-guard: ASKS on unrecoverable commands in ANY mode (incl. default — the gap plan-gate misses)", () => {
  for (const command of [
    "git reset --hard HEAD~3",
    "git reset HEAD~1 --hard",          // flag after the ref
    "git push --force",
    "git push -f origin main",
    "git push origin main --force-with-lease",
    "rm -rf build",
    "rm -fr ./dist",                    // -fr order
    "ls && rm -rf node_modules",        // after a chain separator
    "find . -name '*.tmp' -delete",
    "dd if=/dev/zero of=/dev/sda bs=1M",// of=<real device>
    "(dd if=/dev/zero of=/dev/sda bs=1M)", // of=<real device> inside a subshell — `(` anchor
    "mkfs.ext4 /dev/sdb1",
    "shred -u secret.key",
  ]) {
    assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command } }), "ASK", `should ask: ${command}`);
  }
  // Fires in ALL modes — the same command in plan mode also asks (this is the post-approval gap plan-gate misses).
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "plan", tool_input: { command: "git reset --hard" } }), "ASK");
});

test("destructive-guard: ALLOWS benign / recoverable / quoted commands (narrow deny-list, no FP)", () => {
  for (const command of [
    "git status",
    "git push origin main",            // no force
    "git reset --soft HEAD~1",         // soft reset is recoverable
    "git restore --staged .",          // deferred from v1 — must NOT ask
    "git clean -n",                    // dry-run / deferred from v1
    "rm file.txt",                     // no -rf
    "rm -r dir",                       // -r without -f
    "find . -name '*.tmp'",            // no -delete
    "dd if=disk.img of=/dev/null bs=1M",  // of=/dev/null exempt
    "(dd if=disk.img of=/dev/null bs=1M)", // of=/dev/null exemption holds inside a subshell too
    "echo \"rm -rf /\"",               // quoted literal, not a real command
    "git log --oneline -20",
  ]) {
    assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command } }), "ALLOW", `should allow: ${command}`);
  }
});

test("destructive-guard: only Bash is in scope (a Write whose content contains rm -rf is never its concern)", () => {
  assert.strictEqual(dguard({ tool_name: "Write", permission_mode: "default", tool_input: { file_path: "/x/y.ts", content: "rm -rf /" } }), "ALLOW");
});

// Table-driven (P2b split): the three settings-variant tests share one body; each row keeps its
// original test name and assertion message.
for (const row of [
  { name: "destructive-guard: project opt-out udflow.destructiveGuard=false allows",
    settings: { udflow: { destructiveGuard: false } }, command: "git reset --hard", expected: "ALLOW" },
  { name: "destructive-guard: settings.local.json opt-out overrides settings.json",
    settings: { udflow: { destructiveGuard: true } },
    localSettings: { udflow: { destructiveGuard: false } },
    command: "rm -rf x", expected: "ALLOW", msg: "local override must take precedence" },
  { name: "destructive-guard: malformed project settings fail safe to ASK (a broken file never drops the net on a match)",
    settings: "{ not: valid json ", command: "git reset --hard", expected: "ASK",
    msg: "broken settings must fail-closed-to-ask on a matched command" },
]) {
  test(row.name, () => {
    const dir = mkProjectWithSettings(row.settings);
    if (row.localSettings) {
      fs.writeFileSync(path.join(dir, ".claude", "settings.local.json"), JSON.stringify(row.localSettings), "utf8");
    }
    const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
    assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: row.command } }, env), row.expected, row.msg);
  });
}

test("destructive-guard: malformed stdin fails open (no ask, no crash)", () => {
  const out = cp.execFileSync("node", [DGUARD], { input: "not json {{{" }).toString();
  assert.strictEqual(out.trim(), "", "unparseable input -> fail open (allow), never crash");
});

test("destructive-guard: oversized stdin fails open (allow)", () => {
  const big = "x".repeat(6 * 1024 * 1024);
  const input = JSON.stringify({ tool_name: "Bash", tool_input: { command: "rm -rf x #" + big } });
  const r = cp.spawnSync("node", [DGUARD], { input, maxBuffer: 64 * 1024 * 1024 });
  assert.strictEqual((r.stdout || "").toString().includes('"ask"'), false, "over-cap stdin must fail open, not ask");
});

test("destructive-guard: separated rm flags (rm -r -f / rm -f -r / long forms) now ASK, while single-token rm -rf still asks", () => {
  // 0.27.0 (item H): separated recursive+force flags in any order/spacing are an unrecoverable recursive
  // force-delete, the same intent the combined rm -rf pattern already owns — high-confidence, so it ASKs.
  for (const command of [
    "rm -r -f build",
    "rm -f -r ./dist",
    "rm --recursive --force x",
    "rm -f --recursive x",
    "rm -r --force x",
    "ls && rm -r -f node_modules",     // after a chain separator
    "rm -r -f -v build",               // extra unrelated flag between/around them
  ]) {
    assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command } }), "ASK", `should ask: ${command}`);
  }
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "rm -rf x" } }), "ASK", "single-token rm -rf still asks");
});

test("destructive-guard: a single rm flag (recursive-only or force-only) stays ALLOW — no FP from the split-flag rule", () => {
  // The split-flag rule requires BOTH a recursive AND a force flag; one alone, or the two split across a
  // chain boundary, must NOT ask. Pins the high-confidence boundary so the new patterns can't creep into FPs.
  for (const command of [
    "rm -r dir",                       // recursive only
    "rm -f file",                      // force only
    "rm -rv dir",                      // recursive + verbose, no force
    "rm -i file",                      // interactive, neither
    "rm file.txt",                     // no flags
    "rm report-final.txt",             // filename with r/f letters, not flags
    "rm -r dir; rm -f file",           // r and f split across ';' -> not one recursive-force delete
  ]) {
    assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command } }), "ALLOW", `should allow: ${command}`);
  }
});

test("destructive-guard: separated-flag fail-open preserved (malformed stdin still no ask, no crash)", () => {
  const out = cp.execFileSync("node", [DGUARD], { input: "not json {{{" }).toString();
  assert.strictEqual(out.trim(), "", "unparseable input -> fail open (allow), never crash");
});

test("destructive-guard F1: bounded separated-flag patterns still ASK on realistic forms (correctness preserved)", () => {
  // The {0,200} inter-flag bound (added to stop O(n^2) ReDoS backtracking) narrows the two separated-flag
  // patterns but must not drop any realistic recursive+force delete — a real one carries both flags within a
  // couple hundred chars, so every separated form (incl. one with ~100 chars between the flags) still asks.
  for (const command of [
    "rm -r -f x",
    "rm -f -r x",
    "rm --recursive --force x",
    `rm -r ${"a ".repeat(50)} -f`,      // ~100 chars between the two flags — comfortably within the 200 bound
  ]) {
    assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command } }), "ASK", `should ask: ${command.slice(0, 40)}`);
  }
});

test("destructive-guard F1: a pathological rm input returns a decision quickly (linear, not quadratic ReDoS)", () => {
  // Pre-fix each separated-flag pattern had two unbounded [^;&|]* runs, so many whitespace/newline-separated
  // `rm ` anchors drove O(n^2) backtracking (~15s+ at this size — the synchronous regex ran to completion
  // before the 5s stdin watchdog could fire). The {0,200} bound makes it linear: the hook now returns a
  // decision well under this GENEROUS wall-clock bound. Large margin (node startup + a ~300KB parse) avoids CI flakiness.
  const command = "rm f\n".repeat(60000); // ~300KB of newline-separated `rm ` anchors, none carrying a flag
  const t0 = Date.now();
  const decision = dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command } });
  const elapsed = Date.now() - t0;
  assert.strictEqual(decision, "ALLOW", "`rm f` carries no recursive+force flags, so the guard must not ask");
  assert.ok(elapsed < 3000, `bounded pattern must return quickly (linear); took ${elapsed}ms`);
});

test("destructive-guard: PowerShell-native destructive forms (Windows/Copilot) ASK", () => {
  // On Windows the model rewrites POSIX into cmdlets, so `rm -rf` runs as `Remove-Item -Recurse -Force`.
  for (const command of [
    "Remove-Item -Recurse -Force 'C:\\Temp\\x' -ErrorAction SilentlyContinue", // the exact Copilot-on-Windows rewrite of rm -rf
    "Remove-Item -Recurse C:\\build",          // recursive delete, no -Force (still recursive)
    "remove-item -r -fo .\\dist",              // lowercase + abbreviated flags
    "ri -Recurse -Force node_modules",         // ri alias
    "Format-Volume -DriveLetter D",
    "Clear-Disk -Number 1 -RemoveData",
    "Get-ChildItem; Remove-Item -Recurse C:\\tmp", // after a statement separator
  ]) {
    assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command } }), "ASK", `should ask: ${command}`);
  }
});

test("destructive-guard: non-recursive / non-destructive PowerShell stays ALLOW (no FP)", () => {
  for (const command of [
    "Remove-Item 'C:\\Temp\\one.txt'",         // single file, no -Recurse
    "Remove-Item -Force 'C:\\Temp\\one.txt'",  // -Force but not recursive
    "Get-ChildItem -Recurse -Filter *.log",    // recurse but not a delete cmdlet
    "ri config.json",                          // alias, single file
    "Format-Table -AutoSize",                  // Format-* but not Format-Volume
  ]) {
    assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command } }), "ALLOW", `should allow: ${command}`);
  }
});

test("destructive-guard: git push --force-fast (a non-flag) does NOT false-ask, but --force / --force-with-lease still do", () => {
  // The --force(?![\w-]) tighten removes the false-ask on a hypothetical --force-<suffix> while keeping
  // the two real force flags via their own alternation branches.
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "git push --force-fast origin main" } }), "ALLOW", "a non-existent --force-<suffix> flag must not false-ask");
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "git push --force" } }), "ASK", "real --force still asks");
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "git push --force-with-lease" } }), "ASK", "real --force-with-lease still asks");
});

test("destructive-guard A4: a parenthesized subshell running a destructive command ASKS; a benign paren does NOT", () => {
  // A4: the POSIX-pattern leading anchor now includes '(' so a subshell like `(rm -rf /tmp/x)` is caught
  // (previously the '(' before `rm` blocked the start/space/separator anchor and it slipped). Char-class
  // addition only: a '(' immediately before a destructive keyword IS a subshell running it, so asking is
  // correct — while a paren with NO destructive keyword must still not ask (guard against over-broadening).
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "(rm -rf /tmp/x)" } }), "ASK", "a parenthesized subshell rm -rf must ask");
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "(cd build && make)" } }), "ALLOW", "a subshell with no destructive keyword must not ask");
});

test("destructive-guard A4: the '(' subshell anchor fires beyond rm (non-rm destructive commands ASK)", () => {
  // The '(' leading anchor is shared by every POSIX pattern, not just rm — prove it catches a non-rm
  // destructive keyword inside a subshell too, so the anchor's coverage is not silently rm-only.
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "(git reset --hard)" } }), "ASK", "a subshell git reset --hard must ask");
  assert.strictEqual(dguard({ tool_name: "Bash", permission_mode: "default", tool_input: { command: "(mkfs.ext4 /dev/sda1)" } }), "ASK", "a subshell mkfs must ask");
});

// --- contract-guard: content-based Write/Edit/MultiEdit tripwire on contract.md + design.md (new hook) ---
// PreToolUse only ever sees tool_name/tool_input/cwd/permission_mode — this hook is content-based, not
// actor-based (it cannot tell WHO is editing). It simulates the tool's proposed result locally (never
// invokes the tool) and asks (never denies) only when the simulated diff would drop previously recorded
// contract.md content or wholesale-delete a design.md section.

test("contract-guard: pure-append to contract.md (new AC added, everything old intact) is allowed", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const oldMd = contractMd();
  const newMd = oldMd.replace(
    '"mustNotChange": [\n    "public signature of AuthService.request"\n  ]',
    '"mustNotChange": [\n    "public signature of AuthService.request"\n  ],\n  "extra": "note"'
  );
  const input = { tool_name: "Edit", cwd: dir, tool_input: { file_path: contractPath(dir), old_string: oldMd, new_string: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "a pure-append edit that keeps every old field must be allowed");
});

test("contract-guard: silently altering an existing AC's text/verification asks, naming the AC id", () => {
  const dir = mkCGuardProject();
  const oldMd = contractMd();
  writeContract(dir, oldMd);
  const newMd = contractMd({ acceptanceCriteria: [{ id: "AC-1", text: "token refreshed EVENTUALLY", behaviorChanging: true, verification: "test/auth.test.mjs::refreshes once" }] });
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /AC-1/, "the ask must name the altered criterion's id");
  assert.match(r.reason, /text would change/i);
});

test("contract-guard: a verification mapping silently altered on the same AC also asks", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const newMd = contractMd({ acceptanceCriteria: [{ id: "AC-1", text: "expired token refreshed once", behaviorChanging: true, verification: "test/auth.test.mjs::DIFFERENT" }] });
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /AC-1/);
  assert.match(r.reason, /verification would change/i);
});

test("contract-guard: dropping an existing AC id entirely (not just editing it) asks, naming it as removed", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const newMd = contractMd({ acceptanceCriteria: [] }); // AC-1 is gone entirely from the new content
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /acceptance criterion "AC-1" would be removed/, "a dropped AC id must be named with the removal wording, not a field-change wording");
});

test("contract-guard: flipping behaviorChanging true->false on a retained AC id asks, naming that field specifically", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const newMd = contractMd({ acceptanceCriteria: [{ id: "AC-1", text: "expired token refreshed once", behaviorChanging: false, verification: "test/auth.test.mjs::refreshes once" }] });
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /AC-1/);
  assert.match(r.reason, /behaviorChanging would change \(true -> false\)/i, "the ask must name the behaviorChanging field specifically, not just text/verification");
});

test("contract-guard A3: dropping an id-LESS acceptance criterion (matched by text) asks, naming it as removed", () => {
  // task-contract.md does not require an `id`. An id-less AC still records a promise, so a REMOVAL must be
  // caught — matched by exact text and flagged when that text no longer appears in any new AC.
  const dir = mkCGuardProject();
  writeContract(dir, contractMd({ acceptanceCriteria: [{ text: "id-less alpha" }, { text: "id-less beta" }] }));
  const newMd = contractMd({ acceptanceCriteria: [{ text: "id-less alpha" }] }); // beta dropped entirely
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /acceptance criterion "id-less beta" would be removed/, "an id-less removal must be named by its text");
});

test("contract-guard A3: a benign reorder of id-less ACs (same texts, different order) does NOT ask", () => {
  // Matching by content (not position) => a pure reorder that preserves every text is not a removal.
  const dir = mkCGuardProject();
  writeContract(dir, contractMd({ acceptanceCriteria: [{ text: "id-less alpha" }, { text: "id-less beta" }] }));
  const reordered = contractMd({ acceptanceCriteria: [{ text: "id-less beta" }, { text: "id-less alpha" }] });
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: reordered } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "reordering id-less ACs while keeping every text must not ask");
});

test("contract-guard: removing a mustNotChange entry asks", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const newMd = contractMd({ mustNotChange: [] });
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /mustNotChange entry "public signature of AuthService\.request" would be removed/);
});

test("contract-guard: removing a forbiddenPaths entry asks", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const newMd = contractMd({ forbiddenPaths: [] });
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /forbiddenPaths entry "src\/billing\/\*\*" would be removed/);
});

test("contract-guard: removing an allowedPaths entry asks", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const newMd = contractMd({ allowedPaths: [] });
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /allowedPaths entry "src\/auth\/\*\*" would be removed/);
});

test("contract-guard: risk downgraded high->low asks; risk increased medium->high is allowed", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd({ risk: "high" }));
  const downgraded = contractMd({ risk: "low" });
  let r = cguard({ tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: downgraded } }, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK", "a risk downgrade must ask");
  assert.match(r.reason, /risk would be downgraded \("high" -> "low"\)/);

  writeContract(dir, contractMd({ risk: "medium" }));
  const upgraded = contractMd({ risk: "high" });
  r = cguard({ tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: upgraded } }, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "a risk increase must never be flagged");
});

test("contract-guard M1: a non-canonical-cased risk downgrade (high->\"Low\") still asks (ordinal lookup is case/whitespace-normalized)", () => {
  // Before the fix, RISK_ORDINAL["Low"] misses (the map only has lowercase keys), so newOrd is
  // undefined, the "typeof newOrd === 'number'" guard fails, and the downgrade silently ALLOWS.
  const dir = mkCGuardProject();
  writeContract(dir, contractMd({ risk: "high" }));
  const downgraded = contractMd({ risk: "Low" }); // non-canonical casing
  const r = cguard({ tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: downgraded } }, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK", "a downgrade must be caught regardless of the new value's casing");
  assert.match(r.reason, /risk would be downgraded \("high" -> "Low"\)/, "the ask must quote the risk values exactly as written, unnormalized");
});

test("contract-guard: contract.md first-ever write (no prior file) always allows regardless of content", () => {
  const dir = mkCGuardProject(); // no output/udflow/contract.md written at all
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: contractMd({ risk: "low", mustNotChange: [] }) } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "the sanctioned first-ever write (references/task-contract.md) must never be flagged");
});

test("contract-guard: contract.md whose prior content has no parseable JSON block also always allows", () => {
  const dir = mkCGuardProject();
  writeContract(dir, "# Task contract\n\nNo machine block yet, just prose.\n");
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: contractMd({ risk: "low" }) } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "an unparseable/absent OLD block means there is nothing to have lost");
});

test("contract-guard: an already-populated contract.md whose new content drops the JSON block entirely asks", () => {
  // Distinct from the first-write case above: here the OLD content DID have a parseable block, so a
  // wholesale loss in the new content is a real finding, not a fail-open case.
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const newMd = "# Task contract\n\nSomehow the machine block got wiped in this rewrite.\n";
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK", "losing the JSON block on an already-populated contract must be flagged");
  assert.match(r.reason, /json block would be lost entirely/i);
});

test("contract-guard: an Edit whose old_string does not match current content is allowed (cannot simulate)", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const input = { tool_name: "Edit", cwd: dir, tool_input: { file_path: contractPath(dir), old_string: "this text is not in the file", new_string: "whatever" } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "an old_string mismatch must fail open, not guess");
});

test("contract-guard: a MultiEdit whose later step's old_string is not found fails open for the WHOLE call", () => {
  const dir = mkCGuardProject();
  const oldMd = contractMd();
  writeContract(dir, oldMd);
  const input = {
    tool_name: "MultiEdit", cwd: dir,
    tool_input: {
      file_path: contractPath(dir),
      edits: [
        { old_string: '"mustNotChange": [\n    "public signature of AuthService.request"\n  ]', new_string: '"mustNotChange": []' }, // this step WOULD match and WOULD be a finding
        { old_string: "this later step does not exist in the file", new_string: "x" }, // but this step never matches
      ],
    },
  };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "any step failing to match must fail open for the entire MultiEdit, not partial-simulate");
});

// Two ACs sharing an identical `verification` string, verbatim in the raw JSON text.
const SHARED_VERIFICATION_MD = "# Task contract\n\n```json\n" + JSON.stringify({
  udflowContract: 1,
  risk: "high",
  acceptanceCriteria: [
    { id: "AC-1", text: "first behavior", behaviorChanging: true, verification: "shared::check" },
    { id: "AC-2", text: "second behavior", behaviorChanging: true, verification: "shared::check" },
  ],
  allowedPaths: ["src/**"],
  forbiddenPaths: [],
  mustNotChange: [],
}, null, 2) + "\n```\n";

test("contract-guard M2: an Edit whose old_string matches a value shared by two ACs only simulates the FIRST occurrence (real Edit semantics)", () => {
  // Before the fix, current.split(old_string).join(new_string) rewrites EVERY occurrence of the raw
  // text '"verification": "shared::check"' — both AC-1's (the intended, first) and AC-2's (untouched
  // in the real tool, which replaces only the first match by default) — so diffContractJson would
  // wrongly report AC-2's verification as "changed" too (a spurious ask on an untouched entry).
  const dir = mkCGuardProject();
  writeContract(dir, SHARED_VERIFICATION_MD);
  const input = {
    tool_name: "Edit", cwd: dir,
    tool_input: {
      file_path: contractPath(dir),
      old_string: '"verification": "shared::check"',
      new_string: '"verification": "shared::RENAMED"',
    },
  };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK", "AC-1's verification genuinely changed and must still be caught");
  assert.match(r.reason, /acceptance criterion "AC-1" verification would change/, "AC-1 (the actually-edited entry) must be named");
  assert.ok(!/acceptance criterion "AC-2"/.test(r.reason), "AC-2 (untouched by a real first-occurrence-only Edit) must NOT be flagged as changed");
});

test("contract-guard: an edit to some unrelated file never invokes any comparison (no-op)", () => {
  const dir = mkCGuardProject();
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: path.join(dir, "src", "app.ts"), content: "console.log('hi')" } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW");
});

// Table-driven (P2b split): the three settings-variant tests share one body; each row keeps its
// original test name and assertion message.
for (const row of [
  { name: "contract-guard: project opt-out udflow.contractGuard=false suppresses an otherwise-real finding",
    settings: JSON.stringify({ udflow: { contractGuard: false } }), expected: "ALLOW",
    msg: "the opt-out must suppress an otherwise-real finding" },
  { name: "contract-guard: settings.local.json opt-out overrides settings.json (local-overrides-project precedence)",
    settings: JSON.stringify({ udflow: { contractGuard: true } }),
    localSettings: JSON.stringify({ udflow: { contractGuard: false } }), expected: "ALLOW",
    msg: "the local override must take precedence over the project-level setting" },
  { name: "contract-guard: malformed project settings fail safe to keep asking (a broken file must not silently drop the guard)",
    settings: "{ not: valid json ", expected: "ASK",
    msg: "a broken settings file must not silently drop the guard on a matched finding" },
]) {
  test(row.name, () => {
    const dir = mkCGuardProject();
    writeContract(dir, contractMd());
    fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude", "settings.json"), row.settings, "utf8");
    if (row.localSettings) fs.writeFileSync(path.join(dir, ".claude", "settings.local.json"), row.localSettings, "utf8");
    const newMd = contractMd({ mustNotChange: [] });
    const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: newMd } };
    const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
    assert.strictEqual(r.decision, row.expected, row.msg);
  });
}

test("contract-guard: oversized stdin fails open (allow)", () => {
  const big = "x".repeat(6 * 1024 * 1024);
  const input = JSON.stringify({ tool_name: "Write", tool_input: { file_path: "output/udflow/contract.md", content: big } });
  const r = cp.spawnSync("node", [CGUARD], { input, maxBuffer: 64 * 1024 * 1024 });
  assert.strictEqual((r.stdout || "").toString().includes('"ask"'), false, "over-cap stdin must fail open, not ask");
});

test("contract-guard: malformed stdin fails open (no ask, no crash)", () => {
  const out = cp.execFileSync("node", [CGUARD], { input: "not json {{{" }).toString();
  assert.strictEqual(out.trim(), "", "unparseable input -> fail open (allow), never crash");
});

test("contract-guard: an unreadable target file (e.g. a directory at that path) fails open", () => {
  const dir = mkCGuardProject();
  fs.mkdirSync(contractPath(dir), { recursive: true }); // a DIRECTORY at the contract.md path, not a file
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: contractMd() } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "an unreadable old path must be treated as no-old-content, never block");
});

// --- contract-guard: design.md whole-section-deletion tripwire (narrow, exact-heading-match only) ---

const DESIGN_MD = [
  "# Project Design",
  "",
  "## Visual Theme & Atmosphere",
  "Warm, editorial.",
  "",
  "## Color Palette & Roles",
  "primary: #123456",
  "",
  "## Do's and Don'ts",
  "Never use pure black on white.",
  "",
].join("\n");

test("design.md: a section body edited/expanded with the heading kept is allowed", () => {
  const dir = mkCGuardProject();
  const designPath = path.join(dir, "design.md");
  fs.writeFileSync(designPath, DESIGN_MD, "utf8");
  const expanded = DESIGN_MD.replace("primary: #123456", "primary: #123456\nsecondary: #abcdef\nsurface: #ffffff");
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: designPath, content: expanded } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "expanding a section body while keeping its heading must not be flagged");
});

test("design.md: a whole heading (## Do's and Don'ts) removed asks, naming that section", () => {
  const dir = mkCGuardProject();
  const designPath = path.join(dir, "design.md");
  fs.writeFileSync(designPath, DESIGN_MD, "utf8");
  const withoutSection = DESIGN_MD.replace("\n## Do's and Don'ts\nNever use pure black on white.\n", "\n");
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: designPath, content: withoutSection } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /## Do's and Don'ts/, "the ask must name the removed section's heading");
});

test("design.md: a section reduced to an 'n/a' placeholder with the heading kept is allowed", () => {
  const dir = mkCGuardProject();
  const designPath = path.join(dir, "design.md");
  fs.writeFileSync(designPath, DESIGN_MD, "utf8");
  const reduced = DESIGN_MD.replace("primary: #123456", "n/a");
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: designPath, content: reduced } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW", "reducing a section body to the sanctioned 'n/a' placeholder must not be flagged (heading presence only, never body content)");
});

test("design.md: exact-normalized heading match only — '## Color' must not match inside '## Color Palette & Roles'", () => {
  // If the guard used substring/fuzzy heading matching, removing "## Color Palette & Roles" and adding an
  // unrelated "## Color" heading could be misread as "the old heading survived" (false negative). Exact
  // normalized match must treat these as DIFFERENT headings, so the real deletion is still caught.
  const dir = mkCGuardProject();
  const designPath = path.join(dir, "design.md");
  fs.writeFileSync(designPath, DESIGN_MD, "utf8");
  const renamed = DESIGN_MD.replace("## Color Palette & Roles", "## Color");
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: designPath, content: renamed } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /## Color Palette & Roles/, "the full original heading must be named as removed, not silently matched against '## Color'");
});

test("design.md: a design.md matched by basename at a non-root path is still guarded (not root-anchored)", () => {
  // design-spec.md sanctions a documented non-root path for design.md — unlike contract.md, this hook
  // matches by basename wherever the tool targets it, not anchored to the project root.
  const dir = mkCGuardProject();
  const nestedDir = path.join(dir, "docs", "nested");
  fs.mkdirSync(nestedDir, { recursive: true });
  const designPath = path.join(nestedDir, "design.md");
  fs.writeFileSync(designPath, DESIGN_MD, "utf8");
  const withoutSection = DESIGN_MD.replace("\n## Do's and Don'ts\nNever use pure black on white.\n", "\n");
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: designPath, content: withoutSection } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK", "a design.md at a non-root path must still be guarded by basename match");
});

test("design.md: first-ever write (no prior file) is allowed (nothing to have lost)", () => {
  const dir = mkCGuardProject();
  const designPath = path.join(dir, "design.md"); // never written before
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: designPath, content: DESIGN_MD } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ALLOW");
});

test("design.md A2: a whole section removed from a differently-cased basename (Design.md) still asks", () => {
  // isDesignMdPath folds case, so a tool targeting "Design.md" (or DESIGN.MD) is guarded exactly like
  // "design.md" — a case-only spelling must not slip a whole-section deletion past the tripwire.
  const dir = mkCGuardProject();
  const designPath = path.join(dir, "Design.md"); // differing case, matched by lower-cased basename
  fs.writeFileSync(designPath, DESIGN_MD, "utf8");
  const withoutSection = DESIGN_MD.replace("\n## Do's and Don'ts\nNever use pure black on white.\n", "\n");
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: designPath, content: withoutSection } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK", "a case-variant Design.md must be guarded like design.md");
  assert.match(r.reason, /## Do's and Don'ts/, "the ask must name the removed section");
});

// --- contract-guard: udflowOp/output/contract.md (0.42.0 layout) is guarded alongside the legacy path ---

function newContractPath(dir) { return path.join(dir, "udflowOp", "output", "contract.md"); }
function writeNewContract(dir, markdown) {
  fs.mkdirSync(path.join(dir, "udflowOp", "output"), { recursive: true });
  fs.writeFileSync(newContractPath(dir), markdown, "utf8");
}

test("contract-guard 0.42.0: a weakening Write to the NEW udflowOp/output/contract.md path asks", () => {
  // Discriminating: the pre-0.42.0 guard root-anchored ONLY output/udflow/contract.md, so this exact
  // input was silently ALLOWED — reverting the both-paths match turns this red.
  const dir = mkCGuardProject();
  writeNewContract(dir, contractMd());
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: newContractPath(dir), content: contractMd({ mustNotChange: [] }) } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK", "the new-layout contract path must be guarded (a guard watching only the legacy path allows this)");
  assert.match(r.reason, /udflowOp\/output\/contract\.md/, "the ask label must name the matched (new) path");
});

test("contract-guard 0.42.0: the same weakening Write at the LEGACY output/udflow/contract.md path still asks (control)", () => {
  const dir = mkCGuardProject();
  writeContract(dir, contractMd());
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: contractPath(dir), content: contractMd({ mustNotChange: [] }) } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK", "pre-migration runs still write the legacy path; it must stay guarded");
  assert.match(r.reason, /output\/udflow\/contract\.md/, "the ask label must name the matched (legacy) path");
});

test("contract-guard 0.42.0: design.md at its new udflowOp/design/ home is guarded by basename (whole-section deletion asks)", () => {
  // The basename match is location-independent by design, so this is a regression pin for the new
  // documented home (references/design-spec.md), not a behavior change.
  const dir = mkCGuardProject();
  const designPath = path.join(dir, "udflowOp", "design", "design.md");
  fs.mkdirSync(path.dirname(designPath), { recursive: true });
  fs.writeFileSync(designPath, DESIGN_MD, "utf8");
  const withoutSection = DESIGN_MD.replace("\n## Do's and Don'ts\nNever use pure black on white.\n", "\n");
  const input = { tool_name: "Write", cwd: dir, tool_input: { file_path: designPath, content: withoutSection } };
  const r = cguard(input, { ...process.env, CLAUDE_PROJECT_DIR: dir });
  assert.strictEqual(r.decision, "ASK");
  assert.match(r.reason, /## Do's and Don'ts/, "the basename design.md guard must cover the udflowOp/design/ home");
});

// --- contract-guard: wiring ---

test("hooks.json wires contract-guard.js under PreToolUse with a matcher covering Write/Edit/MultiEdit", () => {
  const hj = JSON.parse(fs.readFileSync(path.join(HOOKS, "hooks.json"), "utf8"));
  const entry = (hj.hooks.PreToolUse || []).find((e) => (e.hooks || []).some((x) => /contract-guard\.js/.test(x.command || "")));
  assert.ok(entry, "PreToolUse must invoke contract-guard.js");
  for (const tool of ["Write", "Edit", "MultiEdit"]) {
    assert.ok(new RegExp(`^(?:${entry.matcher})$`).test(tool), `${tool} must be covered by contract-guard.js's matcher`);
  }
});
