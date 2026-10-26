"""Levada hero scene: isometric pixel art, 300x125 art px (x4 = 1200x500 viewBox).

Built in the 'pre-mirror' orientation (bridge along +x running down-right) and
mirrored at the end, exactly like the logo mark: the warm Mezo island lands
front-left, the cool Base island back-right, and coins travel up and to the right.
"""
import math, sys, random
sys.path.insert(0, '.')
from pixiso import Canvas, Iso, mask_poly, mirror, write_png
from palette import PAL, TOKENS
from mark import COIN_MAP

W, H = 300, 125
BW, BH = 520, 300          # working canvas (cropped to W x H after centring)

SCENE_PAL = dict(PAL)
SCENE_PAL.update({
    'sea': TOKENS['ink-900'],
    'sea1': '#141F42',      # ripple
    'sea2': '#1E2D5C',      # ripple highlight
    'sh0': '#0E1D3F',       # shallows outer
    'sh1': '#12295A',       # shallows inner
    'shd': '#070B18',       # cast shadow on water
    'foam': '#7FDCE8',
    'foam2': '#D9FFFA',
    'win': '#1B2448',       # window (dark)
    'winl': '#FFD150',      # window (lit)
    'd2': '#D8D2C6', 'd3': '#B3AA9A', 'd4': '#857C6E',   # dock planks (warm grey)
    'l1': '#B8F5E2', 'l2': '#7FE3C4', 'l3': '#3FBF9F', 'l4': '#23917E',  # foliage
    'spk': '#FFFFFF',
})

COIN8 = [
    "..DDDD..",
    ".DhwllD.",
    "DhwlllbD",
    "DhlllbbD",
    "DllbbbdD",
    "DlbbbddD",
    ".DbdddD.",
    "..DDDD..",
]

SPARKLE = [
    "...w...",
    "...w...",
    "..hwh..",
    "wwwwwww",
    "..hwh..",
    "...w...",
    "...w...",
]
SPARKLE_SMALL = [
    ".w.",
    "www",
    ".w.",
]
SPARK_MAP = {'w': 'spk', 'h': 'g1'}


def mat_box(cv, iso, x0, x1, y0, y1, z0, z1, m, rim=True, top=None, left=None, right=None):
    t = top or m + '2'
    l = left or m + '3'
    r = right or m + '4'
    iso.box(cv, x0, x1, y0, y1, z0, z1, t, l, r)
    if rim:
        tm = mask_poly(iso.top(x0, x1, y0, y1, z1))
        for (x, y) in tm:
            if (x, y + 1) not in tm:
                cv.set(x, y, m + '1')


def arch_block(cv, iso, xa, xb, y0, y1, zb, zt, arches, zs, m='s', steps=96, ring_w=0):
    """Solid block xa..xb / y0..y1 / zb..zt with several arch openings cut from below.
    arches: list of (a0, a1); semicircle rise derived from span (true iso proportion)."""
    def opening(y, a0, a1, rise, e=0.0):
        a0 -= e; a1 += e
        pts = [iso.p(a0, y, zb - 80)]
        for i in range(steps + 1):
            x = a0 + (a1 - a0) * i / steps
            t = (x - a0) / (a1 - a0)
            pts.append(iso.p(x, y, zs + rise * math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2))))
        pts.append(iso.p(a1, y, zb - 80))
        return pts
    fo, bo, ro = set(), set(), set()
    for (a0, a1) in arches:
        rise = (a1 - a0) / 2 * 2.2
        fo |= mask_poly(opening(y1, a0, a1, rise))
        bo |= mask_poly(opening(y0, a0, a1, rise))
        if ring_w:
            ro |= mask_poly(opening(y1, a0, a1, rise + ring_w, ring_w / 2))
    region = mask_poly([iso.p(xa, y1, zb), iso.p(xa, y0, zb), iso.p(xa, y0, zt), iso.p(xb, y0, zt),
                        iso.p(xb, y1, zt), iso.p(xb, y1, zb)])
    front = mask_poly(iso.face_y(xa, xb, y1, zb, zt)) - fo
    endf = mask_poly(iso.face_x(xb, y0, y1, zb, zt))
    top = mask_poly(iso.top(xa, xb, y0, y1, zt))
    for p in (fo - bo) & region:
        cv.set(*p, m + '5')
    for p in endf:
        cv.set(*p, m + '4')
    for p in front:
        cv.set(*p, m + '3')
    if ring_w:
        for p in (ro & front):
            cv.set(*p, m + '2')
    for p in top:
        cv.set(*p, m + '2')
    for (x, y) in top:
        if (x, y + 1) not in top:
            cv.set(x, y, m + '1')
    return fo, bo


