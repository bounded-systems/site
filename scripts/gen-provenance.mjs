#!/usr/bin/env node
// Emit dist/provenance.json — the build-provenance record for the ENTIRE site.
// Run at deploy time, after the keyless signing steps, with the GitHub Actions
// OIDC env in scope.
//
//   node scripts/gen-provenance.mjs
//
// Two keyless attestations, both identity-bound (GitHub Actions OIDC → Fulcio)
// and logged in the public Rekor transparency log, no stored key:
//   1. site manifest — cosign sign-blob over dist/site.sha256 (the whole-site
//      content address). Served, so the live bytes are verifiable in place.
//   2. OCI artifact  — the whole dist/ pushed to GHCR (oras) and cosign-signed
//      by digest. Pullable + versioned, addressed by content.
// This proves WHO built the site and that it is intact — not that the build was
// safe or authorized. The signed manifest + the Rekor entries are ground truth;
// this file is a convenience view, and the `verify` recipes are how a visitor
// confirms it independently rather than trusting our rendering.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(dirname(fileURLToPath(import.meta.url))), "dist");
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

const repo = process.env.GITHUB_REPOSITORY || "bounded-systems/site";
const sha = process.env.GITHUB_SHA || "";
const ref = process.env.GITHUB_REF || "";
const runId = process.env.GITHUB_RUN_ID || "";
const workflowRef = process.env.GITHUB_WORKFLOW_REF || "";
const ociRef = process.env.OCI_REF || "";
const ociDigest = process.env.OCI_DIGEST || "";

// Whole-site content address: the digest of the signed manifest.
const manifestBytes = await readFile(join(dist, "site.sha256"));
const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
const fileCount = manifestBytes.toString("utf8").trim().split("\n").filter(Boolean).length;

// Rekor log index for the manifest signature, pulled from the cosign bundle.
// Tolerate shape differences across bundle versions rather than failing deploy.
let logIndex = null;
const bundlePath = join(dist, "site.sha256.sigstore.json");
if (await exists(bundlePath)) {
  try {
    const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
    const entry = bundle?.verificationMaterial?.tlogEntries?.[0];
    if (entry?.logIndex != null) logIndex = String(entry.logIndex);
  } catch { console.warn("· could not parse site.sha256.sigstore.json — omitting Rekor index"); }
}

const provenance = {
  scope: "entire-site",
  fileCount,
  builder: {
    repository: repo,
    commit: sha,
    ref,
    runId,
    workflowRef,
    issuer: "https://token.actions.githubusercontent.com",
  },
  // 1. the served, in-place-verifiable whole-site signature
  siteManifest: {
    file: "site.sha256",
    sha256: manifestSha256,
    bundle: "site.sha256.sigstore.json",
    transparencyLog: "rekor.sigstore.dev",
    rekorLogIndex: logIndex,
    rekorEntry: logIndex ? `https://search.sigstore.dev/?logIndex=${logIndex}` : null,
    verify:
      `cosign verify-blob \\\n` +
      `  --bundle site.sha256.sigstore.json \\\n` +
      `  --certificate-identity-regexp '^https://github.com/${repo}/' \\\n` +
      `  --certificate-oidc-issuer https://token.actions.githubusercontent.com \\\n` +
      `  site.sha256\n` +
      `# then check the live bytes against the signed manifest:\n` +
      `sha256sum -c site.sha256`,
  },
  // 2. the pullable, versioned OCI artifact (the whole dist/)
  ociArtifact: ociRef
    ? {
        registry: "ghcr.io",
        ref: ociRef,
        digest: ociDigest || null,
        pull: `oras pull ${ociRef}`,
        verify: [
          `cosign verify ${ociDigest ? ociRef.split(":")[0] + "@" + ociDigest : ociRef}`,
          `  --certificate-identity-regexp '^https://github.com/${repo}/'`,
          `  --certificate-oidc-issuer https://token.actions.githubusercontent.com`,
        ].join(" \\\n"),
      }
    : null,
  caveat:
    "Provenance proves who built this site and that it is intact — not that the build was safe or authorized. https://bounded.tools/blog/provenance-is-not-legitimacy",
};

await writeFile(join(dist, "provenance.json"), JSON.stringify(provenance, null, 2) + "\n");

// /rekor — a stable, one-click redirect to THIS build's real Rekor entry. The
// signed HTML can't bake the per-version logIndex without circularity (the
// manifest is signed before the index exists), so this unsigned sidecar carries
// it. Excluded from site.sha256 (see gen-sitemanifest.mjs EXCLUDE). The target is
// the real search.sigstore.dev entry, which shows the cert identity + artifact
// digest — if the index were wrong, the entry wouldn't match our digest, so it
// degrades detectably rather than silently.
if (logIndex) {
  const rekorUrl = `https://search.sigstore.dev/?logIndex=${logIndex}`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=${rekorUrl}">
<title>This build's Rekor entry</title>
<script>location.replace(${JSON.stringify(rekorUrl)})</script>
</head>
<body style="font-family:system-ui,sans-serif;margin:2rem;line-height:1.5;">
<p>Redirecting to this build's entry in the public Rekor transparency log…</p>
<p><a href="${rekorUrl}">${rekorUrl}</a></p>
</body>
</html>
`;
  await mkdir(join(dist, "rekor"), { recursive: true });
  await writeFile(join(dist, "rekor", "index.html"), html);
}

console.log(`✓ provenance: entire site (${fileCount} files) · manifest sha256:${manifestSha256.slice(0, 12)}… · rekor#${logIndex ?? "?"}${logIndex ? " · /rekor → entry" : ""}${ociRef ? ` · oci ${ociRef}` : ""} → dist/provenance.json`);
