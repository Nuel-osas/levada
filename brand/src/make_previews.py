"""Render the PNG deliverables and previews with headless Chrome.

    python3 make_previews.py            # writes ../favicon-32.png ../icon-512.png ../og.png ../previews/*
Fonts: by default pages pull Pixelify Sans, Geist and Geist Mono from Google Fonts.
Set LEVADA_FONTS=/path/to/woff2-folder (PixelifySans-latin.woff2, Geist-latin.woff2,
GeistMono-latin.woff2) to render offline. ImageMagick (magick) is only needed for the zoomed favicon sheet.
"""
import os, sys, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from palette import TOKENS as T
from render import svg_png, shot, TMP

B = os.path.abspath(os.path.join(HERE, '..'))
P = os.path.join(B, 'previews')
LIGHT, DARK = T['paper-50'], T['ink-900']
FONTS = os.environ.get('LEVADA_FONTS')


def font_css():
    if FONTS:
        f = os.path.abspath(FONTS)
        return (f'@font-face {{ font-family: "Pixelify Sans"; src: url("file://{f}/PixelifySans-latin.woff2") format("woff2"); font-weight: 400 700; }}\n'
                f'@font-face {{ font-family: "Geist"; src: url("file://{f}/Geist-latin.woff2") format("woff2"); font-weight: 100 900; }}\n'
                f'@font-face {{ font-family: "Geist Mono"; src: url("file://{f}/GeistMono-latin.woff2") format("woff2"); font-weight: 100 900; }}\n')
    return ('@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400..700'
            '&family=Geist+Mono:wght@400..500&family=Pixelify+Sans:wght@400..700&display=swap");\n')


def page(name, html, w, h, out):
    os.makedirs(TMP, exist_ok=True)
    p = os.path.join(TMP, name)
    with open(p, 'w') as fh:
        fh.write(html)
    shot('file://' + p, out, w, h, budget=4000)


def u(name):
    return 'file://' + os.path.join(B, name)


def og():
    html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
{font_css()}
html, body {{ margin: 0; padding: 0; }}
body {{ width: 1200px; height: 630px; background: {T['ink-900']}; position: relative; overflow: hidden; }}
.scene {{ position: absolute; left: 150px; top: 146px; width: 1200px; height: 500px; display: block; }}
.copy {{ position: absolute; left: 64px; top: 58px; }}
.wm {{ display: block; width: 348px; height: 56px; }}
.tag {{ margin: 26px 0 0; font-family: "Pixelify Sans", monospace; font-weight: 500; font-size: 40px; line-height: 1.1; color: {T['stone-100']}; letter-spacing: 0.01em; }}
.tag .warm {{ color: {T['ember-300']}; }} .tag .cool {{ color: {T['tide-300']}; }}
.sub {{ margin: 14px 0 0; font-family: "Geist", sans-serif; font-weight: 400; font-size: 21px; line-height: 1.45; color: {T['ink-300']}; max-width: 450px; }}
.chips {{ margin-top: 22px; display: flex; gap: 10px; }}
.chip {{ font-family: "Geist Mono", monospace; font-weight: 500; font-size: 15px; color: {T['ink-200']}; background: {T['ink-800']}; border: 2px solid {T['ink-600']}; padding: 6px 10px; }}
</style></head><body>
  <img class="scene" src="{u('scene.svg')}" alt="">
  <div class="copy">
    <img class="wm" src="{u('wordmark-on-dark.svg')}" alt="Levada">
    <p class="tag"><span class="warm">Mezo's savings rate,</span><br><span class="cool">on Base.</span></p>
    <p class="sub">Deposit MUSD on Base. Earn the rate Bitcoin borrowers pay on Mezo. No bridge screen, no BTC for gas.</p>
    <div class="chips"><span class="chip">ERC-4626</span><span class="chip">Wormhole NTT</span><span class="chip">Permissionless</span></div>
  </div>
