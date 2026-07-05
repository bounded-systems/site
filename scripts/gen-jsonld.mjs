#!/usr/bin/env node
// gen-jsonld — assemble the site's knowledge graph as one JSON-LD document at
// /json.ld. The site already emits inline JSON-LD per page and keeps its data as
// graphs (registry.json = nodes+edges, jargon = term→source, the lattice slice);
// this projects all of it into a single fetchable linked-data document a machine
// (or an agent) can consume — the org, its packages and how they build on each
// other, the contract lattice, and the grounded vocabulary.
//
//   node scripts/gen-jsonld.mjs        write dist/json.ld (+ a content-type header)
//
// Validated by the existing SHACL/contracts gate against contract/jsonld.shapes.ttl.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, "dist");
const SITE = "https://bounded.tools";
const exists = async (p) => access(p).then(() => true, () => false);
const readJson = async (p, fb = null) => {
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return fb;
  }
};
const tokenValue = (s, k, fb = "") => {
  const t = s?.[k];
  if (t == null) return fb;
  return t.$value ?? t.value ?? (typeof t === "string" ? t : fb);
};

const strings = await readJson(join(ROOT, "content", "strings.json"), {});
const registry = await readJson(join(ROOT, "data", "registry.json"), { nodes: [], edges: [] });
const jargon = await readJson(join(ROOT, "data", "jargon.json"), {});
const lattice = await readJson(join(ROOT, "data", "lattice.json"), null);

const org = {
  "@type": "Organization",
  "@id": `${SITE}/#org`,
  name: tokenValue(strings, "name", "Bounded Systems"),
  alternateName: tokenValue(strings, "site-name", "bounded.tools"),
  url: SITE,
  description: tokenValue(strings, "description", "Bounded authority for AI agents."),
  sameAs: [
    "https://github.com/bounded-systems",
    "https://jsr.io/@bounded-systems",
  ],
};

const pkgId = (name) => `${SITE}/#pkg-${name}`;
const packages = registry.nodes.map((n) => {
  const deps = registry.edges
    .filter((e) => e.from === n.name)
    .map((e) => ({ "@id": pkgId(e.to) }));
  return {
    "@type": "SoftwareSourceCode",
    "@id": pkgId(n.name),
    name: n.name,
    ...(n.pkg ? { identifier: n.pkg } : {}),
    codeRepository: `https://github.com/bounded-systems/${n.name}`,
    ...(n.tagline ? { description: n.tagline } : {}),
    keywords: [n.kind, n.facet, n.role, n.domain].filter(Boolean),
    isPartOf: { "@id": org["@id"] },
    ...(deps.length ? { buildsOn: deps } : {}),
  };
});

const latticeNode = lattice && {
  "@type": "Dataset",
  "@id": `${SITE}/#lattice`,
  name: "The bounded-systems contract lattice",
  description:
    `${lattice.summary.checks} contracts with a live check (${lattice.summary.passing} passing, ${lattice.summary.failing} failing); ` +
    `${lattice.summary.declared} declared; across ${lattice.summary.nodes} repos. Coverage is not conformance — the honest signal is the checks.`,
  isPartOf: { "@id": org["@id"] },
  variableMeasured: (lattice.checks ?? []).map((c) => ({
    "@type": "PropertyValue",
    name: c.type,
    value: c.result,
    description: c.summary,
  })),
  distribution: {
    "@type": "DataDownload",
    encodingFormat: "application/json",
    contentUrl: "https://raw.githubusercontent.com/bounded-systems/trellis/status/status.json",
  },
};

const jargonTerms = Object.entries(jargon)
  .filter(([k]) => !k.startsWith("$"))
  .map(([term, v]) => ({
    "@type": "DefinedTerm",
    name: term,
    ...(typeof v === "string" ? { url: v } : v?.url ? { url: v.url } : {}),
  }));
const jargonSet = {
  "@type": "DefinedTermSet",
  "@id": `${SITE}/#jargon`,
  name: "Grounded jargon",
  description: "External concepts the site uses, each linked to its authoritative source.",
  hasDefinedTerm: jargonTerms,
};

const doc = {
  "@context": [
    "https://schema.org",
    { buildsOn: { "@id": `${SITE}/#buildsOn`, "@type": "@id" } },
  ],
  "@graph": [org, ...packages, ...(latticeNode ? [latticeNode] : []), jargonSet],
};

await mkdir(DIST, { recursive: true });
await writeFile(join(DIST, "json.ld"), JSON.stringify(doc, null, 2) + "\n");

// Serve /json.ld as application/ld+json (Cloudflare assets infer nothing from .ld).
const headersPath = join(DIST, "_headers");
const rule = "/json.ld\n  Content-Type: application/ld+json\n  Access-Control-Allow-Origin: *\n";
const prior = (await exists(headersPath)) ? await readFile(headersPath, "utf8") : "";
if (!prior.includes("/json.ld")) {
  await writeFile(headersPath, prior + (prior && !prior.endsWith("\n") ? "\n" : "") + rule);
}

console.log(
  `✓ dist/json.ld — ${doc["@graph"].length} entities (org + ${packages.length} packages${latticeNode ? " + lattice" : ""} + ${jargonTerms.length} terms)`,
);
