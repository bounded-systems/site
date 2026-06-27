#!/usr/bin/env bash
# integrity · policy · verify-artifact — enforce that an OCI artifact was keyless-
# signed by an ALLOWED identity. The same check the deploy fail-closes on, factored
# out so CI, local dev, and humans run the identical gate.
#
#   integrity/policy/verify-artifact.sh ghcr.io/bounded-systems/bounded-tools-site@sha256:...
#   integrity/policy/verify-artifact.sh ghcr.io/bdelanghe/robertdelanghe-dev:latest
#
# Override the allowed identity/issuer via env if needed:
#   IDENTITY_RE='^https://github\.com/bounded-systems/site/' verify-artifact.sh <ref>
#
# Exit 0 iff the artifact is signed by an allowed identity + issuer and logged in
# Rekor; non-zero otherwise. Requires cosign on PATH (the deploy devShell pins it).
set -euo pipefail

ref="${1:-}"
if [ -z "$ref" ]; then
  echo "usage: verify-artifact.sh <oci-ref> (e.g. ghcr.io/ORG/REPO@sha256:... | :tag)" >&2
  exit 2
fi

# Both sites' deploy identities by default; pin to one via IDENTITY_RE.
IDENTITY_RE="${IDENTITY_RE:-^https://github\.com/(bounded-systems|bdelanghe)/site/}"
ISSUER="${ISSUER:-https://token.actions.githubusercontent.com}"

if ! command -v cosign >/dev/null 2>&1; then
  echo "✗ cosign not found. Run inside the deploy devShell (nix develop .#deploy) or install cosign." >&2
  exit 3
fi

cosign verify "$ref" \
  --certificate-identity-regexp "$IDENTITY_RE" \
  --certificate-oidc-issuer "$ISSUER" >/dev/null

echo "✓ $ref — signed by an allowed identity (${IDENTITY_RE}) via ${ISSUER}, logged in Rekor"
