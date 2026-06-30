import { test } from "node:test";
import assert from "node:assert";
import {
  extractContractJson, matchesGlob, scopeDiff,
} from "../udflow/skills/universal-dev-flow/scripts/contract-check.mjs";

test("extractContractJson parses the first ```json fence", () => {
  const md = "# C\n\n```json\n{\"risk\":\"high\"}\n```\n\nbody";
  assert.deepStrictEqual(extractContractJson(md), { risk: "high" });
});

test("extractContractJson returns null when absent or invalid (fail-open)", () => {
  assert.strictEqual(extractContractJson("no json"), null);
  assert.strictEqual(extractContractJson("```json\n{bad}\n```"), null);
  assert.strictEqual(extractContractJson(42), null);
});

test("matchesGlob: * is segment-local, ** crosses segments, separators normalize", () => {
  assert.ok(matchesGlob("src/auth/login.ts", "src/auth/*"));
  assert.ok(!matchesGlob("src/auth/sub/login.ts", "src/auth/*"));
  assert.ok(matchesGlob("src/auth/sub/login.ts", "src/auth/**"));
  assert.ok(matchesGlob("src\\auth\\login.ts", "src/auth/*"));
});

test("scopeDiff flags out-of-scope and forbidden hits", () => {
  const c = { allowedPaths: ["src/auth/**", "test/**"], forbiddenPaths: ["src/billing/**"] };
  const r = scopeDiff(c, ["src/auth/x.ts", "src/billing/pay.ts", "src/ui/z.ts", "test/a.test.ts"]);
  assert.deepStrictEqual(r.outOfScope, ["src/billing/pay.ts", "src/ui/z.ts"]);
  assert.deepStrictEqual(r.forbiddenHits, ["src/billing/pay.ts"]);
  assert.strictEqual(r.allowListed, true);
});

test("scopeDiff makes no allow-list claim when allowedPaths empty", () => {
  const r = scopeDiff({ forbiddenPaths: ["secret/**"] }, ["src/x.ts", "secret/k"]);
  assert.deepStrictEqual(r.outOfScope, []);
  assert.deepStrictEqual(r.forbiddenHits, ["secret/k"]);
  assert.strictEqual(r.allowListed, false);
});

test("scopeDiff tolerates null contract (fail-open)", () => {
  const r = scopeDiff(null, ["a.ts"]);
  assert.deepStrictEqual(r, { outOfScope: [], forbiddenHits: [], allowListed: false });
});

import { acCoverage, formatReport } from "../udflow/skills/universal-dev-flow/scripts/contract-check.mjs";

test("acCoverage flags behavior-changing criteria with no verification", () => {
  const c = { acceptanceCriteria: [
    { id: "AC-1", behaviorChanging: true, verification: "test/a.test.mjs::x" },
    { id: "AC-2", behaviorChanging: true, verification: "  " },
    { id: "AC-3", behaviorChanging: false },
  ]};
  assert.deepStrictEqual(acCoverage(c).uncovered, ["AC-2"]);
  assert.strictEqual(acCoverage(c).total, 3);
});

test("acCoverage tolerates null contract", () => {
  assert.deepStrictEqual(acCoverage(null), { total: 0, uncovered: [] });
});

test("formatReport: no contract => explicit no-claim", () => {
  const r = formatReport({ contractFound: false, scope: {}, coverage: {} });
  assert.match(r, /no machine-readable contract/);
  assert.match(r, /NO deterministic/);
});

test("formatReport: clean scope + full coverage", () => {
  const r = formatReport({
    contractFound: true,
    scope: { outOfScope: [], forbiddenHits: [], allowListed: true },
    coverage: { uncovered: [], total: 2 },
  });
  assert.match(r, /scope: clean/);
  assert.match(r, /every behavior-changing criterion/);
});

test("formatReport: surfaces out-of-scope, forbidden, and uncovered", () => {
  const r = formatReport({
    contractFound: true,
    scope: { outOfScope: ["src/ui/z.ts"], forbiddenHits: ["src/billing/p.ts"], allowListed: true },
    coverage: { uncovered: ["AC-2"], total: 3 },
  });
  assert.match(r, /out-of-scope changed files: src\/ui\/z\.ts/);
  assert.match(r, /forbidden-path hits: src\/billing\/p\.ts/);
  assert.match(r, /AC missing verification mapping: AC-2/);
});

test("matchesGlob collapses long * runs without catastrophic backtracking (ReDoS guard)", () => {
  // A stacked-quantifier regression (adjacent ** => `.*.*.*`) backtracks exponentially on a non-matching
  // input and would hang the test runner; the collapsed matcher returns instantly. This pins the fix.
  assert.ok(matchesGlob("a/b/c/d/e/f/g", "********************"));                  // 20 stars => single .* => matches
  assert.ok(!matchesGlob("a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p", "********************Z")); // long non-match returns fast
});

test("matchesGlob normalizes backslashes in the CHANGED path too (not only the glob)", () => {
  assert.ok(matchesGlob("src\\billing\\pay.ts", "src/billing/**"));
});

test("formatReport: no allowedPaths declared => explicit no-allow-list-claim line", () => {
  const r = formatReport({
    contractFound: true,
    scope: { outOfScope: [], forbiddenHits: [], allowListed: false },
    coverage: { uncovered: [], total: 0 },
  });
  assert.match(r, /no allowedPaths declared — no allow-list claim/);
});

test("acCoverage names an uncovered, id-less criterion '(unnamed)'", () => {
  const c = { acceptanceCriteria: [{ behaviorChanging: true, verification: "" }] };
  assert.deepStrictEqual(acCoverage(c).uncovered, ["(unnamed)"]);
  assert.strictEqual(acCoverage(c).total, 1);
});
