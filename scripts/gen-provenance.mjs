#!/usr/bin/env node
// Thin shim → the canonical implementation in integrity/ (the subtree-split home).
// Sets the bounded.tools doc link, then delegates. See integrity/README.md.
process.env.PROVENANCE_DOC_URL ||= "https://bounded.tools/blog/provenance-is-not-legitimacy";
await import("../integrity/scripts/gen-provenance.mjs");