def tree(cv, iso, x, y, z0, h=6, c=2.0):
    cv.poly(iso.face_y(x - 0.3, x + 0.3, y + 0.3, z0, z0 + h - 2), 'd4')
    mat_box(cv, iso, x - c / 2, x + c / 2, y - c / 2, y + c / 2, z0 + h - 2, z0 + h + 3, 'l', rim=True)


def prism(cv, iso, poly, z0, z1, top, lit, shade, rim=None):
    """Extruded plan polygon (x,y list, counter-clockwise or not). Draw visible side faces then top."""
    n = len(poly)
    # centroid to decide outward normals
    cx = sum(p[0] for p in poly) / n
    cy = sum(p[1] for p in poly) / n
    sides = []
    for i in range(n):
        (ax, ay), (bx, by) = poly[i], poly[(i + 1) % n]
        ex, ey = bx - ax, by - ay
        nx, ny = ey, -ex
        mx, my = (ax + bx) / 2 - cx, (ay + by) / 2 - cy
        if nx * mx + ny * my < 0:
            nx, ny = -nx, -ny
        if nx + ny > 1e-9:            # faces toward the viewer (+x/+y)
            col = lit if ny >= nx else shade
            sides.append(((ax, ay), (bx, by), col, ax + ay + bx + by))
    for (a, b, col, _) in sorted(sides, key=lambda t: t[3]):
        cv.poly([iso.p(a[0], a[1], z1), iso.p(b[0], b[1], z1), iso.p(b[0], b[1], z0), iso.p(a[0], a[1], z0)], col)
    tp = [iso.p(x, y, z1) for (x, y) in poly]
    cv.poly(tp, top)
    if rim:
        tm = mask_poly(tp)
        for (x, y) in tm:
            if (x, y + 1) not in tm:
                cv.set(x, y, rim)


def flat_house(cv, iso, x0, x1, y0, y1, z0, h, roof='c', wall='s', door=True, lit=(True, True)):
    z1 = z0 + h
    mat_box(cv, iso, x0, x1, y0, y1, z0, z1, wall, rim=False)
    # windows: one on each visible face
    xm, ym = (x0 + x1) / 2, (y0 + y1) / 2
    if lit[0]:
        cv.poly(iso.face_x(x1, ym - 0.7, ym + 0.7, z0 + 2.5, z0 + 5), 'winl')
    if door:
        cv.poly(iso.face_y(xm - 0.6, xm + 0.6, y1, z0, z0 + 4), 'win')
        if lit[1]:
            cv.poly(iso.face_y(x0 + 0.6, x0 + 1.6, y1, z0 + 2.5, z0 + 5), 'winl')
    # flat roof slab with overhang
    mat_box(cv, iso, x0 - 0.4, x1 + 0.4, y0 - 0.4, y1 + 0.4, z1, z1 + 2, roof, rim=False, top=roof + '3', left=roof + '4', right=roof + '5')
    tm = mask_poly(iso.top(x0 - 0.4, x1 + 0.4, y0 - 0.4, y1 + 0.4, z1 + 2))
    for (x, y) in tm:
        if (x, y + 1) not in tm:
            cv.set(x, y, roof + '2')


