{
  description = "bounded.tools — static site for Bounded Systems, built on @bounded-systems/brand";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Brand is pinned here (flake.lock) for the hermetic build — independent of the
    # git submodule, which exists only for `npm run dev` / non-Nix builds.
    # When bumping the brand, update both: `nix flake update brand` + the submodule.
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
              # Same drift gate the project argues for, then assemble dist/.
              node brand/tokens/build-tokens.mjs --check
              node build.mjs
              node scripts/gen-blog.mjs
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
          # Deploy shell: adds wrangler. Used by .github/workflows/deploy.yml.
          deploy = pkgs.mkShell {
            packages = [ pkgs.nodejs_22 pkgs.wrangler ];
          };
        });
    };
}
