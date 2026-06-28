#!/usr/bin/env node
// Thin shim → the canonical implementation in the vendored conformance-kit.
// Runs from the repo root, so the kit script's cwd-relative `dist` resolves here.
// The integrity tooling now lives in ONE place: vendor/conformance-kit/.
import "../vendor/conformance-kit/integrity/gen-sitemanifest.mjs";
