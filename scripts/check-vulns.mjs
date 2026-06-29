#!/usr/bin/env node
// Known-vulnerability gate for the dependency tree (security.no-critical-vulns).
//
//   node scripts/check-vulns.mjs    # exit 1 on any known critical/high vuln OR drift
//
// The fail-closed re-prover behind the `vulns` entry in
// data/conformance-evidence.json. Like the axe gate, it refuses the build rather
// than shipping a known-bad posture: it re-runs `npm audit` over the committed
// package-lock.json, counts critical + high advisories, and asserts that count
// (a) is 0 and (b) equals the committed evidence value — so the declared
// `knownCriticalOrHighVulns` cannot drift from reality without turning CI red,
// the same discipline as the axe (a11y) and SBOM gates.
//
// `npm audit` exits non-zero when it finds advisories but still prints the JSON
// report on stdout, so we capture stdout regardless of exit status.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// ── 1. scan: real critical/high count from npm audit over the lockfile ──────────
let report;
try {
  const out = execFileSync("npm", ["audit", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
  report = JSON.parse(out);
} catch (e) {
  // non-zero exit (advisories found) — the JSON is still on stdout
  const out = e.stdout?.toString() ?? "";
  try {
    report = JSON.parse(out);
  } catch {
    console.error("check-vulns: could not parse `npm audit --json` output");
    console.error(out.slice(0, 500) || String(e));
    process.exit(1);
  }
}

const v = report?.metadata?.vulnerabilities;
if (!v || typeof v.critical !== "number" || typeof v.high !== "number") {
  console.error("check-vulns: `npm audit --json` returned no vulnerability metadata");
  process.exit(1);
}
const scanned = v.critical + v.high;

// ── 2. contract: the committed evidence value it must re-prove ──────────────────
const evidence = JSON.parse(
  await readFile(join(root, "data", "conformance-evidence.json"), "utf8"),
);
const committed = evidence?.evidence?.vulns?.knownCriticalOrHighVulns;
if (typeof committed !== "number") {
  console.error(
    "check-vulns: data/conformance-evidence.json is missing evidence.vulns.knownCriticalOrHighVulns",
  );
  process.exit(1);
}

// ── 3. fail closed: drift, then posture ─────────────────────────────────────────
if (scanned !== committed) {
  console.error(
    `check-vulns: DRIFT — npm audit found ${scanned} critical/high, but evidence claims ${committed}.`,
  );
  console.error("Re-run `npm audit` and update evidence.vulns.knownCriticalOrHighVulns.");
  process.exit(1);
}
if (scanned > 0) {
  console.error(
    `check-vulns: ${v.critical} critical + ${v.high} high known vuln(s). Resolve them (npm audit fix / bump) before shipping.`,
  );
  process.exit(1);
}

console.log(`check-vulns: ok — 0 known critical/high vulns (matches evidence).`);
