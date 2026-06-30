#!/usr/bin/env node
// udflow contract-check: deterministic scope-diff + AC-coverage over output/udflow/contract.md.
// Session-time helper (NOT a Claude Code hook, NOT CI-only): the orchestrator runs it at the verify /
// gatekeeper step and feeds its report to the gatekeeper as evidence. Dependency-free (Node built-ins
// only). Fail-open: an absent/unparseable contract yields a no-claim report; the CLI always exits 0 and
// never throws to its caller. AC-coverage + formatReport land in the next task.
import fs from "node:fs";
import cp from "node:child_process";
import { fileURLToPath } from "node:url";

// Extract the FIRST ```json fenced block and JSON.parse it. The machine contract is JSON (not YAML) so
// it needs no dependency. Returns null on absence/parse error (the caller treats null as "no claim").
export function extractContractJson(markdown) {
  if (typeof markdown !== "string") return null;
  const m = markdown.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

// Minimal dependency-free glob: `*` matches within a path segment, `**` matches across segments. Paths
// normalize to forward slashes first so the matcher is identical on Windows and POSIX (CI runs both).
export function matchesGlob(p, glob) {
  const norm = String(p).replace(/\\/g, "/");
  const g = String(glob).replace(/\\/g, "/");
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") { re += ".*"; i++; }   // ** crosses segments
      else re += "[^/]*";                            // * within a segment
    } else if (".+?^${}()|[]\\".includes(c)) {
      re += "\\" + c;                                // escape regex specials
    } else { re += c; }
  }
  return new RegExp("^" + re + "$").test(norm);
}

// Which changed paths fall outside allowedPaths, and which hit forbiddenPaths. Empty/absent
// allowedPaths => no allow-list claim (outOfScope stays empty); forbiddenPaths is always checked.
export function scopeDiff(contract, changedPaths) {
  const allowed = (contract && Array.isArray(contract.allowedPaths)) ? contract.allowedPaths : [];
  const forbidden = (contract && Array.isArray(contract.forbiddenPaths)) ? contract.forbiddenPaths : [];
  const changed = Array.isArray(changedPaths) ? changedPaths.filter(Boolean) : [];
  return {
    outOfScope: allowed.length ? changed.filter((p) => !allowed.some((g) => matchesGlob(p, g))) : [],
    forbiddenHits: forbidden.length ? changed.filter((p) => forbidden.some((g) => matchesGlob(p, g))) : [],
    allowListed: allowed.length > 0,
  };
}

// CLI wiring is completed in the next task (it needs acCoverage + formatReport). Exported here so the
// module imports cleanly; the direct-invocation guard stays inert until then.
function changedPathsFromGit(base) {
  try {
    const args = base ? ["diff", "--name-only", base] : ["diff", "--name-only", "HEAD"];
    return cp.execFileSync("git", args, { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  } catch (e) { return []; }
}
export const _internal = { changedPathsFromGit };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // Completed in Task 3.
  process.exit(0);
}
