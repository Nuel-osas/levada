# Levada brand (v2)

Clean fintech identity for "Mezo's savings rate, on Base."

## Mark

An aqueduct arch: a levada is a water channel, and Levada carries MUSD from Mezo to Base. The arch fills with a gradient from **ember** (orange, the Bitcoin and Mezo side) to **tide** (blue, the Base side). The line across the top is the channel.

| File | Use |
|---|---|
| `logo.svg` / `logo-on-dark.svg` | Horizontal lockup: mark and the `levada` wordmark (Geist 600) |
| `logo-mark.svg` / `logo-mark-on-dark.svg` | Mark on its own tile, for avatars and small spaces |
| `favicon.svg`, `favicon-32.png`, `icon-512.png` | Browser and app icons |
| `og.png` | Social card, 1200 × 630 |
| `preview.png` | The marks on light and dark, and at 16 / 32 / 64 / 128 px |

Regenerate the PNGs after changing an SVG: `node brand/export.cjs` (needs Playwright).

## Colour

- **Ink** `#0A0F1F`: text and the light-mode tile.
- **Tide** `#3D63FF`: primary buttons and links.
- **Ember** `#FF7A1A`: the Mezo side; logo gradient and small accents only.
- **Yield** `#0E9F6E` (dark `#34D399`): rates and earnings only.
- Neutrals from `#F5F7FB` to `#070A14`. Full set in `tokens.css`.

## Type

Geist for everything, at 600 with tight tracking (−0.045em) for headlines. Geist Mono, tabular numbers, for balances, rates and addresses.

## Shape

Rounded cards (16–32 px), pill buttons, soft layered shadows, generous white space.

The first identity (isometric pixel art) is kept in `pixel-v1/`.
