{
  description = "bounded.tools — static site for Bounded Systems, built on @bounded-systems/brand";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Brand is pinned here (flake.lock) for the hermetic build — independent of the
    # @bounded-systems/brand npm dependency, which exists only for `npm run dev` /
    # non-Nix builds. Pinned to the release tag (not `main`) so this stays in
    # lockstep with npm's version-based pin — both track the same RELEASE, not an
    # arbitrary branch-tip commit. When bumping the brand, update both:
    # `nix flake update brand` (after bumping the ref below) + `npm install
    # @bounded-systems/brand@<version>`. brand-checks.yml's brand-pins-agree job
    # fails closed if they ever diverge.
    brand = {
      url = "github:bounded-systems/brand?ref=v2.0.0";
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
              # The hermetic half of the build. The step list is NOT restated here:
              # scripts/pipeline.mjs is the single source of truth, and deploy.yml
              # runs its `stamped` half on the staged dist/. Restating the list is
              # what let gen-claims/gen-jsonld ship in CI but never in prod.
              node scripts/run-pipeline.mjs derivation hermetic
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
