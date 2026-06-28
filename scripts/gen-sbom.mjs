#!/usr/bin/env node
// Thin shim → the vendored conformance-kit SPDX SBOM generator, with bounded.tools'
// config injected in one place (used by both `npm run build` and the hermetic Nix
// build). Deterministic: a pure function of the committed lockfiles (flake.lock +
// package-lock.json), so the emitted dist/sbom.spdx.json is reproducible and gets
// covered by the signed whole-site manifest. The integrity tooling lives in ONE
// place: vendor/conformance-kit/.
process.env.SBOM_NAME ||= "bounded-tools-site";
process.env.SBOM_NAMESPACE_BASE ||= "https://bounded.tools/sbom";
process.env.SBOM_CREATORS ||= "Tool: conformance-kit/gen-sbom, Organization: Bounded Systems";
await import("../vendor/conformance-kit/gates/sbom/gen-sbom.mjs");
