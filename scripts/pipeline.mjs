#!/usr/bin/env node
// The ONE ordered definition of the site build. Three consumers derive from it
// instead of restating it:
//
//   flake.nix    buildPhase       → run-pipeline derivation hermetic
//   deploy.yml   sign step        → run-pipeline stamped
//   package.json "build"          → run-pipeline hermetic stamped local
//
// A step's phase answers one question: is its output a pure function of the
// committed source, and where can it run?
//
//   derivation — pure, but only runnable inside the nix sandbox, which materializes
//                the flake-pinned brand/ at the repo root. A plain checkout has no
//                brand/ (build.mjs falls back to node_modules; this gate cannot),
//                so `npm run build` must skip it.
//   hermetic   — pure and runnable anywhere. The substance of the deployed artifact.
//   stamped    — impure: embeds the build date or the deploying commit, so it cannot
//                run inside a pure derivation without breaking reproducibility. Runs
//                after the derivation on the staged dist/, but BEFORE
//                gen-sitemanifest, so the signed whole-site manifest still covers it.
//   local      — repo codegen, not a served artifact. Only the local build runs it;
//                `npm run check` verifies it with --check.
//
// This list existing once is the point. It was previously restated in flake.nix
// and package.json under a "KEEP IN SYNC" comment, and it drifted: gen-claims and
// gen-jsonld were added to package.json's build but never to the buildPhase, so
// /claims.jsonld and /json.ld were emitted by every CI build and by no deploy.
// The site linked to a claims graph that production returned 404 for.

export const STEPS = [
  // ---- hermetic: pure functions of the committed source -------------------
  { phase: "hermetic", cmd: ["scripts/verify-vendor.mjs"],
    note: "fail closed if the vendored conformance-kit drifted from its hash-pin" },
  { phase: "hermetic", cmd: ["scripts/check-node-uniqueness.mjs"],
    note: "no identity key may repeat in any data cut (registry nodes, seams, nav)" },
  { phase: "derivation", cmd: ["brand/tokens/build-tokens.mjs", "--check"],
    note: "the token-drift gate the project argues for; needs the nix-materialized brand/" },
  { phase: "hermetic", cmd: ["build.mjs"],
    note: "assemble dist/ from the page + brand" },
  { phase: "hermetic", cmd: ["scripts/gen-blog.mjs"] },
  { phase: "hermetic", cmd: ["scripts/gen-conformance.mjs"],
    note: "the /conformance page + its machine-readable twin" },
  { phase: "hermetic", cmd: ["scripts/gen-sitemap.mjs"] },
  { phase: "hermetic", cmd: ["scripts/obfuscate-email.mjs"],
    note: "entity-encode mailto in HTML (no JS); CF edge obfuscation stays off" },
  { phase: "hermetic", cmd: ["scripts/add-sri.mjs"],
    note: "pin every self-hosted script/link by sha384; MUST precede the Repr-Digest" },
  { phase: "hermetic", cmd: ["scripts/check-link-graph.mjs", "dist"],
    note: "prove the site is one connected page graph; emit sitegraph.json" },
  // After check-link-graph on purpose: the link graph proves the HTML pages form
  // one connected surface, and the .md twins are the same pages in another form,
  // not new nodes in it. Safe in `hermetic` even though gen-stamp rewrites
  // index.html later, because the projection drops the stamp region — so the
  // pre-stamp and post-stamp projections are byte-identical.
  { phase: "hermetic", cmd: ["scripts/gen-markdown.mjs", "--dist"],
    note: "every page also served as markdown at the same route (/index.md, /map.md …)" },
  // Straight after the projection, because the projection is what it reads: the
  // words a stranger gets, with the markup gone. Deterministic half only — deny
  // lexicon, hero budget, sentence cap, acronym budget, section budget. The
  // judged half (scripts/legibility/coldread.feature) is deploy-time and is NOT
  // wired here on purpose; a flaky proxy in the inner loop rots trust in the gate
  // around it.
  { phase: "hermetic", cmd: ["scripts/legibility/check.mjs", "dist/index.md"],
    note: "the landing page stays legible to a stranger at skim speed" },
  { phase: "hermetic", cmd: ["scripts/gen-sbom.mjs"],
    note: "deterministic SPDX SBOM — a pure function of the committed lockfiles" },
  { phase: "hermetic", cmd: ["vendor/conformance-kit/gates/sbom/check-sbom.mjs"],
    note: "refuse to ship an incomplete bill" },

  // ---- stamped: date/commit-dependent, so post-derivation ------------------
  // Ordering constraint: gen-stamp rewrites index.html, so emit-artifacts (which
  // derives the Repr-Digest from the final bytes) must follow it, and
  // gen-sitemanifest must come last so the signature covers everything above.
  { phase: "stamped", cmd: ["scripts/gen-stamp.mjs"],
    note: "stamp the honesty section with THIS commit + date" },
  { phase: "stamped", cmd: ["scripts/verify-vendor.mjs"],
    note: "re-assert the vendor pin against the staged tree" },
  { phase: "stamped", cmd: ["vendor/conformance-kit/gates/sbom/check-sbom.mjs"] },
  { phase: "stamped", cmd: ["scripts/emit-artifacts.mjs"],
    note: "RFC 9116 security.txt, web app manifest, RFC 9530 Repr-Digest _headers" },
  { phase: "stamped", cmd: ["scripts/gen-claims.mjs"],
    note: "dist/claims.jsonld — build-dated copy of the honesty-section claims graph" },
  { phase: "stamped", cmd: ["scripts/gen-jsonld.mjs"],
    note: "dist/json.ld — the structured-data graph (org + packages + terms)" },
  { phase: "stamped", cmd: ["scripts/gen-ledger.mjs", "--dist"],
    note: "dist/ledger.jsonl — the raw grade ledger /ledger says to check for yourself" },
  { phase: "stamped", cmd: ["scripts/gen-sitemanifest.mjs"],
    note: "whole-site manifest; everything above is a signed subject" },

  // ---- local: repo codegen, never a served artifact ------------------------
  { phase: "local", cmd: ["scripts/emit-catalog.mjs"],
    note: "regenerate the copy catalog; `npm run check` verifies it with --check" },
  { phase: "local", cmd: ["scripts/gen-markdown.mjs"],
    note: "refresh content/pages/*.md so a copy change shows up in review as a prose diff" },
];

export const PHASES = ["derivation", "hermetic", "stamped", "local"];
