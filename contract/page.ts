// contract/page.ts — typed render contracts for the page-data cuts.
//
// Each canonical data/*.json(ld) file is a CUT taken from the knowledge graph
// that a build-time generator (scripts/gen-*.mjs) projects into the static HTML.
// This module declares, in Zod, the SHAPE a page is allowed to pull from each
// cut. The contract gate (contract/gate.ts) validates every registered cut at
// build time; an undeclared or malformed shape fails the build — drift caught
// before it ships rather than a silent bad render in production.
//
// Scope (one badge, named honestly): this enforces PULL-SHAPE only — what a page
// may pull from a cut, and that it pulls nothing undeclared (schemas are
// .strict(), so an unknown key is a failure, not a shrug). It deliberately does
// NOT cover:
//   - source-graph integrity (orphans, dangling links) — SHACL, contract/jsonld.shapes.ttl
//   - accessibility of the rendered DOM — @bounded-systems/lone, gates/semantic
// A green contract check stands for pull-shape and nothing else.
//
// Runtime: Deno + npm:zod@3 (see contract/deno.json), mirroring the existing
// gates/semantic Deno gate. Source-side and offline — it reads data/, not dist/,
// so it needs no build step.

import { z } from "zod";

// A single schema.org SiteNavigationElement, as it appears in nav.jsonld. Both
// cross-page links (site[]) and in-page anchors (sections[]) share this shape;
// `kind` is present only on site[] entries. .strict() rejects any extra key.
const NavItem = z
  .object({
    "@type": z.literal("SiteNavigationElement"),
    name: z.string().min(1),
    url: z.string().min(1),
    kind: z.enum(["page", "external"]).optional(),
  })
  .strict();

// data/nav.jsonld — the canonical navigation cut. build.mjs renders the primary
// site nav (site[]) and the home-only on-page table of contents (sections[])
// from this one file so the two can never drift.
export const NavContract = z
  .object({
    "@context": z.literal("https://schema.org"),
    "@type": z.literal("ItemList"),
    name: z.string().min(1),
    description: z.string().optional(),
    site: z.array(NavItem).min(1),
    sections: z.array(NavItem),
  })
  .strict();

export type Nav = z.infer<typeof NavContract>;

// Registry of cut → contract. The gate validates every entry here. Add a data
// source as it earns a typed surface; until a cut is listed it is uncontracted
// (the gate makes that explicit rather than passing it silently).
//
// Next candidates: data/seams.json, data/registry.json.
export const CONTRACTS: Record<string, z.ZodTypeAny> = {
  "data/nav.jsonld": NavContract,
};
