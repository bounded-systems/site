#!/usr/bin/env node
// Emit dist/provenance.json from the Sigstore bundle that deploy.yml produced
// for the built stylesheet. Run at deploy time, after `cosign sign-blob`, with
// the GitHub Actions OIDC env in scope.
//
//   node scripts/gen-provenance.mjs
//
// What this is (and is not)
// -------------------------
// The bundle (dist/styles.css.sigstore.json) carries the keyless signature and
// its Rekor inclusion proof — minted by GitHub Actions' OIDC identity, no stored
// key. This script distills it into a small, human- and machine-legible record
// served at /provenance.json: WHO built the bytes, that they are intact, and a
// pointer to the public transparency-log entry. It proves identity + integrity.
// It does NOT assert the build was safe or authorized — see the blog post linked
// in `caveat`. The signed bundle is the ground truth; this file is a convenience
// view, and `cosign verify-blob` (the `verify` field) is how a visitor confirms
// it independently rather than trusting our rendering.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(dirname(fileURLToPath(import.meta.url))), "dist");
const ASSET = "styles.css";
const BUNDLE = `${ASSET}.sigstore.json`;

const repo = process.env.GITHUB_REPOSITORY || "bounded-systems/site";
const sha = process.env.GITHUB_SHA || "";
const ref = process.env.GITHUB_REF || "";
const runId = process.env.GITHUB_RUN_ID || "";
const workflowRef = process.env.GITHUB_WORKFLOW_REF || "";

// Content digest of the exact bytes we signed and are about to deploy.
const bytes = await readFile(join(dist, ASSET));
const sha256 = createHash("sha256").update(bytes).digest("hex");

// Pull the Rekor log index out of the Sigstore bundle. The bundle is the
// transparency-log receipt; this is just a convenience pointer to it. Tolerate
// shape differences across bundle versions rather than hard-failing the deploy.
let logIndex = null;
try {
  const bundle = JSON.parse(await readFile(join(dist, BUNDLE), "utf8"));
  const entry = bundle?.verificationMaterial?.tlogEntries?.[0];
  if (entry?.logIndex != null) logIndex = String(entry.logIndex);
} catch {
  console.warn(`· could not read ${BUNDLE} — provenance.json will omit the Rekor index`);
}

const provenance = {
  asset: ASSET,
  sha256,
  builder: {
    repository: repo,
    commit: sha,
    ref,
    runId,
    workflowRef,
    issuer: "https://token.actions.githubusercontent.com",
  },
  signature: {
    type: "sigstore-bundle",
    bundle: BUNDLE,
    transparencyLog: "rekor.sigstore.dev",
    rekorLogIndex: logIndex,
    rekorEntry: logIndex ? `https://search.sigstore.dev/?logIndex=${logIndex}` : null,
  },
  // Verify it yourself — don't trust this file, check the log.
  verify: [
    `cosign verify-blob`,
    `  --bundle ${BUNDLE}`,
    `  --certificate-identity-regexp '^https://github.com/${repo}/'`,
    `  --certificate-oidc-issuer https://token.actions.githubusercontent.com`,
    `  ${ASSET}`,
  ].join(" \\\n"),
  caveat:
    "Provenance proves who built this asset and that it is intact — not that the build was safe or authorized. https://bounded.tools/blog/provenance-is-not-legitimacy",
};

await writeFile(join(dist, "provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(`✓ provenance: ${ASSET} sha256:${sha256.slice(0, 12)}… rekor#${logIndex ?? "?"} → dist/provenance.json`);