def build():
    cv_w = Canvas(BW, BH)       # water decoration (under land)
    cv_l = Canvas(BW, BH)       # land / structures
    iso = Iso(BW // 2 - 40, 90)
    layers = {}

    def L(name):
        if name not in layers:
            layers[name] = Canvas(BW, BH)
        return layers[name]

    # ---- layout (tile units) ----
    B = dict(x0=0, x1=17, y0=-3, y1=23, z=12)      # Base island (cool, home)
    M = dict(x0=43, x1=60, y0=-20, y1=7, z=14)     # Mezo island (warm, source)
    by0, by1 = 0, 4                                # aqueduct band
    deck = 40
    T = 5

    # ---- water: shallows ----
    def shallows(x0, x1, y0, y1, pad1=2.5, pad2=1.0):
        for p in mask_poly(iso.top(x0 - pad1, x1 + pad1, y0 - pad1, y1 + pad1, 0)):
            cv_w.set(*p, 'sh0')
        for p in mask_poly(iso.top(x0 - pad2, x1 + pad2, y0 - pad2, y1 + pad2, 0)):
            cv_w.set(*p, 'sh1')
    shallows(B['x0'], B['x1'], B['y0'], B['y1'])
    shallows(M['x0'], M['x1'], M['y0'], M['y1'])

    # ---- aqueduct ----
    xa, xb = 11.5, 45
    piers = []
    gap0, gap1 = B['x1'], M['x0']                  # strait 17..43 (26 units)
    n_arch = 3
    pw = 2.0
    span = (gap1 - gap0 - pw * (n_arch - 1)) / n_arch
    arches = []
    a = gap0
    for i in range(n_arch):
        arches.append((a, a + span))
        a += span + pw
    zs = deck - T - span / 2 * 2.2
    for (a0, a1) in arches[:-1]:
        shallows(a1, a1 + pw, by0, by1, pad1=1.5, pad2=0.6)
    fo, bo = arch_block(cv_l, iso, xa, xb, by0, by1, 0, deck, arches, zs, ring_w=1.5)
    # water channel on the deck
    ch = mask_poly(iso.top(xa, xb, by0 + 1.3, by1 - 1.3, deck))
    for p in ch:
        cv_l.set(*p, 'a2')
    for (x, y) in ch:
        if (x, y - 1) not in ch:
            cv_l.set(x, y, 'a1')

    # ---- Base island (drawn after the aqueduct? no: it is behind-left; aqueduct sits on it) ----
    # Redraw order: island first, then aqueduct portion over it. So build islands on a fresh canvas
    base_cv = Canvas(BW, BH)
    mat_box(base_cv, iso, B['x0'], B['x1'], B['y0'], B['y1'], 0, B['z'], 'c')
    # foam at the waterline of the visible faces
    for (x, y) in mask_poly(iso.face_y(B['x0'], B['x1'], B['y1'], 0, 1)) | mask_poly(iso.face_x(B['x1'], B['y0'], B['y1'], 0, 1)):
        base_cv.set(x, y, 'foam')
    def strata(cv, I, m):
        for zz in (I['z'] // 2,):
            for p in mask_poly(iso.face_y(I['x0'], I['x1'], I['y1'], zz, zz + 1)):
                cv.set(*p, m + '4')
            for p in mask_poly(iso.face_x(I['x1'], I['y0'], I['y1'], zz, zz + 1)):
                cv.set(*p, m + '5')
    strata(base_cv, B, 'c')
    mezo_cv = Canvas(BW, BH)
    mat_box(mezo_cv, iso, M['x0'], M['x1'], M['y0'], M['y1'], 0, M['z'], 'w')
    for (x, y) in mask_poly(iso.face_y(M['x0'], M['x1'], M['y1'], 0, 1)) | mask_poly(iso.face_x(M['x1'], M['y0'], M['y1'], 0, 1)):
        mezo_cv.set(x, y, 'foam')
    strata(mezo_cv, M, 'w')

    # ---- Base island structures (painter order: back to front) ----
    bs = Canvas(BW, BH)
    # cistern tower where the aqueduct arrives (the 'Base vault')
    cx0, cx1, cy0, cy1 = 7, 12, -1.5, 5.5
    mat_box(bs, iso, cx0, cx1, cy0, cy1, B['z'], deck + 6, 's', rim=False)
    # tide band + cap
    for p in mask_poly(iso.face_y(cx0, cx1, cy1, deck + 1, deck + 3)) | mask_poly(iso.face_x(cx1, cy0, cy1, deck + 1, deck + 3)):
        bs.set(*p, 'c3')
    mat_box(bs, iso, cx0 - 0.5, cx1 + 0.5, cy0 - 0.5, cy1 + 0.5, deck + 6, deck + 8, 'c', rim=True)
    # windows on the cistern
    for zz in (B['z'] + 6, B['z'] + 14):
        bs.poly(iso.face_y(cx0 + 1.6, cx1 - 1.6, cy1, zz, zz + 4), 'win')
    # houses (modern flat roofs) along the harbour side + a tree on the plaza
    flat_house(bs, iso, 1.5, 6.0, 4.5, 9.0, B['z'], 7, roof='c')
    flat_house(bs, iso, 1.5, 6.0, 11.0, 15.0, B['z'], 6, roof='c')
    tree(bs, iso, 11.5, 13.0, B['z'], h=6)
    # lighthouse: the keeper's beacon, on the harbour corner
    lx, ly, r_ = 3.6, 19.6, 1.5
    zt = B['z'] + 17
    mat_box(bs, iso, lx - r_, lx + r_, ly - r_, ly + r_, B['z'], zt, 's', rim=False)
    for zz in (B['z'] + 4, B['z'] + 10):
        fy = mask_poly(iso.face_y(lx - r_, lx + r_, ly + r_, zz, zz + 3))
        fx = mask_poly(iso.face_x(lx + r_, ly - r_, ly + r_, zz, zz + 3))
        for p in fy:
            bs.set(*p, 'c3')
        for p in fx:
            bs.set(*p, 'c4')
    # gallery
    mat_box(bs, iso, lx - 2.0, lx + 2.0, ly - 2.0, ly + 2.0, zt, zt + 1, 'c', rim=False, top='c2', left='c4', right='c5')
    # lamp (animated layer) + cap
    beacon = L('beacon')
    mat_box(beacon, iso, lx - 1.2, lx + 1.2, ly - 1.2, ly + 1.2, zt + 1, zt + 4, 'g', rim=False, top='g0', left='g1', right='g2')
    cap = Canvas(BW, BH)
    mat_box(cap, iso, lx - 1.7, lx + 1.7, ly - 1.7, ly + 1.7, zt + 4, zt + 5.5, 'c', rim=True)
    for y_ in range(BH):
        for x_ in range(BW):
            if cap.px[y_][x_] is not None:
                beacon.set(x_, y_, None)
    bs.overlay(cap)

    # dock on the harbour side (+y face) + moored boat
    dock = Canvas(BW, BH)
    for py in (25.5, 28.5):
        for px in (7.4, 9.6):
            dock.poly(iso.face_y(px - 0.3, px + 0.3, py + 0.3, 0, 3.5), 'd4')
    mat_box(dock, iso, 7, 10, B['y1'] - 0.5, 29.5, 3, 4, 'd', rim=False, top='d2', left='d3', right='d4')
    boat = L('boat')
    hull = [(11.2, 24.6), (13.8, 24.6), (13.8, 29.2), (12.5, 31.0), (11.2, 29.2)]
    prism(boat, iso, hull, 0, 2.2, 's2', 's3', 's4', rim='s1')
    # tide stripe at the waterline
    prism(boat, iso, hull, 0, 0.9, 'c3', 'c3', 'c4')
    boat.poly([iso.p(x, y, 2.2) for (x, y) in hull], 's2')
    tm = mask_poly([iso.p(x, y, 2.2) for (x, y) in hull])
    for (x, y) in tm:
        if (x, y + 1) not in tm:
            boat.set(x, y, 's1')
    mx = 12.5
    boat.poly(iso.face_x(mx, 26.6, 27.0, 2.2, 15.5), 'd4')
    boat.poly([iso.p(mx, 27.1, 15), iso.p(mx, 27.1, 4.0), iso.p(mx, 30.4, 4.0)], 's1')
    boat.poly([iso.p(mx, 26.5, 13.5), iso.p(mx, 26.5, 4.5), iso.p(mx, 24.4, 4.5)], 's3')

    # ---- Mezo island structures ----
    ms = Canvas(BW, BH)
    # raised terrace at the back
    mat_box(ms, iso, 50, 59, -19, -9, M['z'], M['z'] + 6, 'w')
    mat_box(ms, iso, 53, 58, -18, -13, M['z'] + 6, M['z'] + 10, 'w')
    # the vault (where the yield is minted into the channel)
    vx0, vx1, vy0, vy1 = 44.5, 53, -2.5, 6
    vz1 = deck + 4
    mat_box(ms, iso, vx0, vx1, vy0, vy1, M['z'], vz1, 's', rim=False)
    # ember plinth + cornice
    for p in mask_poly(iso.face_y(vx0, vx1, vy1, M['z'], M['z'] + 3)) | mask_poly(iso.face_x(vx1, vy0, vy1, M['z'], M['z'] + 3)):
        ms.set(*p, 'w4')
    mat_box(ms, iso, vx0 - 0.6, vx1 + 0.6, vy0 - 0.6, vy1 + 0.6, vz1, vz1 + 3, 'w', rim=True)
    # stepped ember roof with a gold finial: the treasury silhouette
    mat_box(ms, iso, vx0 + 1.0, vx1 - 1.0, vy0 + 1.0, vy1 - 1.0, vz1 + 3, vz1 + 5, 'w', rim=True, top='w2', left='w4', right='w5')
    mat_box(ms, iso, vx0 + 2.5, vx1 - 2.5, vy0 + 2.5, vy1 - 2.5, vz1 + 5, vz1 + 7, 'w', rim=True, top='w2', left='w4', right='w5')
    fx, fy = (vx0 + vx1) / 2, (vy0 + vy1) / 2
    mat_box(ms, iso, fx - 0.7, fx + 0.7, fy - 0.7, fy + 0.7, vz1 + 7, vz1 + 10, 'g', rim=False, top='g1', left='g3', right='g4')
    # round vault door on the +y face (ellipse in face coords)
    dcx, dcz, dr = (vx0 + vx1) / 2, M['z'] + 12, 3.0
    door_outer, door_inner, hub = set(), set(), set()
    for ix in range(BW):
        pass
    face = mask_poly(iso.face_y(vx0, vx1, vy1, M['z'], vz1))
    for (px_, py_) in face:
        # invert projection on plane y = vy1: sx = ox + 2(x - y), sy = oy + x + y - z
        xx = (px_ + 0.5 - iso.ox) / 2 + vy1
        zz = iso.oy + xx + vy1 - (py_ + 0.5)
        d = math.hypot((xx - dcx) * 2.2, zz - dcz)
        if d <= dr * 2.2:
            door_outer.add((px_, py_))
        if d <= dr * 2.2 - 2.2:
            door_inner.add((px_, py_))
        if d <= 1.6:
            hub.add((px_, py_))
        # spokes
        if d < dr * 2.2 - 2.2 and (abs((xx - dcx) * 2.2) < 0.55 or abs(zz - dcz) < 0.55):
            hub.add((px_, py_))
    for p in door_outer:
        ms.set(*p, 'g4')
    for p in door_inner:
        ms.set(*p, 's4')
    for p in hub:
        ms.set(*p, 'g2')
    # gold ingots stacked by the vault
    for (gx, gy, gz) in ((54.5, 3.0, 0), (56.5, 3.0, 0), (55.5, 3.0, 2)):
        mat_box(ms, iso, gx, gx + 1.8, gy, gy + 3, M['z'] + gz, M['z'] + gz + 2, 'g', rim=True)

    # ---- coins riding the channel ----
    cy = (by0 + by1) / 2
    coin_xs = [37.0, 29.0, 21.0]
    coin_pos = []
    for i, cxu in enumerate(coin_xs):
        lay = L('coin-%d' % (i + 1))
        sx, sy = iso.p(cxu, cy, deck)
        x0 = int(round(sx)) - 4
        y0 = int(round(sy)) - 8 + 1
        lay.stamp(COIN8, x0, y0, COIN_MAP)
        coin_pos.append((x0, y0))
    # sparkle over the cistern
    spk = L('sparkle')
    sx, sy = iso.p((cx0 + cx1) / 2, (cy0 + cy1) / 2, deck + 8)
    spk.stamp(SPARKLE, int(round(sx)) - 3, int(round(sy)) - 14, SPARK_MAP)
    # two small yield glints: over the middle coin and over the vault
    g1 = L('glint-1')
    sx, sy = iso.p(29.0, cy, deck)
    g1.stamp(SPARKLE_SMALL, int(round(sx)) + 5, int(round(sy)) - 14, SPARK_MAP)
    g2 = L('glint-2')
    sx, sy = iso.p((vx0 + vx1) / 2, (vy0 + vy1) / 2, vz1 + 10)
    g2.stamp(SPARKLE_SMALL, int(round(sx)) - 6, int(round(sy)) - 6, SPARK_MAP)

    # ---- compose land in painter's order ----
    land = Canvas(BW, BH)
    land.overlay(base_cv)
    land.overlay(bs)
    land.overlay(dock)
    land.overlay(cv_l)        # aqueduct over the strait (in front of base structures? it attaches at the cistern)
    land.overlay(mezo_cv)
    land.overlay(ms)
    return dict(iso=iso, water=cv_w, land=land, layers=layers, B=B, M=M, deck=deck, by=(by0, by1),
                arches=arches, xa=xa, xb=xb, coin_pos=coin_pos)


def flatten(parts, crop):
    x0, y0 = crop
    out = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            out.px[y][x] = 'sea'
    for cv in [parts['water'], parts['land']] + list(parts['layers'].values()):
        for y in range(H):
            for x in range(W):
                c = cv.get(x + x0, y + y0)
                if c is not None:
                    out.px[y][x] = c
    return mirror(out)


def auto_crop(parts, dx=0, dy=0):
    bb = parts['land'].bbox()
    bx0, by0, bx1, by1 = bb
    cx = (bx0 + bx1) / 2
    cy = (by0 + by1) / 2
    return int(round(cx - W / 2)) + dx, int(round(cy - H / 2)) + dy

def ripples(flat, seed=7, step=(14, 7), keep=3):
    """Scatter short 2:1 ripple dashes on open sea (post-mirror canvas). Returns a Canvas layer."""
    rnd = random.Random(seed)
    lay = Canvas(W, H)
    occ = set((x, y) for y in range(H) for x in range(W) if flat.px[y][x] != 'sea')
    sx, sy = step
    for gy in range(2, H - 2, sy):
        off = (gy // sy) % 2 * (sx // 2)
        for gx in range(2 + off, W - 4, sx):
            x = gx + rnd.randint(-3, 3)
            y = gy + rnd.randint(-2, 2)
            if rnd.random() < 0.42:
                continue
            ln = rnd.choice((2, 2, 3, 4))
            cells = [(x + i, y) for i in range(ln)]
            near = any((cx + dx, cy + dy) in occ for (cx, cy) in cells for dx in range(-keep, keep + 1) for dy in (-2, -1, 0, 1, 2))
            if near:
                continue
            col = 'sea2' if ln >= 4 and rnd.random() < 0.5 else 'sea1'
            for c in cells:
                lay.set(*c, col)
    return lay
