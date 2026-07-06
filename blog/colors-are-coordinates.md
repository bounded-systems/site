# Colors Are Coordinates

*What happens when you stop treating a website's colors as names and start treating them as points in a perceptual space: they dedupe, they collapse to a handful of hues, accessibility stops being a checkbox, and a palette becomes something you can prove.*

---

We pulled every color off a website — 42 of them, straight out of the rendered page — and asked a question that sounds naive: **how many colors are there, really?**

Not "how many hex values did the designer type." How many *distinct decisions*. The answer turned out to be a lot fewer than 42, and chasing the difference led through color science, a 2020 color space called OKLab, a 160-year-old law of perception, and — at the end — a Lean proof that a palette can't fail its own contrast check. Here's the trip.

## The eye has a resolution

Start with the fact that makes everything else work: **every axis of color has a just-noticeable-difference (JND)** — a threshold below which two values are, to a human, *the same*. Nudge a color by less than its JND and no one alive can tell. Above it, they can.

This isn't vague. In the OKLab color space, a perceptual distance (ΔEOK) of about **0.02** is the edge of visibility. Below it: identical. So when a stylesheet carries `#16221C` and something 0.001 off, those aren't two colors — they're one color written twice. The difference is *phantom precision*: real in the file, invisible in the world.

That single fact means the space of colors is **finite**. Perception quantizes it. There is a *countable* number of distinct colors, and it's smaller than you'd guess — which is why 42 extracted colors were never really 42.

## Three dials, and only one is free

OKLab's cylindrical form, **OKLCh**, gives a color three coordinates, and they map onto how you actually see:

- **L — how light.** The black-and-white-photo axis. It's what survives dim light, glare, and color-blindness.
- **C — how colorful.** From gray (0) up toward neon.
- **H — which color.** The hue angle, 0–360°.

The surprise is how *differently* these three behave. **L is spent on contrast** — we'll get there. **C is capped by the display's gamut.** And **H is free** — nothing in accessibility or gamut constrains which hue you pick. Hue is the one axis you can spend on identity at no cost.

Here's the sharpest consequence, the one that reorganizes everything: **the hue JND depends on chroma.** Perceptual hue distance is roughly `C × Δh`. So at high chroma a 9° hue shift is visible; at low chroma you can drift *57°* and no one notices. A near-gray can claim almost any hue and be lying.

Run that on the site's palette and 42 colors carrying 19 distinct hue values collapse to **2 hues that actually resolve** — a warm one and a cool one — plus a stack of neutrals. The rest were low-chroma colors whose hue was never visible in the first place. The palette was two decisions and a lot of lightness.

## The colors that lie about themselves

To check that this wasn't a quirk of one site, we ran it on an authoritative set: the **148 CSS named colors** — the `red`, `forestgreen`, `rebeccapurple` you type without thinking.

They collapse too. **148 names → 49 hues + 23 neutrals**, and 31 of those hues are shared by *multiple* names. `green`, `lime`, `forestgreen`, `lightgreen`, `palegreen`, `darkgreen`, `darkseagreen`, `limegreen`, and `honeydew` are **one hue** at nine different lightnesses and chromas. `maroon` **is** `red` at low lightness. The `dark-`/`light-`/`medium-`/`pale-` prefixes aren't describing new colors — they're **encoding lightness and chroma percentages in English**.

And some named colors are outright dishonest. `aliceblue`, `azure`, `mintcream`, `ivory`, `snow` — they carry a hue in their *name* but their chroma is below the JND. `aliceblue` is not blue. It's a near-white with an imperceptible tint. The standard promises a color the eye can't find. (`snow` and `white`? A ΔEOK of 0.012 apart — the same color with two names.)

The named colors are a 1990s convenience list, and treated as coordinates they reveal exactly what they are: redundant, occasionally lying, and far smaller than 148.

## A palette is one axiom and some ratios

If a color is a point, a *derived* color is a move from another point. And it turns out there's one honest way to move: **one axis at a time, multiplication only.**

Multiplication, because perception is logarithmic (this is the 160-year-old part — the **Weber–Fechner law**). You perceive *ratios*, not absolute steps. A type scale is `1.25×`, not `+3px`, for the same reason. Ratios compose and invert; they're the natural grammar of a perceptual axis.

One axis at a time, because coupling axes is what makes derivation confusing. CSS's `color-mix()` moves *all* axes together with a single knob — which is exactly why mixing toward white *also* desaturates: it can't lift lightness without dragging chroma. The more general move, relative color (`oklch(from base …)`), gives each axis its own knob. `color-mix` is just the diagonal slice of it.

Put those together and a color family is **one chosen hue (the axiom) plus a table of `(L%, C%, α%)` ratios.** The site's 42 colors factor into **16 axioms and 26 derivations** — tints, shades, fades, and lightness steps, each provably reconstructable from a base. 62% of the palette needs no independent value at all; it's a proof tree over a handful of roots.