</body></html>'''
    page('og.html', html, 1200, 630, os.path.join(B, 'og.png'))


def tokens_local():
    css = open(os.path.join(B, 'tokens.css')).read()
    return '\n'.join(l for l in css.splitlines() if not l.startswith('@import'))


SW = [('ember', ['100', '200', '300', '400', '500', '600', '700', '800']),
      ('tide', ['100', '200', '300', '400', '500', '600', '700', '800']),
      ('gold', ['100', '200', '300', '400', '500', '600']),
      ('aqua', ['100', '200', '300', '400', '500', '600']),
      ('stone', ['50', '100', '200', '300', '400', '500']),
      ('ink', ['900', '800', '700', '600', '500', '300']),
      ('paper', ['0', '50', '100', '200', '300', '500'])]


def card(theme):
    lk = u('lockup-on-dark.svg' if theme == 'dark' else 'lockup.svg')
    return f'''
<div class="ui" data-theme="{theme}">
  <div class="card">
    <div class="card-head"><img class="lk" src="{lk}" alt="Levada"><span class="net">Base</span></div>
    <div class="rate"><span class="lv-figure big">4.2%</span><span class="unit">APR<br><small>variable · example</small></span></div>
    <p class="muted">Mezo's MUSD Savings Rate, paid by Bitcoin borrowers. Earned on Base.</p>
    <label class="field"><span class="lbl">Deposit</span><span class="inp"><span class="lv-figure">1,000.00</span><span class="tok">MUSD</span><span class="max">MAX</span></span></label>
    <div class="row"><span class="muted">You receive</span><span class="lv-figure">≈ 998.12 <b class="yield">lsMUSD</b></span></div>
    <button class="btn">Deposit on Base</button>
    <p class="fine">Instant exits from the Base buffer. Larger exits queue over Wormhole NTT.</p>
  </div>
