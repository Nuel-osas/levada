// Copies the brand kit (../brand) into the app: static files into public/, tokens into src/app.
// brand/ is the source of truth and is never edited from here. If it is missing (for example
// in a build that only has web/), the committed copies are used as they are.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const brand = "../brand";
if (!existsSync(brand)) {
  console.log("brand kit not found; using committed copies");
  process.exit(0);
}

const files = ["logo.svg", "logo-on-dark.svg", "logo-mark.svg", "logo-mark-on-dark.svg", "favicon.svg", "favicon-32.png", "icon-512.png", "og.png"];
for (const f of files) copyFileSync(`${brand}/${f}`, `public/${f}`);

const tokens = readFileSync(`${brand}/tokens.css`, "utf8");
writeFileSync("src/app/tokens.css", `/* Copied from brand/tokens.css by scripts/sync-brand.mjs. Edit the brand kit, not this file. */\n${tokens}`);
console.log("brand synced");
