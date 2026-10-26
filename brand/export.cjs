// Renders the PNG brand assets from the SVGs in this folder with headless Chromium (Playwright).
// Usage: node brand/export.cjs   (writes icon-512.png, favicon-32.png, og.png and preview.png)
const { chromium } = require("playwright");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const dir = __dirname;
const svg = (f) => readFileSync(join(dir, f), "utf8");
const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">`;
const page = (body, css = "") =>
  `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>*{margin:0;box-sizing:border-box}body{font-family:Geist,Inter,Arial,sans-serif}${css}</style></head><body>${body}</body></html>`;

const og = page(
  `<div class="og">
    <div class="glow"></div>
    <div class="top">${svg("logo-on-dark.svg").replace('width="142" height="40"', 'width="213" height="60"')}<span class="chip">Built on Mezo</span></div>
    <h1>Mezo's savings rate,<br><span>now on Base.</span></h1>
    <p>Deposit MUSD on Base. Earn yield paid by Bitcoin borrowers. Withdraw any time.</p>
  </div>`,
  `.og{position:relative;width:1200px;height:630px;padding:72px 80px;background:#070A14;color:#fff;overflow:hidden}
   .glow{position:absolute;right:-180px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(61,99,255,.55),rgba(255,122,26,.18) 45%,transparent 70%);filter:blur(10px)}
   .top{position:relative;display:flex;align-items:center;justify-content:space-between}
   .chip{font-size:22px;font-weight:500;padding:10px 20px;border-radius:999px;border:1px solid rgba(255,255,255,.2);color:#C8CEDD}
   h1{position:relative;margin-top:96px;font-size:84px;line-height:1.02;letter-spacing:-.04em;font-weight:600}
   h1 span{background:linear-gradient(90deg,#FF9A4D,#6F8BFF);-webkit-background-clip:text;color:transparent}
   p{position:relative;margin-top:32px;font-size:28px;color:#A0A8BC;max-width:980px;letter-spacing:-.01em}`,
);

const preview = page(
  `<div class="row light">${svg("logo-mark.svg").replace('width="40" height="40"', 'width="120" height="120"')}${svg("logo.svg").replace('width="142" height="40"', 'width="426" height="120"')}</div>
   <div class="row dark">${svg("logo-mark-on-dark.svg").replace('width="40" height="40"', 'width="120" height="120"')}${svg("logo-on-dark.svg").replace('width="142" height="40"', 'width="426" height="120"')}</div>
   <div class="row light small">${[16, 32, 64, 128].map((s) => svg("favicon.svg").replace('width="40" height="40"', `width="${s}" height="${s}"`)).join("")}</div>`,
  `body{width:1000px}.row{display:flex;align-items:center;gap:72px;padding:64px 80px}.light{background:#fff}.dark{background:#070A14}.small{gap:40px;align-items:flex-end;border-top:1px solid #E6E9F0}`,
);

(async () => {
  const browser = await chromium.launch();
  const shot = async (html, w, h, out, opts = {}) => {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: opts.scale ?? 1 });
    await p.setContent(html, { waitUntil: "networkidle" }).catch(() => p.setContent(html));
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: join(dir, out), fullPage: !!opts.full, omitBackground: !!opts.transparent });
    await p.close();
    console.log("wrote", out);
  };
  const mark = (s) => page(svg("logo-mark.svg").replace('width="40" height="40"', `width="${s}" height="${s}"`), "body{background:transparent}svg{display:block}");
  await shot(mark(512), 512, 512, "icon-512.png", { transparent: true });
  await shot(mark(32), 32, 32, "favicon-32.png", { transparent: true });
  await shot(og, 1200, 630, "og.png");
  await shot(preview, 1000, 400, "preview.png", { full: true });
  await browser.close();
})();
