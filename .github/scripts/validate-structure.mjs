#!/usr/bin/env node
// Structural validation for the udflow plugin. Auth-free, deterministic.
// Exits non-zero with a clear message on the first failure.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const fail = (m) => errors.push(m);

function readJSON(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return fail(`missing file: ${rel}`), null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return fail(`invalid JSON in ${rel}: ${e.message}`), null;
  }
}

// 1. plugin.json
const plugin = readJSON(".claude-plugin/plugin.json");
if (plugin) {
  for (const k of ["name", "version", "description"]) {
    if (!plugin[k]) fail(`plugin.json missing "${k}"`);
  }
}

// 2. marketplace.json
const market = readJSON(".claude-plugin/marketplace.json");
let marketPluginVersion = null;
if (market) {
  if (!market.name) fail(`marketplace.json missing "name"`);
  if (!Array.isArray(market.plugins) || market.plugins.length === 0) {
    fail(`marketplace.json must list at least one plugin`);
  } else {
    const entry = market.plugins.find((p) => p.name === (plugin && plugin.name)) || market.plugins[0];
    marketPluginVersion = entry.version;
  }
}

// 3. version agreement between plugin.json and marketplace entry
if (plugin && marketPluginVersion && plugin.version !== marketPluginVersion) {
  fail(`version mismatch: plugin.json ${plugin.version} vs marketplace ${marketPluginVersion}`);
}

// 4. hooks.json parses (if present)
if (fs.existsSync(path.join(root, "hooks/hooks.json"))) readJSON("hooks/hooks.json");

// 5. every agent and SKILL has YAML frontmatter with name + description
function checkFrontmatter(rel) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (!text.startsWith("---")) return fail(`${rel}: missing frontmatter`);
  const end = text.indexOf("\n---", 3);
  if (end === -1) return fail(`${rel}: unterminated frontmatter`);
  const fm = text.slice(3, end);
  if (!/\bname\s*:/.test(fm)) fail(`${rel}: frontmatter missing "name"`);
  if (!/\bdescription\s*:/.test(fm)) fail(`${rel}: frontmatter missing "description"`);
}

function walk(dir, fn) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, fn);
    else fn(rel);
  }
}

walk("agents", (rel) => { if (rel.endsWith(".md")) checkFrontmatter(rel); });
walk("skills", (rel) => { if (path.basename(rel) === "SKILL.md") checkFrontmatter(rel); });

if (errors.length) {
  console.error("Plugin structure validation FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("Plugin structure validation passed.");
