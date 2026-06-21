# bounded.tools

The website for **Bounded Systems** — the "read this first" entry path. Plain
static HTML/CSS, no runtime, built on the [`@bounded-systems/brand`][brand]
design system.

> Design fidelity reference lives in the design project as `bounded.tools.dc.html`.
> This repo is the productionized, deployable version.

## How it consumes the brand

`brand/` is a **git submodule** pinned to a commit of [`bounded-systems/brand`][brand].
The page pulls everything visual from it — never hard-codes a brand value:

```html
<link rel="stylesheet" href="brand/css/fonts.css">     <!-- Space Grotesk + IBM Plex Mono -->
<link rel="stylesheet" href="brand/tokens/tokens.css"> <!-- --bs-* vars + .bs-text-* styles -->
<link rel="stylesheet" href="brand/css/base.css">      <!-- resets on the tokens -->
```

```css
/* styles.css — site layout references brand tokens, never raw hexes */
.hero { background: var(--bs-color-forest); }
.eyebrow { /* paired with the brand .bs-text-label slug style */ }
```

The mark is consumed as an asset: `brand/mark/mark-white.svg`. The link-card image
is the brand's wide lockup: `brand/lockup/lockup-forest-1200.png`. Site-only shades
(the dark "honesty" section) live in `styles.css` under `--site-*`, kept separate
from brand tokens on purpose.

## Setup

```bash
git clone --recurse-submodules https://github.com/bounded-systems/bounded.tools.git
cd bounded.tools
# already cloned without --recurse-submodules?
git submodule update --init --recursive
```

## Build & preview

```bash
npm run dev      # serve at http://localhost:8080 (opens index.html directly)
npm run build    # assemble dist/ (page + referenced brand assets) → deploy this
npm run check    # fail if brand tokens.css drifted from tokens.json
```

`prebuild` runs `check` automatically, so a drifted token set fails the build —
the same drift-as-CI-failure rule the project argues for.

## Updating the brand

The site moves when you bump the submodule pointer — never by editing brand
files here:

```bash
cd brand && git pull origin main && cd ..
git add brand && git commit -m "Bump brand to <sha>"
```

## Deploy

Hosted on **Cloudflare Workers** as a static-assets site (GitHub Pages is
disabled at the org level). `wrangler.jsonc` serves the built `dist/` folder.
Connected once via Cloudflare → Workers & Pages → import `bounded-systems/site`:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Custom domain:** `bounded.tools` (added to the Worker; DNS already in Cloudflare)

The public `@bounded-systems/brand` submodule is fetched at build. Cloudflare
rebuilds + redeploys on every push to `main`. Deploy locally with `npm run deploy`.

CI (`.github/workflows/ci.yml`) runs `npm run build` on each push/PR as a quality
gate — it validates the assembled `dist/` and fails on brand token drift, but does
not deploy.

## Before publishing

- [x] Wide OG/link-card image — `brand/lockup/lockup-forest-1200.png` (1.91:1)
- [ ] Point `hello@bounded.tools` at a real inbox
- [ ] Confirm the colophon copy / links read the way you want

[brand]: https://github.com/bounded-systems/brand