</div>'''


def sheet():
    sw_html = []
    for name, steps in SW:
        cells = ''.join(
            f'<div class="sw"><div class="chip" style="background:{T[f"{name}-{s}"]}"></div><div class="sn">{name}-{s}</div><div class="sh">{T[f"{name}-{s}"]}</div></div>'
            for s in steps)
        sw_html.append(f'<div class="swrow">{cells}</div>')
    html = f'''<!doctype html><html data-theme="light"><head><meta charset="utf-8"><style>
{font_css()}
{tokens_local()}
html,body{{margin:0;padding:0}}
body{{width:1600px;background:var(--lv-paper-50);color:var(--lv-ink-900);font-family:var(--lv-font-ui)}}
.wrap{{padding:56px 64px 64px}}
.cap{{font-family:var(--lv-font-ui);font-weight:500;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#4A5274;margin:0 0 10px}}
.top{{background:var(--lv-ink-900);padding:56px 64px;display:flex;align-items:center;justify-content:space-between}}
.top img{{height:112px;display:block}}
.top .t{{font-family:var(--lv-font-display);color:var(--lv-stone-100);font-size:34px;text-align:right;line-height:1.15}}
.top .t span{{color:var(--lv-ember-300)}} .top .t em{{font-style:normal;color:var(--lv-tide-300)}}
.grid3{{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:48px}}
.tile{{height:300px;display:flex;align-items:center;justify-content:center;border:2px solid var(--lv-paper-200)}}
.tile.d{{background:var(--lv-ink-900);border-color:var(--lv-ink-900)}}
.tile img.m{{width:256px;height:256px}}
.favs{{display:flex;align-items:flex-end;gap:28px}}
.favs div{{text-align:center;font:500 12px var(--lv-font-mono);color:#4A5274}}
.favs img{{display:block;margin:0 auto 8px}}
.locks{{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:48px}}
.locks .tile{{height:200px}} .locks img{{height:84px}}
.swrow{{display:flex;gap:10px;margin-bottom:12px}}
.sw{{width:150px}} .chip{{height:56px;border:1px solid rgba(11,16,34,.08)}}
.sn{{font:500 12px var(--lv-font-ui);margin-top:6px}} .sh{{font:400 12px var(--lv-font-mono);color:#4A5274}}
.type{{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:32px;margin:48px 0}}
.spec .a{{font-family:var(--lv-font-display);font-weight:600;font-size:56px;line-height:1}}
.spec .b{{font-family:var(--lv-font-ui);font-weight:600;font-size:40px;line-height:1.1;letter-spacing:-.01em}}
.spec .c{{font-family:var(--lv-font-mono);font-weight:500;font-size:40px;line-height:1.1}}
.spec p{{font-size:15px;color:#4A5274;margin:10px 0 0;line-height:1.5}}
.scene{{display:block;width:1472px;height:613px;border:0}}
.uis{{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:48px 0}}
.ui{{background:var(--lv-bg);padding:40px;display:flex;justify-content:center}}
.card{{width:440px;background:var(--lv-surface);color:var(--lv-text);padding:28px;clip-path:var(--lv-clip-pixel);border:2px solid var(--lv-border)}}
.card-head{{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}}
.card-head .lk{{height:28px}}
.net{{font:500 12px var(--lv-font-mono);color:var(--lv-text-cool);border:2px solid var(--lv-border);padding:3px 8px}}
.rate{{display:flex;align-items:flex-end;gap:12px}}
.rate .big{{font-size:56px;font-weight:500;color:var(--lv-text-yield);line-height:1}}
.rate .unit{{font:600 16px var(--lv-font-ui);color:var(--lv-text);line-height:1.2;padding-bottom:6px}}
.rate small{{font-weight:400;font-size:12px;color:var(--lv-text-subtle)}}
.muted{{color:var(--lv-text-muted);font-size:14px;line-height:1.5}}
.field{{display:block;margin:18px 0 12px}} .lbl{{display:block;font:500 12px var(--lv-font-ui);letter-spacing:.04em;text-transform:uppercase;color:var(--lv-text-muted);margin-bottom:6px}}
.inp{{display:flex;align-items:center;gap:10px;background:var(--lv-surface-2);border:2px solid var(--lv-border-strong);padding:12px 14px;font-size:20px}}
.inp .tok{{font:500 14px var(--lv-font-mono);color:var(--lv-text-warm);margin-left:auto}}
.inp .max{{font:600 12px var(--lv-font-ui);color:var(--lv-on-yield);background:var(--lv-yield);padding:3px 6px}}
.row{{display:flex;justify-content:space-between;align-items:center;margin:4px 0 18px}}
.row .lv-figure{{font-size:16px}} .yield{{color:var(--lv-text-yield);font-weight:500}}
.btn{{width:100%;font:600 16px var(--lv-font-ui);color:var(--lv-on-accent);background:var(--lv-accent);border:0;padding:14px;clip-path:var(--lv-clip-pixel)}}
.fine{{font-size:12px;color:var(--lv-text-subtle);margin:12px 0 0;line-height:1.5}}
</style></head><body>
<div class="top"><img src="{u('lockup-on-dark.svg')}" alt="Levada"><div class="t"><span>Mezo's savings rate,</span><br><em>on Base.</em></div></div>
<div class="wrap">
  <p class="cap">Mark · 64px grid, true 2:1 isometric · light / dark / app icon</p>
  <div class="grid3">
    <div class="tile"><img class="m" src="{u('logo-mark.svg')}"></div>
    <div class="tile d"><img class="m" src="{u('logo-mark.svg')}"></div>
    <div class="tile d"><img class="m" src="{u('icon.svg')}"></div>
  </div>
  <p class="cap">Lockups · same pixel grid for mark and type</p>
  <div class="locks">
    <div class="tile"><img src="{u('lockup.svg')}"></div>
    <div class="tile d"><img src="{u('lockup-on-dark.svg')}"></div>
  </div>
  <p class="cap">Favicon · 32px grid at 16 / 32 / 64 / 128</p>
  <div class="favs">
    <div><img src="{u('favicon.svg')}" width="16" height="16">16</div>
    <div><img src="{u('favicon.svg')}" width="32" height="32">32</div>
    <div><img src="{u('favicon.svg')}" width="64" height="64">64</div>
    <div><img src="{u('favicon.svg')}" width="128" height="128">128</div>
  </div>
  <div class="type">
    <div class="spec"><p class="cap">Display · Pixelify Sans 600</p><div class="a">Savings, on Base.</div><p>Headlines and short marketing lines only. Sizes 32 / 48 / 64.</p></div>
    <div class="spec"><p class="cap">UI · Geist 400 / 500 / 600</p><div class="b">Deposit MUSD</div><p>All interface text, body copy and buttons.</p></div>
    <div class="spec"><p class="cap">Figures · Geist Mono 500</p><div class="c">1,000.00 lsMUSD</div><p>Balances, rates, addresses. Always tabular-nums.</p></div>
  </div>
  <p class="cap">Palette · primitives</p>
  {''.join(sw_html)}
  <div class="uis">{card('light')}{card('dark')}</div>
  <p class="cap">Hero scene · scene.svg (1200 × 500, 4 units per art pixel)</p>
  <img class="scene" src="{u('scene.svg')}">
</div>
</body></html>'''
    page('sheet.html', html, 1600, 3020, os.path.join(P, 'brand-sheet.png'))


def assets():
    svg_png(os.path.join(B, 'favicon.svg'), os.path.join(B, 'favicon-32.png'), 32, 32)
    svg_png(os.path.join(B, 'icon.svg'), os.path.join(B, 'icon-512.png'), 512, 512)


def previews():
    os.makedirs(P, exist_ok=True)
    j = lambda n: os.path.join(B, n)
    q = lambda n: os.path.join(P, n)
    svg_png(j('logo-mark.svg'), q('logo-mark-light.png'), 512, 512, LIGHT)
    svg_png(j('logo-mark.svg'), q('logo-mark-dark.png'), 512, 512, DARK)
    svg_png(j('lockup.svg'), q('lockup-light.png'), 124 * 6, 28 * 6, LIGHT, pad=64)
    svg_png(j('lockup-on-dark.svg'), q('lockup-dark.png'), 124 * 6, 28 * 6, DARK, pad=64)
    svg_png(j('logo.svg'), q('logo-light.png'), 87 * 6, 72 * 6, LIGHT, pad=64)
    svg_png(j('logo-on-dark.svg'), q('logo-dark.png'), 87 * 6, 72 * 6, DARK, pad=64)
    svg_png(j('wordmark.svg'), q('wordmark-light.png'), 87 * 8, 14 * 8, LIGHT, pad=48)
    svg_png(j('wordmark-on-dark.svg'), q('wordmark-dark.png'), 87 * 8, 14 * 8, DARK, pad=48)
    svg_png(j('scene.svg'), q('scene.png'), 1200, 500)
    svg_png(j('scene.svg'), q('scene@2x.png'), 2400, 1000)
    if shutil.which('magick'):
        rows = []
        for bg, tag in ((LIGHT, 'l'), (DARK, 'd')):
            row = []
            for sz, zoom in ((16, 800), (32, 400), (64, 200)):
                f = os.path.join(TMP, f'fav_{tag}_{sz}.png')
                svg_png(j('favicon.svg'), f, sz, sz, bg, pad=8)
                z = os.path.join(TMP, f'favz_{tag}_{sz}.png')
                subprocess.run(['magick', f, '-filter', 'point', '-resize', f'{zoom}%', z], check=True)
                row.append(z)
            r = os.path.join(TMP, f'favrow_{tag}.png')
            subprocess.run(['magick'] + row + ['+append', r], check=True)
            rows.append(r)
        subprocess.run(['magick'] + rows + ['-append', q('favicon-sizes-zoomed.png')], check=True)


if __name__ == '__main__':
    assets()
    og()
    previews()
    sheet()
    print('rendered into', B)
