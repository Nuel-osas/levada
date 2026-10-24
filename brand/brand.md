# Levada brand kit

**Levada · Mezo's savings rate, on Base.**
Vault token: **lsMUSD** (Levada Savings MUSD). Version 1.0, 2026-10-23.

The identity is isometric pixel art: crisp, flat-shaded and drawn on a true 2:1 grid. Every logo and the hero scene are hand-placed geometry exported as SVG rectangles with `shape-rendering="crispEdges"`. Nothing is an AI bitmap. The generator lives in `src/`.

---

## 1. Name

### Recommendation: Levada (say "le-VAH-da")

A *levada* is a hand-cut water channel on Madeira. Levadas carry water from the wet mountains, where it falls, to the terraces and villages, where people live. The product does the same thing: the MUSD Savings Rate is earned on Mezo, paid by Bitcoin borrowers, and the vault carries it to Base, where users already hold MUSD. The word also means "carried" in Portuguese.

It fits a pixel aqueduct mark, and it is short, open-voweled and easy to say in a demo video. It is also clean in crypto: no protocol, token, npm package or crypto repo uses it. The levada.finance, levada.money and levada.fi domains were unregistered on 2026-10-23.

Two weaknesses to know about:
- The word is unfamiliar in English, so it needs the one-line story above.
- The "Lev" start can suggest leverage. The tagline "Mezo's savings rate, on Base." settles that in the first second.

### Vault token: lsMUSD

**lsMUSD** reads as "Levada Savings MUSD" and as "liquid sMUSD". The *s* links it to Mezo's sMUSD and says "savings". The *l* marks it as a separate, Base-side token, not Mezo's own.

Symbols rejected:
- **esMUSD:** in DeFi, *es* means *escrowed* (esGMX, esLBR), which implies a locked, vesting token. That is the opposite of a liquid savings share.
- **lvMUSD:** *lv* already means *leverage* (LeverUp's LVUSD on Monad, Archimedes' lvUSD).

Collision found: a 0-star repo, `anikeaty08/ledger` (created 2026-09-24), names its senior-tranche token lsMUSD. It is unreleased, so the overlap is negligible, but it is listed here for transparency.

### Collision check (2026-10-23)

Methods:
- Web search for each name with crypto, DeFi and protocol terms.
- The GitHub API (`gh`): repos by name and with crypto terms.
- `npm view`.
- RDAP registry lookups for .xyz, .finance, .money and .fi, plus a visit to any live site.
- CoinGecko and DexScreener token search.

| Name | Crypto / web3 use found | Domains | npm | Verdict |
|---|---|---|---|---|
| **Levada** | None. No token, no crypto repo. Nearest soundalike: Levva (LVVA), an AI vault protocol at levva.fi. | .xyz parked for sale (Atom, reg. 2026-08); .finance, .money, .fi **free** | **free** | **Recommended** |
| Estuary (working name) | Protocol Labs' **Estuary** (estuary.tech, IPFS/Filecoin storage, 245★ repo) was a well-known web3 product. It was discontinued in July 2023 and the site went down in April 2024. **Estuary Flow** (estuary.dev, real-time data, 983★ repo, active) dominates search with a "move data to where it lives" message close to ours. No live DeFi protocol or token. | .xyz parked for sale (Afternic); .finance taken 2026-03 by a "Personal Finance Dashboard"; .money free | taken | Usable, not unique. Kept as fallback. |
| Causeway | None in crypto. Apache Causeway is a Java framework. | .xyz since 2016; .finance since 2022 (no site); .money free | taken (tiny) | Runner-up: a strong island-to-island image, but no sense of flow |
| Noria | None in crypto. A noria is a water wheel that lifts water into an aqueduct. "Noria" is also an MIT dataflow-database project. | .xyz taken; .finance, .money free | taken | Runner-up: lovely, but a lift, not a channel |
| Inlet | **y4hyya/inlet** (Sep 2026): "a deposit and exit rail for DeFi built on Circle Gateway, CCTP" (same category). The inlets tunnelling tool also dominates GitHub. | .xyz taken; .money taken 2026-05 | taken | Rejected |
| Aqueduct | **Aqueduct Finance**, a Superfluid streaming AMM / TWAMM. npm `aqueduct` is an "API and Socket client for ERC dEX". | .xyz, .finance taken | taken (crypto) | Rejected |
| Sluice | **Sluice protocol**, per-second money streaming on Robinhood Chain (Aug 2026). | .xyz, .finance, .money all taken | taken | Rejected |
| Flume | flume.finance redirects to flume.ai, a personal-finance app. Apache Flume and the Flume water meter also use the name. | .xyz for sale at $19,795; .finance taken | taken | Rejected |
| Freshet | A **FRESHET** token trades on Robinhood Chain (about $14k liquidity). | .xyz taken 2026-06 | taken | Rejected |
| Weir | weir.finance: "Uniswap V4 hooks for stock hours" (registered 2026-09-26). The Weir Group (FTSE) also uses the name. | .xyz, .finance taken | taken | Rejected |
| Rivulet | rivulet.finance hosts a live "Rivulet Finance" app. | .finance taken | taken | Rejected |
| Lockkeeper | None found, but it is easily confused with **Lockwatch**, a Wave 1 entry. It is long, and lockkeeper.xyz was registered 2026-09-12. | .finance, .money free | free | Rejected |

