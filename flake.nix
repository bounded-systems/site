{
  description = "bounded.tools — static site for Bounded Systems, built on @bounded-systems/brand";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Brand is pinned here (flake.lock) for the hermetic build — independent of the
    # @bounded-systems/brand npm dependency, which exists only for `npm run dev` /
    # non-Nix builds. When bumping the brand, update both: `nix flake update brand`
    # + `npm install @bounded-systems/brand@<version>`.
    brand = {
      url = "github:bounded-systems/brand";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, brand }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAll = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};
    in
    {
      packages = forAll (system:
        let pkgs = pkgsFor system; in
        rec {
          default = site;
          site = pkgs.stdenv.mkDerivation {
            pname = "bounded-tools-site";
            version = "0.1.0";
            src = ./.;
            nativeBuildInputs = [ pkgs.nodejs_22 ];
            buildPhase = ''
              runHook preBuild
              # Bring the pinned brand source in where the site expects it.
              rm -rf brand
              cp -rL ${brand} brand
              chmod -R u+w brand
              # Fail closed if the vendored conformance-kit drifted from its hash-pin.
              node scripts/verify-vendor.mjs
              # Node-uniqueness gate — no identity key may repeat in any data cut
              # (registry nodes, seams, nav links). Fails closed before any page is built.
              node scripts/check-node-uniqueness.mjs
              # Same drift gate the project argues for, then assemble dist/.
              node brand/tokens/build-tokens.mjs --check
              node build.mjs
              node scripts/gen-blog.mjs
              # Compute + render the conformance projection (lone's web-build model
              # folded over the gate-backed evidence contract) — the /conformance page
              # + its machine-readable twin, part of the pure, hermetic output.
              node scripts/gen-conformance.mjs
              node scripts/gen-sitemap.mjs
              # Pure HTML transforms — part of the hermetic output, so they MUST run here
              # (this buildPhase, not just package.json's "build", is what deploys):
              #   • obfuscate-email — entity-encode mailto in HTML (no JS), in place of CF's
              #     edge Email Obfuscation which we keep off.
              #   • check-link-graph — prove the site is one connected graph, emit sitegraph.json.
              # KEEP IN SYNC with package.json "build" (the local-dev mirror of this list).
              node scripts/obfuscate-email.mjs
              #   • add-sri — pin every self-hosted <script>/<link> by sha384 (browser-enforced
              #     subresource integrity); MUST run before the Repr-Digest so it's signed.
              node scripts/add-sri.mjs
              node scripts/check-link-graph.mjs dist
              # Deterministic SPDX SBOM of the supply chain (flake.lock + package-lock).
              # A pure function of the committed lockfiles (no clock, no network) — so it
              # is reproducible and covered by the signed whole-site manifest.
              node scripts/gen-sbom.mjs
              node vendor/conformance-kit/gates/sbom/check-sbom.mjs
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              cp -r dist $out
              runHook postInstall
            '';
          };
        });

      devShells = forAll (system:
        let pkgs = pkgsFor system; in
        {
          # Everyday shell: node only, so `nix develop` works on every platform.
          # (nixpkgs' wrangler currently fails to build on aarch64-darwin; it's
          # only needed at deploy time, which runs on Linux CI — see `deploy`.)
          default = pkgs.mkShell {
            packages = [ pkgs.nodejs_22 ];
          };
          # Deploy shell: wrangler (publish) + cosign (keyless signing) + oras
          # (push the built site to GHCR as an OCI artifact). Used by
          # .github/workflows/deploy.yml. All pinned here via flake.lock for the
          # same reason wrangler is — the deploy toolchain stays reproducible, no
          # unpinned `nix run nixpkgs#…`.
          deploy = pkgs.mkShell {
            packages = [ pkgs.nodejs_22 pkgs.wrangler pkgs.cosign pkgs.oras ];
          };
        });
    };
}
