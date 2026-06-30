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
