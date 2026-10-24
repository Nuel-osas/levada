"""Build the Levada brand kit: hand-placed isometric pixel art -> crisp SVG.

Run from this folder:  python3 build_brand.py <out_dir>
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixiso import Canvas, canvas_rects, rects_to_path, write_png, mask_poly
from palette import PAL, TOKENS
from mark import build_mark, COIN6, COIN10
from wordmark import word, B as WM, KERN

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(OUT, exist_ok=True)

INK = TOKENS['ink-900']
ON_DARK = TOKENS['stone-100']

# ---- mark recipes ------------------------------------------------------------
MARK64 = dict(N=64, P=6, G=8, PH=11, H=9, T=5, bw=3, coin=COIN10, coin_dx=2, ring_w=2, ring_tone='2', ch_hi='a1', line='k')
ICON64 = dict(N=64, P=5, G=7, PH=9, H=8, T=4, bw=3, coin=COIN10, coin_dx=2, ring_w=2, ring_tone='2', ch_hi='a1', line='k', yoff=-1)
FAV32 = dict(N=32, P=3, G=4, PH=6, H=5, T=3, bw=2, ab=1, coin=COIN6, ch_w=0.67, coin_dx=1, line='k')


def crop(cv, box=None, pad=0):
    x0, y0, x1, y1 = box or cv.bbox()
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
    out = Canvas(x1 - x0 + 1, y1 - y0 + 1)
    for y in range(out.h):
        for x in range(out.w):
            out.px[y][x] = cv.get(x + x0, y + y0)
    return out


def paste(dst, src, ox, oy):
    for y in range(src.h):
        for x in range(src.w):
            c = src.px[y][x]
            if c is not None:
                dst.set(x + ox, y + oy, c)


def body(cv, pal, indent='  '):
    rects = canvas_rects(cv)
    order = sorted(rects.keys(), key=lambda k: -sum(w * h for (_, _, w, h) in rects[k]))
    return '\n'.join(f'{indent}<path fill="{pal[k]}" d="{rects_to_path(rects[k])}"/>' for k in order)


def svg_doc(inner, vw, vh, width, height, title, desc=None, bg=None):
    head = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" width="{width}" height="{height}" '
            f'shape-rendering="crispEdges" role="img" aria-labelledby="t">')
    parts = [head, f'  <title id="t">{title}</title>']
    if desc:
        parts.append(f'  <desc>{desc}</desc>')
    if bg:
        parts.append(f'  <rect width="{vw}" height="{vh}" fill="{bg}"/>')
    parts.append(inner)
    parts.append('</svg>')
    return '\n'.join(parts) + '\n'


def save(name, text):
    p = os.path.join(OUT, name)
    with open(p, 'w') as f:
        f.write(text)
    return p


def build_all():
    pal = dict(PAL)
    files = {}

    # 1. logo mark (64 grid, square canvas, mark centred)
    m64 = build_mark(**MARK64)
    files['logo-mark.svg'] = save('logo-mark.svg', svg_doc(
        body(m64, pal), 64, 64, 256, 256, 'Levada',
        'Levada mark: two isometric islands, ember and tide, joined by a one-arch aqueduct carrying a gold coin.'))

    # 2. favicon (32 grid)
    m32 = build_mark(**FAV32)
    # small-size tune: the arch's inner face reads better as a dark opening at 32px
    for y in range(m32.h):
        for x in range(m32.w):
            if m32.px[y][x] == 's5':
                m32.px[y][x] = 'k'
    files['favicon.svg'] = save('favicon.svg', svg_doc(body(m32, pal), 32, 32, 32, 32, 'Levada'))

    # 3. wordmark
    wm = word(WM, 'LEVADA', track=4, kern=KERN, col='wm')
    for suffix, col in (('', INK), ('-on-dark', ON_DARK)):
        p2 = dict(pal); p2['wm'] = col
        files[f'wordmark{suffix}.svg'] = save(f'wordmark{suffix}.svg', svg_doc(
            body(wm, p2), wm.w, wm.h, wm.w * 4, wm.h * 4, 'Levada'))

    # 4. horizontal lockup: 32-grid mark + wordmark on the same pixel grid
    mk = crop(m32)
    gap = 9
    pad = 0
    lw = mk.w + gap + wm.w
    lh = max(mk.h, wm.h)
    lock = Canvas(lw, lh)
    paste(lock, mk, 0, (lh - mk.h) // 2)
    wy = (mk.h - wm.h) // 2 + 1        # optical centre: the coin is light, so sit the type 1px low
    paste(lock, wm, mk.w + gap, wy)
    for suffix, col in (('', INK), ('-on-dark', ON_DARK)):
        p2 = dict(pal); p2['wm'] = col
        files[f'lockup{suffix}.svg'] = save(f'lockup{suffix}.svg', svg_doc(
            body(lock, p2), lw, lh, lw * 4, lh * 4, 'Levada'))

    # 5. stacked logo: 64-grid mark over the wordmark
    mb = crop(m64)
    sg = 8
    sw = max(mb.w, wm.w)
    sh = mb.h + sg + wm.h
    st = Canvas(sw, sh)
    paste(st, mb, (sw - mb.w) // 2, 0)
    paste(st, wm, (sw - wm.w) // 2, mb.h + sg)
    for suffix, col in (('', INK), ('-on-dark', ON_DARK)):
        p2 = dict(pal); p2['wm'] = col
        files[f'logo{suffix}.svg'] = save(f'logo{suffix}.svg', svg_doc(
            body(st, p2), sw, sh, sw * 4, sh * 4, 'Levada'))

    # 6. app icon (64 grid tile, full bleed) -> rendered to 512 later
    ic = Canvas(64, 64)
    p2 = dict(pal); p2.update({'bg': INK, 'b1': TOKENS['ink-800'], 'b2': '#161F42'})
    for y in range(64):
        for x in range(64):
            ic.px[y][x] = 'bg'
            cx, cy = 32, 45
            if ((x + 0.5 - cx) / 27) ** 2 + ((y + 0.5 - cy) / 13.5) ** 2 <= 1:
                ic.px[y][x] = 'b1'
            if ((x + 0.5 - cx) / 18) ** 2 + ((y + 0.5 - cy) / 9) ** 2 <= 1:
                ic.px[y][x] = 'b2'
    mi = build_mark(**ICON64)
    paste(ic, mi, 0, 0)
    files['icon.svg'] = save('icon.svg', svg_doc(body(ic, p2), 64, 64, 512, 512, 'Levada'))

    return files, dict(m64=m64, m32=m32, wm=wm, lock=lock, stack=st, icon=ic, pal=pal, icon_pal=p2)


if __name__ == '__main__':
    files, art = build_all()
    for k, v in files.items():
        print(f'{k:24s} {os.path.getsize(v):7d} bytes')
    print('lockup', art['lock'].w, art['lock'].h, 'stack', art['stack'].w, art['stack'].h, 'wm', art['wm'].w, art['wm'].h)
