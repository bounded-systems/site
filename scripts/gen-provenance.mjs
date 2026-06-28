#!/usr/bin/env node
// Thin shim → the canonical implementation in the vendored conformance-kit.
// Sets the bounded.tools doc link, then delegates. The integrity tooling now
// lives in ONE place: vendor/conformance-kit/.
process.env.PROVENANCE_DOC_URL ||= "https://bounded.tools/blog/provenance-is-not-legitimacy";
await import("../vendor/conformance-kit/integrity/gen-provenance.mjs");
