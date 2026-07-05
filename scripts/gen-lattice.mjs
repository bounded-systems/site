#!/usr/bin/env node
// gen-lattice — pull the org contract lattice into the site's build pipeline.
//
// trellis publishes a cosign-signed status.json (the lattice projection) to its
// `status` branch. This vendors a curated slice of it into data/lattice.json so
// the /contracts page renders from committed, reviewable data (the same
// generated-from-canonical-source pattern as gen-registry / gen-seams), rather
// than a live client-side fetch.
//
//   node scripts/gen-lattice.mjs                     refresh data/lattice.json (live fetch, unverified — local/manual use)
//   node scripts/gen-lattice.mjs --check              exit 1 if data/lattice.json is stale (no writes)
//   node scripts/gen-lattice.mjs --from-file <path>   curate from an already-fetched, already-verified status.json
//
// --from-file is what lattice-refresh.yml actually uses: the workflow downloads
// status.json + its .sigstore.json bundle, runs a REAL `cosign verify-blob`
// against those exact bytes, and only then passes that same file here — so the
// bytes curated into data/lattice.json are the bytes cosign verified, not a
// second, separate, unverified fetch of "the same" URL.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, "data", "lattice.json");
const SRC =
  "https://raw.githubusercontent.com/bounded-systems/trellis/status/status.json";

const args = new Set(process.argv.slice(2));

/**
 * Curate the render-facing slice. The site leads with what's HONEST: the
 * contracts that have an ACTUAL check (`verified` — a live flake derivation that
 * proves conformance), separated from the ones that are merely `declared`
 * (mapped, but nothing enforces them yet). The headline is the actual checks, not
 * the 100%-mapped provider declarations — coverage isn't conformance.
 */
function curate(status) {
  const s = status.summary ?? {};
  const types = (status.types ?? [])
    .map((t) => ({
      type: t.type,
      kind: t.kind,
      result: t.result,
      providers: t.providers,
      edges: t.edges,
      summary: t.summary,
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
  const verified = new Set(
    (status.types ?? []).filter((t) => t.verified).map((t) => t.type),
  );
  return {
    $source: SRC,
    summary: {
      nodes: s.nodes,
      mapped: s.mapped,
      // the honest headline: contracts with a live check, and how many pass
      checks: s.verified,
      passing: s.passing,
      failing: s.failing,
      declared: s.types - (s.verified ?? 0),
      acyclic: s.acyclic,
      oneAgreementPerPair: s.oneAgreementPerPair,
    },
    // the ACTUAL checks — contracts a live derivation proves (what's enforced)
    checks: types.filter((t) => verified.has(t.type)),
    // declared but not yet check-backed — mapped honestly, aspirational
    declared: types.filter((t) => !verified.has(t.type)),
    edges: (status.edges ?? [])
      .map((e) => ({ from: e.from, to: e.to, type: e.type, result: e.result }))
      .sort((a, b) =>
        (a.type + a.from + a.to).localeCompare(b.type + b.from + b.to)
      ),
  };
}

function fromFileArg() {
  const i = process.argv.indexOf("--from-file");
  return i === -1 ? null : process.argv[i + 1];
}

async function fetchProjection() {
  const file = fromFileArg();
  if (file) return curate(JSON.parse(await readFile(file, "utf8")));
  if (typeof fetch !== "function") {
    console.error("✗ global fetch unavailable — Node 18+ required");
    process.exit(2);
  }
  const res = await fetch(SRC, { headers: { accept: "application/json" } });
  if (!res.ok) {
    console.error(`✗ could not fetch the lattice projection (${res.status})`);
    process.exit(2);
  }
  return curate(await res.json());
}

const serialize = (o) => JSON.stringify(o, null, 2) + "\n";

if (args.has("--check")) {
  let committed;
  try {
    committed = await readFile(DATA, "utf8");
  } catch {
    console.error("✗ data/lattice.json missing — run: node scripts/gen-lattice.mjs");
    process.exit(1);
  }
  const fresh = serialize(await fetchProjection());
  if (fresh !== committed) {
    console.error("✗ data/lattice.json is stale — regenerate and commit:");
    console.error("    node scripts/gen-lattice.mjs");
    process.exit(1);
  }
  console.log("✓ data/lattice.json matches the signed projection");
} else {
  const slice = await fetchProjection();
  await writeFile(DATA, serialize(slice));
  console.log(
    `✓ data/lattice.json — ${slice.summary.mapped}/${slice.summary.nodes} mapped, ${slice.checks.length + slice.declared.length} contracts, ${slice.edges.length} edges`,
  );
}
