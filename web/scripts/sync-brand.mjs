// Copies the brand kit (../brand) into the app: static files into public/, and the hero scene
// into a module so it can be inlined (its ids and classes are animated by CSS).
// brand/ is the source of truth and is never edited from here. If it is missing (for example
// in a build that only has web/), the committed copies are used as they are.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const brand = "../brand";
if (!existsSync(brand)) {
  console.log("brand kit not found; using committed copies");
  process.exit(0);
}

const files = [
  "logo-mark.svg",
  "lockup.svg",
  "lockup-on-dark.svg",
  "wordmark.svg",
  "wordmark-on-dark.svg",
  "favicon.svg",
  "favicon-32.png",
  "icon-512.png",
  "og.png",
  "scene.svg",
];
for (const f of files) copyFileSync(`${brand}/${f}`, `public/${f}`);
copyFileSync(`${brand}/scene-motion.css`, "src/app/scene-motion.css");

// tokens.css without its Google Fonts @import: the app loads the same families with next/font.
const tokens = readFileSync(`${brand}/tokens.css`, "utf8").replace(/^@import url\([^)]*\);\n/m, "");
writeFileSync("src/app/tokens.css", `/* Copied from brand/tokens.css by scripts/sync-brand.mjs. Edit the brand kit, not this file. */\n${tokens}`);

// The scene, inlined. Width and height come from CSS (whole-number scales only).
const svg = readFileSync(`${brand}/scene.svg`, "utf8")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(' width="1200" height="500"', ' class="scene__art"')
  .replace(/\n\s*/g, "");
writeFileSync(
  "src/components/scene-svg.ts",
  `// Generated from brand/scene.svg by scripts/sync-brand.mjs. Do not edit.\nexport const SCENE_SVG = ${JSON.stringify(svg)};\n`,
);

// The horizontal lockup as path data. The first path is the wordmark (ink on light, stone-100 on
// dark in the brand files); it is drawn with currentColor so one inline copy follows the theme.
const lockup = readFileSync(`${brand}/lockup.svg`, "utf8");
const paths = [...lockup.matchAll(/<path fill="(#[0-9A-Fa-f]{6})" d="([^"]+)"\/>/g)].map((m) => ({ fill: m[1], d: m[2] }));
const [wordmark, ...mark] = paths;
writeFileSync(
  "src/components/lockup-svg.ts",
  `// Generated from brand/lockup.svg by scripts/sync-brand.mjs. Do not edit.\nexport const LOCKUP = ${JSON.stringify({ viewBox: "0 0 124 28", wordmark: wordmark.d, mark }, null, 0)};\n`,
);

// Sea ripples as mask tiles, so the water can run past the art to the edges of the screen.
for (const [cls, name] of [["ripple", "ripples"], ["ripple-hi", "ripples-hi"]]) {
  const d = svg.match(new RegExp(`class="${cls}" fill="[^"]+" d="([^"]+)"`))?.[1];
  if (!d) throw new Error(`scene.svg: .${cls} not found`);
  writeFileSync(
    `public/scene-${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 125" width="300" height="125" shape-rendering="crispEdges"><path d="${d}"/></svg>\n`,
  );
}
console.log("brand synced");
