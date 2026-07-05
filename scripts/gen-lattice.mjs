#!/usr/bin/env node
// gen-lattice — pull the org contract lattice into the site's build pipeline.
//
// trellis publishes a cosign-signed status.json (the lattice projection) to its
// `status` branch. This vendors a curated slice of it into data/lattice.json so
// the /contracts page renders from committed, reviewable data (the same
// generated-from-canonical-source pattern as gen-registry / gen-seams), rather
// than a live client-side fetch.
//
//   node scripts/gen-lattice.mjs            refresh data/lattice.json from the projection
//   node scripts/gen-lattice.mjs --check    exit 1 if data/lattice.json is stale (no writes)
//
// The cosign signature (status.json.sigstore.json) is verified in CI (the same
// keyless Sigstore identity the Trust Center checks); this script trusts the
// signed branch and curates the render-facing slice.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, "data", "lattice.json");
const SRC =
  "https://raw.githubusercontent.com/bounded-systems/trellis/status/status.json";

const args = new Set(process.argv.slice(2));

/** Curate the render-facing slice — summary + the typed contracts + the edges. */
function curate(status) {
  const s = status.summary ?? {};
  return {
    $source: SRC,
    summary: {
      nodes: s.nodes,
      mapped: s.mapped,
      unmapped: s.unmapped,
      types: s.types,
      verified: s.verified,
      passing: s.passing,
      failing: s.failing,
      acyclic: s.acyclic,
      oneAgreementPerPair: s.oneAgreementPerPair,
    },
    // typed contracts, sorted stably for a deterministic diff
    types: (status.types ?? [])
      .map((t) => ({
        type: t.type,
        kind: t.kind,
        verified: t.verified,
        result: t.result,
        providers: t.providers,
        edges: t.edges,
        summary: t.summary,
      }))
      .sort((a, b) => a.type.localeCompare(b.type)),
    edges: (status.edges ?? [])
      .map((e) => ({ from: e.from, to: e.to, type: e.type, result: e.result }))
      .sort((a, b) =>
        (a.type + a.from + a.to).localeCompare(b.type + b.from + b.to)
      ),
  };
}

async function fetchProjection() {
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
    `✓ data/lattice.json — ${slice.summary.mapped}/${slice.summary.nodes} mapped, ${slice.types.length} contracts, ${slice.edges.length} edges`,
  );
}
