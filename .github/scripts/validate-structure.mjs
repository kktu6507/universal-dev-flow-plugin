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

// The plugin itself lives in ./udflow (only that subdir ships); the marketplace
// manifest stays at the repo root.
const PLUGIN = "udflow";

// 1. plugin.json
const plugin = readJSON(`${PLUGIN}/.claude-plugin/plugin.json`);
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
    const entry = market.plugins.find((p) => p.name === (plugin && plugin.name));
    if (!entry) fail(`marketplace.json has no plugin entry matching plugin.json name "${plugin && plugin.name}"`);
    else if (entry.version == null) fail(`marketplace entry "${entry.name}" missing "version"`);
    else marketPluginVersion = entry.version;
  }
}

// 3. version agreement between plugin.json and marketplace entry
if (plugin && marketPluginVersion && plugin.version !== marketPluginVersion) {
  fail(`version mismatch: plugin.json ${plugin.version} vs marketplace ${marketPluginVersion}`);
}

// 3b. metadata.version present + semver, and agrees with the plugin version
const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;
if (market) {
  const mv = market.metadata && market.metadata.version;
  if (mv == null) fail(`marketplace.json missing "metadata.version"`);
  else if (!SEMVER.test(mv)) fail(`marketplace.json metadata.version "${mv}" is not semver`);
  else if (plugin && plugin.version !== mv) fail(`version mismatch: plugin.json ${plugin.version} vs metadata.version ${mv}`);
}
if (plugin && plugin.version && !SEMVER.test(plugin.version)) fail(`plugin.json version "${plugin.version}" is not semver`);

// 3c. CHANGELOG has an entry for the current plugin version
if (plugin && plugin.version) {
  const clPath = path.join(root, "CHANGELOG.md");
  if (!fs.existsSync(clPath)) fail(`missing CHANGELOG.md`);
  else if (!new RegExp(`^##\\s*\\[?${plugin.version.replace(/\./g, "\\.")}\\]?`, "m").test(fs.readFileSync(clPath, "utf8"))) {
    fail(`CHANGELOG.md has no "## [${plugin.version}]" entry`);
  }
}

// 3d. root package.json version agrees with the plugin version, so a bump can't
// update the manifests but forget package.json (or vice-versa).
const pkg = readJSON("package.json");
if (pkg && plugin && pkg.version !== plugin.version) {
  fail(`version mismatch: package.json ${pkg.version} vs plugin.json ${plugin.version}`);
}

// 4. hooks.json parses (if present)
if (fs.existsSync(path.join(root, `${PLUGIN}/hooks/hooks.json`))) readJSON(`${PLUGIN}/hooks/hooks.json`);

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

walk(`${PLUGIN}/agents`, (rel) => { if (rel.endsWith(".md")) checkFrontmatter(rel); });
walk(`${PLUGIN}/skills`, (rel) => { if (path.basename(rel) === "SKILL.md") checkFrontmatter(rel); });

// 5b. every reference / agent / hook that SKILL.md or hooks.json points to must exist
// (catches a renamed/deleted reference or agent that prose alone would not surface).
const skillRel = `${PLUGIN}/skills/universal-dev-flow/SKILL.md`;
if (fs.existsSync(path.join(root, skillRel))) {
  const skill = fs.readFileSync(path.join(root, skillRel), "utf8");
  for (const m of new Set([...skill.matchAll(/references\/([a-z0-9-]+\.md)/gi)].map((x) => x[1]))) {
    if (!fs.existsSync(path.join(root, `${PLUGIN}/skills/universal-dev-flow/references/${m}`)))
      fail(`SKILL.md links a missing reference: references/${m}`);
  }
  const roster = (skill.match(/subagents \(([^)]+)\)/) || [])[1] || "";
  for (const m of roster.matchAll(/`([a-z0-9-]+)`/gi)) {
    if (!fs.existsSync(path.join(root, `${PLUGIN}/agents/${m[1]}.md`)))
      fail(`SKILL.md names agent "${m[1]}" but ${PLUGIN}/agents/${m[1]}.md is missing`);
  }
}
const hooksRel = `${PLUGIN}/hooks/hooks.json`;
if (fs.existsSync(path.join(root, hooksRel))) {
  const hooksText = fs.readFileSync(path.join(root, hooksRel), "utf8");
  const wiredHooks = new Set((hooksText.match(/hooks\/[a-z0-9-]+\.js/gi) || []));
  for (const m of wiredHooks) {
    if (!fs.existsSync(path.join(root, `${PLUGIN}/${m}`)))
      fail(`hooks.json references a missing hook: ${m}`);
  }
  // Prevention (a real lesson: a hook shipped without updating the docs): every wired
  // hook must be named in README.md so the docs can't silently fall out of sync.
  const readmePath = path.join(root, "README.md");
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, "utf8");
    for (const m of wiredHooks) {
      const base = m.replace(/^hooks\//, "").replace(/\.js$/, "");
      if (!readme.includes(base)) fail(`README.md does not mention the hook "${base}" (docs out of sync with hooks.json)`);
    }
  }
}

