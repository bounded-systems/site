#!/usr/bin/env node
// Thin shim → the canonical implementation in integrity/ (the subtree-split home).
// Runs from the repo root, so the canonical script's cwd-relative `dist` resolves
// here. See integrity/README.md.
import "../integrity/scripts/gen-sitemanifest.mjs";