Before you buy, confirm levada.finance (or .money) with a registrar. Also run a trademark search (EUIPO/USPTO, class 36) before any launch beyond the hackathon.

---

## 2. Visual concept

1. Two isometric islands face each other: an **ember** island on the left, where the yield is earned (Bitcoin, Mezo), and a **tide** island on the right, where people live (Base).
2. A white one-arch **aqueduct** joins them. Its water channel is the levada, and a **gold coin** rides on the crown.
3. The coin's path climbs up and to the right on a true 2:1 pixel grid, lit from the upper right, with a 1px ink outline. The result is flat, crisp and calm, not retro.

---

## 3. Logo system

| File | What | Grid / size |
|---|---|---|
| `logo-mark.svg` | Primary mark | 64 × 64 art px (mark 54 × 50, centred), default 256px |
| `favicon.svg` / `favicon-32.png` | Small-size mark, redrawn | 32 × 32 art px |
| `icon.svg` / `icon-512.png` | App icon: smaller mark on an ink tile with a floor glow | 64 × 64 art px → 512px (8 px per art px) |
| `logo.svg` / `logo-on-dark.svg` | Stacked: mark over wordmark | 87 × 72 art px |
| `lockup.svg` / `lockup-on-dark.svg` | Horizontal: favicon-grid mark plus wordmark | 124 × 28 art px |
| `wordmark.svg` / `wordmark-on-dark.svg` | Custom pixel letters | 87 × 14 art px |