// 6. distribution hygiene: runtime/process artifacts must never ship in the
// plugin subdir, and scratch/temp files must not be committed anywhere.
const forbidden = [
  "ai/FAILURE_MEMORY.md",        // workflow runtime output — belongs in the consuming project, not here
  `${PLUGIN}/ai`,
  `${PLUGIN}/test`,
  `${PLUGIN}/.github`,
  `${PLUGIN}/node_modules`,
  `${PLUGIN}/package.json`,
];
for (const rel of forbidden) {
  if (fs.existsSync(path.join(root, rel))) fail(`distribution hygiene: "${rel}" must not exist (runtime/dev artifact in the shipped tree)`);
}
function scanScratch(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) scanScratch(rel);
    else if (/^_|\.(tmp|bak|log)$|~$/.test(e.name)) fail(`scratch/process file should not be committed: ${rel}`);
  }
}
scanScratch(".");

// 7. text integrity: no U+FFFD replacement characters in tracked text (mojibake / broken encoding).
const TEXT_EXT = /\.(md|json|mjs|js|ya?ml)$/i;
function scanTextIntegrity(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return;
  const FFFD = String.fromCharCode(0xFFFD); // the U+FFFD replacement char, built without embedding it here
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) scanTextIntegrity(rel);
    else if (TEXT_EXT.test(e.name) && fs.readFileSync(path.join(root, rel), "utf8").includes(FFFD)) {
      fail(`text integrity: ${rel} contains a U+FFFD replacement character (mojibake / broken encoding)`);
    }
  }
}
scanTextIntegrity(".");

// 8. bilingual README parity: README.zh-TW.md must name every wired hook (like README.md), and the two
// READMEs must have the same number of top-level (## ) sections — a structural-drift guard that does
// not compare translated prose.
const enReadme = path.join(root, "README.md"), zhReadme = path.join(root, "README.zh-TW.md");
if (fs.existsSync(enReadme) && !fs.existsSync(zhReadme)) {
  fail(`README parity: README.md exists but README.zh-TW.md is missing (the bilingual pair must not drift by deletion)`);
} else if (fs.existsSync(enReadme) && fs.existsSync(zhReadme)) {
  const en = fs.readFileSync(enReadme, "utf8"), zh = fs.readFileSync(zhReadme, "utf8");
  // Count top-level (## ) sections, ignoring any inside fenced code blocks so the structural guard is
  // not tripped by a Markdown/shell sample that happens to contain a "## " line.
  const sectionCount = (s) => (s.replace(/```[\s\S]*?```/g, "").match(/^##\s+/gm) || []).length;
  if (sectionCount(en) !== sectionCount(zh)) {
    fail(`README parity: README.md has ${sectionCount(en)} top-level (##) sections but README.zh-TW.md has ${sectionCount(zh)}`);
  }
  const hjPath = path.join(root, `${PLUGIN}/hooks/hooks.json`);
  if (fs.existsSync(hjPath)) {
    for (const m of new Set((fs.readFileSync(hjPath, "utf8").match(/hooks\/[a-z0-9-]+\.js/gi) || []))) {
      const base = m.replace(/^hooks\//, "").replace(/\.js$/, "");
      if (!zh.includes(base)) fail(`README parity: README.zh-TW.md does not mention the hook "${base}" (docs out of sync)`);
    }
  }
}

if (errors.length) {
  console.error("Plugin structure validation FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("Plugin structure validation passed.");