## Accessibility mutes color — and it's geometry, not taste

Now the axis we've been saving: **L, and contrast.**

WCAG contrast is a *ratio* on luminance. White-on-black is the maximum possible: **21:1**. Any requirement you set carves the lightness axis into **bands** separated by a forbidden *moat*, and the number of bands you can stack is logarithmic:

```
bands = floor( 1 + log(21) / log(ratio) )
```

At AA (4.5:1) you get 3. At **AAA (7:1) you get 2** — a floor and a ceiling, nothing usable between. Text lives in a light band, surfaces in a dark band, and the middle is off-limits. That's not a guideline; it's arithmetic.

Then comes the part nobody tells you. WCAG only constrains *lightness* — chroma and hue are free of it. So you'd expect accessible palettes to be as vivid as any. They're not, and here's why: **the gamut's chroma ceiling is a lens** — pinched at the light and dark extremes, fattest in the middle. The most saturated colors live at mid-lightness. **Which is exactly the band AAA forbids.**

So AAA banishes your surfaces to the dark, low-chroma end and outlaws the vivid middle. **Accessible palettes are muted not by choice but by geometry** — the dark surfaces most of all. That restrained, desaturated look of a careful accessible site? It isn't taste. It's the shape of the gamut meeting the arithmetic of contrast. The trilogy: **L is the accessibility budget, C is capped at whatever L you're forced to, H is the only thing that's free.**

## The whole space is 8,149 colors

Once you accept that each axis is quantized, you can *pin* the space to a grid — steps a comfortable multiple of the JND, coarse enough that neighbors are clearly distinct:

- **L**: 5% steps → 21 levels
- **C**: 25%-of-gamut-ceiling → 5 tiers
- **H**: 15° → 24 hues
- **α**: 25% → 5 levels

Multiply it out, drop the degenerate corners, and the **entire perceptually-distinct color universe is 8,149 colors.** That's it. Every design system you've ever used picks a dozen from those 8,149. The site's 42 snap to **33 grid cells**. The scarcity isn't a limitation — it's the honest size of the space.

(An audit of those 33 caught a real bug, incidentally: a low chroma tier of a dark color can fall below the JND, leaving cells that differ only in a hue no one can see. The fix collapses them to neutral. Even the grid has to respect the eye.)

## Construct valid. Don't validate.

Which brings us to the point of the whole exercise. The normal way to make an accessible palette is: pick colors, then *check* each pairing against a contrast tool, then tweak and re-check. Apply the use, hope it's valid.

Flip it. **Let the set determine the use.** Place surfaces in the dark band and text in the light band, leave the moat empty, and make the moat wide enough that the *lightest* surface still clears the bar against the *darkest* text. Now a color's **band is its role** — dark means surface, light means text — and *every* surface-on-text pairing is accessible **by construction.** You never test a pair. You can't produce an invalid one.

For a warm-and-cool AAA palette that's 6 surfaces and 6 texts: **36 pairings, all valid, zero checked.** The worst pair is 7.10:1 — not because we measured it and got lucky, but because the geometry guarantees it.

And because it's just a monotonicity argument, it's **provable**. In Lean 4, the whole guarantee is a few lines:

> if every surface has luminance ≤ Smax and every text ≥ Tmin, and the moat satisfies `r·(Smax+off) ≤ Tmin+off`, then for *all* surfaces and *all* texts, the pair clears `r`.

One chain: `r·(s+off) ≤ r·(Smax+off) ≤ Tmin+off ≤ t+off`. The `∀` is the formal content of "the set determines the use" — pick any surface, any text, it's *already* valid. The kernel checks it. There is no palette in that shape that fails.

## Colors are coordinates

That's the whole idea, and it's small: **a color is not a name, it's a point.** Name it by its coordinates and the redundancy dissolves — `maroon` becomes `red · V4`, `aliceblue` becomes `neutral · V10`, and two colors that look the same *are* the same. Move between points by ratios, one axis at a time. Let contrast carve the lightness axis into bands, and let the bands assign the roles. What's left is a finite, honest, provable palette — one you construct correct instead of validating after the fact.

The eye has a resolution. Work at it, and color gets a lot simpler.

---

*Built with [synoptic](https://github.com/bounded-systems/synoptic): `canonicalize` · `color-health` · `color-review` · `derive-palette` · `color-pipeline` · `axis-name` · `color-systems` · `scale` · `palette-aaa` · `contrast`, and `proof/Contrast.lean`. The full theory, grounded to spec, is in [`spec/color-model.md`](https://github.com/bounded-systems/synoptic/blob/main/spec/color-model.md). Every number here is computed, not asserted.*