Use the plain files on light backgrounds and the `-on-dark` files on ink. The mark itself is the same in both. Its 1px outline is ink (#0B1022), so it disappears on dark backgrounds and defines the shape on light ones.

### Construction (true 2:1 isometric)

- **Grid.** One step along x moves 2px right and 1px down; one step along y moves 2px left and 1px down; height is in whole pixels. Every face is filled by sampling pixel centres, so every diagonal is a clean 2-pixel stair. There are no half-pixels and no anti-aliasing.
- **Islands.** Each is a 6 × 6-tile block, 11px tall. The ember island is front-left and the tide island back-right, with an 8-tile strait between them.
- **Aqueduct.** It is 3 tiles deep and rests 2 tiles onto each island. A semi-elliptical arch (9px rise) springs from the island tops. The deck is 5px above the crown, with a 2px stone-100 archivolt ring around the arch. A 1-tile aqua channel runs along the deck, with a 1px highlight.
- **Coin.** A front-facing 10px coin (6px in the favicon) sits on the deck above the arch's crown.
- **Light.** It comes from the upper right:
  - Top faces are tone 300 with a 1px rim of tone 200 on their front edges.
  - Right-facing sides are tone 500 (lit).
  - Left-facing sides are tone 600 (shade).
  - The visible inside of the arch is stone-400.
- **Small sizes.** `favicon.svg` is a separate 32-grid drawing, not a scaled copy: 3-tile islands, a 4-tile strait, a 6px coin, and the arch's inside filled with ink so the opening still reads.
- **Wordmark.**
  - Letters: cap height 14px, 3px stems, 2px bars. The two **A**s are arched to echo the aqueduct.
  - Spacing: 4px tracking, kerning L–E −1, V–A −2, D–A −1.
  - It is drawn, not typed. Never set "LEVADA" in a font.
- **Lockup.** The 28px mark, a 9px gap, then the wordmark. The wordmark sits 1px below true centre, because the coin at the top is visually light.
- **Stacked logo.** The mark, an 8px gap, then the wordmark, both centred.

### Clear space and minimum size

- **Clear space = C**, the coin diameter: 10 art px around `logo-mark.svg` and `logo.svg`, 6 art px around the lockup. Scale C with the logo.
- **Minimum sizes:**
  - Lockup: 124px wide (1×).
  - Wordmark: 87px wide.
  - Mark: use `favicon.svg` below 48px, down to 16px.
- **Raster exports:** scale by whole multiples only (1×, 2×, 4×, 8×) so every art pixel stays square. SVG at other sizes is fine.

---

## 4. Colour

Five hue families plus two neutrals. **Ember** and **tide** carry the left-to-right story. **Gold** is reserved for yield. **Aqua** is water and flow. **Stone** is the aqueduct. The warm colour is orange-red, deliberately far from Mezo's raspberry. The blue is a periwinkle cobalt, not Base's #0052FF.

| Token | Hex | Role |
|---|---|---|
| `--lv-ember-300` | #FF9C68 | Warm island top; warm text on dark (display) |
| `--lv-ember-500` | #F05A2A | **Brand warm**: source / Mezo side |
| `--lv-ember-600` | #C8411F | Warm shade |
| `--lv-ember-700` | #962D1E | Warm text on light |
| `--lv-tide-300` | #8AA8FF | Cool island top; cool text on dark |
| `--lv-tide-500` | #3B63F2 | **Brand cool**: home / Base side; primary button |
| `--lv-tide-600` | #2B47C4 | Cool shade; links on light |
| `--lv-gold-300` | #FFD150 | Yield text on dark |
| `--lv-gold-400` | #FFB627 | **Coin / yield** fill |
| `--lv-gold-700` | #8A4A12 | Yield text on light |
| `--lv-aqua-300` | #5EDDE0 | Water in the channel |
| `--lv-stone-100` | #EEF1F7 | Aqueduct top; text on dark |
| `--lv-stone-200` | #D5DAE6 | Aqueduct face |
| `--lv-ink-900` | #0B1022 | Dark background; outline; text on light |
| `--lv-ink-800` | #121937 | Dark surface |
| `--lv-paper-50` | #FAF8F4 | Light background |

Full ramps (50 to 800) are in `tokens.css` and on `previews/brand-sheet.png`.

**Proportions:** about 70% neutrals (ink or paper), 15% tide, 10% ember, and 5% gold and aqua together.

### Text contrast (WCAG 2.x, against the theme background)

| Token | Light (#FAF8F4) | Dark (#0B1022) |
|---|---|---|
| `--lv-text` | ink-900 · **17.8:1** | stone-100 · **16.7:1** |
| `--lv-text-muted` | #4A5274 · **7.2:1** | ink-300 · **7.6:1** |
| `--lv-text-subtle` | #5F6788 · **5.2:1** | #7D87B0 · **5.4:1** (not on surface-2) |
| `--lv-text-warm` | ember-700 · **7.4:1** | ember-400 · **7.3:1** |
| `--lv-text-cool` (links) | tide-600 · **7.1:1** | tide-300 · **8.2:1** |
| `--lv-text-yield` | gold-700 · **6.5:1** | gold-300 · **13.0:1** |
| `--lv-text-danger` | #C8102E · **5.6:1** | #FF7B86 · **7.6:1** |
| `--lv-text-success` | #13795B · **5.1:1** | #5FD6A8 · **10.5:1** |
| Primary button | white on tide-500 · **4.9:1** | same |
| Yield chip | ink-900 on gold-400 · **10.8:1** | same |
| Input outline (`--lv-border-strong`) | #857F71 · **3.8:1** | #5D6AA8 · **3.7:1** |

---

## 5. Typography (Google Fonts only)

| Role | Family | Weights | Use |
|---|---|---|---|
| Display | **Pixelify Sans** | 500, 600 (variable 400–700) | Headlines and short marketing lines, 24px and up. Never body text, never numbers in tables. |
| UI | **Geist** | 400, 500, 600 | All interface text, body, buttons, labels |
| Figures | **Geist Mono** | 400, 500 | Balances, APR, addresses, hashes, always `font-variant-numeric: tabular-nums` |

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..500&family=Pixelify+Sans:wght@400..700&display=swap" rel="stylesheet">
```

| Step | Size | Family / weight | Line height | Tracking |
|---|---|---|---|---|
| display-xl | 64px | Pixelify Sans 600 | 1.0 | +0.01em |
| display-lg | 48px | Pixelify Sans 600 | 1.05 | +0.01em |
| display-md | 32px | Pixelify Sans 500 | 1.1 | +0.01em |
| h1 | 28px | Geist 600 | 1.2 | −0.01em |
| h2 | 22px | Geist 600 | 1.3 | 0 |
| h3 | 18px | Geist 600 | 1.4 | 0 |
| body | 16px | Geist 400 | 1.55 | 0 |
| small | 14px | Geist 400 | 1.5 | 0 |
| caption | 12px | Geist 500, uppercase | 1.4 | +0.04em |
| figure-xl | 48px | Geist Mono 500 | 1.0 | 0 |
| figure | 20px | Geist Mono 500 | 1.3 | 0 |

The tagline uses Pixelify Sans 500. "Mezo's savings rate," is set in ember (ember-300 on dark, ember-700 on light) and "on Base." in tide (tide-300 on dark, tide-600 on light).

---

## 6. Hero scene (`scene.svg`)

The scene is 1200 × 500 viewBox, **31.8 KB**, and built from 300 × 125 art pixels (one art pixel = 4 units, inside `<g transform="scale(4)">`).

It shows the ember Mezo island with a vault (stepped roof, gold finial, round vault door, gold ingots) and the tide Base island with a harbour (dock, sailboat, lighthouse, flat-roofed houses, tree). Between them is the three-arch aqueduct carrying three coins into the Base tower. The sea is a full-bleed ink-900 rectangle, so it matches the dark theme seamlessly.

| Selector | What | Suggested motion |
|---|---|---|
| `#coin-1` `#coin-2` `#coin-3` (`.coin`) | Coins on the channel; 1 is nearest the vault | Translate (+16, −8) art px in `steps(8)`, looped |
| `#sparkle` (`.sparkle`) | Yield sparkle over the Base tower | Twinkle |
| `#glint-1` `#glint-2` (`.glint`) | Small glints over the coins and the vault | Twinkle, offset |
| `#beacon` (`.beacon`) | Lighthouse lamp (the keeper's light) | Blink |
| `#boat` (`.boat`) | Sailboat | 1px bob |
| `#ripples` (`.ripples`, `.ripple`, `.ripple-hi`) | Sea ripples | Shimmer |
| `.sea`, `.shallows-1`, `.shallows-2`, `.foam` | Water fills | Re-colour for a light theme |
| `#world` | Everything static | none |

**To animate:** inline the SVG (for example as a React component, not `<img>`), wrap it in `.levada-scene`, and load `scene-motion.css`. All motion is in whole art pixels, including `prefers-reduced-motion`. The core of it:

```css
.levada-scene .coin   { animation: lv-flow 2.4s steps(8, end) infinite; }
.levada-scene #coin-1 { animation-name: lv-flow-in; }   /* fades in at the vault  */
.levada-scene #coin-3 { animation-name: lv-flow-out; }  /* fades out at the tower */
@keyframes lv-flow { from { transform: translate(0, 0); } to { transform: translate(16px, -8px); } }
@media (prefers-reduced-motion: reduce) { .levada-scene * { animation: none !important; } }
```

One isometric step is `translate(2px, -1px)` in scene units. Keep moves on that grid and the art stays crisp.

---

## 7. Do and don't

**Do**
- Keep the ember island on the left and the tide island on the right. Value flows up and to the right.
- Use `-on-dark` lockups on ink and the plain ones on paper.
- Keep gold for yield: coins, APR, earnings, the "you receive" line.
- Use hard pixel details in UI: 2px borders, square or 4px-notched corners (`--lv-clip-pixel`), and hard offset shadows (`--lv-shadow-pixel`).
- Render pixel art with `image-rendering: pixelated` / `shape-rendering: crispEdges` and whole-number scales.

**Don't**
- Don't smooth, blur, rotate, skew, stretch or add gradients or glows to the mark.
- Don't swap or recolour the islands, or make both the same colour.
- Don't put Mezo, Base, Wormhole or Bitcoin logos, or a ₿ or $ glyph, on the coin or anywhere in the mark. The brand nods to their hues; it never borrows their marks.
- Don't use ember for errors. Errors use `--lv-text-danger` plus an icon.
- Don't typeset the name in Pixelify Sans or any font. Use the wordmark files.
- Don't use Pixelify Sans for body copy, form labels or numbers.
- Don't place the mark on busy photography or mid-tone backgrounds without an ink or paper plate.
- Don't use pill shapes or soft drop shadows. They fight the pixel grid.

---

## 8. Tokens (`tokens.css`)

`tokens.css` has primitives (`--lv-ember-500`) and semantic tokens (`--lv-text`, `--lv-accent`). Light is the default. Dark applies from `prefers-color-scheme: dark`, or you can force it with `<html data-theme="dark">`. `data-theme` on any element also scopes a subtree, for example a dark hero inside a light page. The file imports the Google Fonts above.

```css
@import "brand/tokens.css";

.card   { background: var(--lv-surface); color: var(--lv-text); border: var(--lv-border-width) solid var(--lv-border);
          clip-path: var(--lv-clip-pixel); padding: var(--lv-space-6); }
.apr    { font: var(--lv-weight-medium) var(--lv-text-figure-xl)/1 var(--lv-font-mono); color: var(--lv-text-yield);
          font-variant-numeric: tabular-nums; }
.btn    { font: var(--lv-weight-semibold) var(--lv-text-body)/1 var(--lv-font-ui); color: var(--lv-on-accent);
          background: var(--lv-accent); clip-path: var(--lv-clip-pixel); padding: var(--lv-space-4); }
.btn:hover { background: var(--lv-accent-hover); }
.btn:focus-visible { outline: 2px solid var(--lv-focus); outline-offset: 2px; }
.hero h1 { font: var(--lv-weight-semibold) var(--lv-text-display-lg)/var(--lv-leading-tight) var(--lv-font-display); }
```

Key semantic tokens, light and dark:

```css
:root, [data-theme="light"] {
  --lv-bg: var(--lv-paper-50);   --lv-surface: var(--lv-paper-0);   --lv-surface-2: var(--lv-paper-100);
  --lv-text: var(--lv-ink-900);  --lv-text-muted: #4A5274;          --lv-text-subtle: #5F6788;
  --lv-text-warm: var(--lv-ember-700);  --lv-text-cool: var(--lv-tide-600);  --lv-text-yield: var(--lv-gold-700);
  --lv-accent: var(--lv-tide-500);  --lv-on-accent: #FFFFFF;  --lv-yield: var(--lv-gold-400);  --lv-focus: var(--lv-tide-500);
}
[data-theme="dark"] {
  --lv-bg: var(--lv-ink-900);    --lv-surface: var(--lv-ink-800);   --lv-surface-2: var(--lv-ink-700);
  --lv-text: var(--lv-stone-100); --lv-text-muted: var(--lv-ink-300); --lv-text-subtle: #7D87B0;
  --lv-text-warm: var(--lv-ember-400);  --lv-text-cool: var(--lv-tide-300);  --lv-text-yield: var(--lv-gold-300);
  --lv-accent: var(--lv-tide-500);  --lv-on-accent: #FFFFFF;  --lv-yield: var(--lv-gold-400);  --lv-focus: var(--lv-tide-400);
}
```

---

## 9. Files

| File | Notes |
|---|---|
| `logo-mark.svg` | Primary mark, 64 grid |
| `logo.svg`, `logo-on-dark.svg` | Stacked logo |
| `lockup.svg`, `lockup-on-dark.svg` | Horizontal lockup |
| `wordmark.svg`, `wordmark-on-dark.svg` | Wordmark only |
| `favicon.svg`, `favicon-32.png` | 32-grid favicon (PNG has transparent background) |
| `icon.svg`, `icon-512.png` | App icon, full bleed |
| `og.png` | 1200 × 630 social image |
| `scene.svg`, `scene-motion.css` | Hero scene and its motion |
| `tokens.css` | Colour, type, space and shape tokens; light and dark |
| `previews/` | Renders checked during design: brand sheet, marks, lockups, wordmarks, favicon at 16/32/64, scene at 1× and 2× |
| `src/` | Generator (Python 3 standard library, no packages) |

`favicon.svg` is a plain static SVG, so add it with `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`. Give the PNG as a fallback: `<link rel="icon" href="/favicon-32.png" sizes="32x32">`.

### Regenerate

```sh
cd brand/src
python3 build_brand.py ..            # marks, favicon, lockups, wordmark, icon (SVG)
python3 export_scene.py ../scene.svg # hero scene
python3 tokens_gen.py ../tokens.css  # tokens
python3 make_previews.py             # favicon-32.png, icon-512.png, og.png, previews/* (needs Google Chrome)
```

To change the palette, edit `src/palette.py` and rebuild. Mark proportions are the `MARK64` / `FAV32` / `ICON64` recipes in `build_brand.py`. The OG copy is in `make_previews.py`.
