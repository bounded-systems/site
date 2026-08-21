#!/usr/bin/env node
// Emit dist/claims.jsonld — the served, build-dated copy of the honesty-section
// claims graph (integrity/claims/claims.jsonld). The served file is covered by
// the site's content-digest manifest (its `securedBy`), so the graph the page
// links to is the one the build signature attests. @@DATE@@ → build date (date
// granularity, matching gen-stamp, to keep the build reproducible day-to-day).
//
//   node scripts/gen-claims.mjs           # write dist/claims.jsonld
//   node scripts/gen-claims.mjs --check   # validate the source graph only
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(root, "integrity", "claims", "claims.jsonld");
const CHECK = process.argv.includes("--check");

const src = await readFile(SRC, "utf8");
// Validate structure via the same checker CI runs (throws/exits non-zero on bad graph).
execSync(`node ${join(root, "integrity", "claims", "validate-claims.mjs")} ${SRC}`, { stdio: "inherit" });

if (CHECK) process.exit(0);

const date = new Date().toISOString().slice(0, 10);
const doc = JSON.parse(src.replace(/@@DATE@@/g, date));

// The legibility gate's verdict is a claim like any other on this page, so it
// joins the same graph instead of getting a schema of its own. It is emitted
// HERE, into the served copy, rather than hand-written into
// integrity/claims/claims.jsonld — that file is the six claims a person wrote
// and grades by hand, with a ledger entry and a pinned evidence permalink each.
// This one is produced by the mechanism it describes, on the build that runs it,
// and its evidence is that run. Machine-emitted and hand-asserted claims are
// different kinds of thing; mixing them would make the ledger lie about who
// graded what.
const assertion = doc["@graph"].find((g) => String(g["@id"]).endsWith("#assertion"));
try {
  const node = execSync(
    `node ${join(root, "scripts", "legibility", "check.mjs")} ${join(root, "dist", "index.md")} --jsonld`,
    { encoding: "utf8" },
  );
  assertion["@graph"].push(JSON.parse(node.slice(node.indexOf("{"), node.lastIndexOf("}") + 1)));
} catch (e) {
  // The gate exits non-zero on a violation, and the build has already stopped by
  // the time this runs — so reaching here means the gate could not run at all
  // (no dist/index.md yet). Emit the graph without the node rather than claiming
  // a verdict nobody measured.
  console.warn("  · legibility verdict unavailable — claims graph emitted without it");
}

await mkdir(join(root, "dist"), { recursive: true });
await writeFile(join(root, "dist", "claims.jsonld"), JSON.stringify(doc, null, 2) + "\n");
console.log(`✓ claims: ${assertion["@graph"].length} graded claims → dist/claims.jsonld (${date})`);
