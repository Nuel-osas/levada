import math, sys
sys.path.insert(0, '.')
from pixiso import Canvas, Iso, write_png, mask_poly, mirror, recolor
from palette import PAL

COIN10 = [
    "...DDDD...",
    ".DDhhllDD.",
    ".DhwhllbD.",
    "DhwhllbbbD",
    "DhhllbbbdD",
    "DlllbbbbdD",
    "DllbbbbddD",
    ".DbbbbddD.",
    ".DDddddDD.",
    "...DDDD...",
]
COIN12 = [
    "....DDDD....",
    "..DDhhllDD..",
    ".DhhwhlllbD.",
    ".DhwhllllbD.",
    "DhhhllllbbbD",
    "DhllllbbbbdD",
    "DlllllbbbbdD",
    "DllllbbbbddD",
    ".DlbbbbbddD.",
    ".DbbbbbdddD.",
    "..DDddddDD..",
    "....DDDD....",
]
COIN6 = [
    ".DDDD.",
    "DhwllD",
    "DhllbD",
    "DlbbdD",
    "DbbddD",
    ".DDDD.",
]
COIN_MAP = {'D': 'g5', 'd': 'g4', 'b': 'g3', 'l': 'g2', 'h': 'g1', 'w': 'g0'}


def box(cv, iso, x0, x1, y0, y1, z0, z1, m, rim=True):
    top, left, right = m + '2', m + '3', m + '4'
    iso.box(cv, x0, x1, y0, y1, z0, z1, top, left, right)
    if rim:
        tm = mask_poly(iso.top(x0, x1, y0, y1, z1))
        for (x, y) in tm:
            if (x, y + 1) not in tm:
                cv.set(x, y, m + '1')


def aqueduct(cv, iso, xa, xb, ax0, ax1, y0, y1, zb, zt, H, m='s', steps=160, channel='a2', ch_w=None,
             ring_w=0, ring_tone='4', ch_hi=None):
    def arch(a0, a1, rise):
        def f(x):
            t = (x - a0) / (a1 - a0)
            return zb + rise * math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2))
        return f

    def opening(y, a0, a1, rise):
        f = arch(a0, a1, rise)
        pts = [iso.p(a0, y, zb - 60)]
        for i in range(steps + 1):
            x = a0 + (a1 - a0) * i / steps
            pts.append(iso.p(x, y, f(x)))
        pts.append(iso.p(a1, y, zb - 60))
        return pts
    fo = mask_poly(opening(y1, ax0, ax1, H))
    bo = mask_poly(opening(y0, ax0, ax1, H))
    front = mask_poly(iso.face_y(xa, xb, y1, zb, zt)) - fo
    endf = mask_poly(iso.face_x(xb, y0, y1, zb, zt))
    top = mask_poly(iso.top(xa, xb, y0, y1, zt))
    region = mask_poly([iso.p(xa, y1, zb), iso.p(xa, y0, zb), iso.p(xa, y0, zt), iso.p(xb, y0, zt),
                        iso.p(xb, y1, zt), iso.p(xb, y1, zb)])
    for p in (fo - bo) & region:
        cv.set(*p, m + '5')
    for p in endf:
        cv.set(*p, m + '4')
    for p in front:
        cv.set(*p, m + '3')
    if ring_w:
        e = ring_w / 2.0
        ro = mask_poly(opening(y1, ax0 - e, ax1 + e, H + ring_w))
        for p in (ro & front):
            cv.set(*p, m + ring_tone)
    for p in top:
        cv.set(*p, m + '2')
    for (x, y) in top:
        if (x, y + 1) not in top:
            cv.set(x, y, m + '1')
    if channel:
        w = ch_w if ch_w is not None else (y1 - y0) / 3
        ym0, ym1 = (y0 + y1) / 2 - w / 2, (y0 + y1) / 2 + w / 2
        cm = mask_poly(iso.top(xa, xb, ym0, ym1, zt))
        for p in cm:
            cv.set(*p, channel)
        if ch_hi:
            for (x, y) in cm:
                if (x, y - 1) not in cm:
                    cv.set(x, y, ch_hi)
    return top


def outline(cv, col, diag=False):
    out = cv.copy()
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if diag:
        nb += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    for y in range(cv.h):
        for x in range(cv.w):
            if cv.px[y][x] is None:
                if any(cv.get(x + dx, y + dy) is not None for dx, dy in nb):
                    out.px[y][x] = col
    return out


def build_mark(N=64, P=6, G=10, PH=9, H=11, T=4, bw=4, ab=2, ch_w=None, coin=COIN10, coin_gap=1,
               xoff=0, yoff=0, line=None, coin_dx=0, ring_w=0, ring_tone='4', ch_hi=None):
    """Two islands joined by a one-arch aqueduct, a coin on the crown.
    Built in the x-axis orientation then mirrored, so the warm (source) island lands front-left
    and the cool (home) island back-right: the coin's path reads up and to the right."""
    cv = Canvas(N, N)
    L = 2 * P + G
    W = 2 * (L + P)
    Dz = PH + H + T
    cw = len(coin[0]); ch = len(coin)
    iso = Iso(0, 0)
    apex = iso.p(L / 2, P / 2, Dz)
    pts_y = [apex[1] - ch - coin_gap, iso.p(0, 0, PH)[1], iso.p(P - ab, (P - bw) / 2, Dz)[1], iso.p(L, P, 0)[1]]
    pts_x = [iso.p(0, P, 0)[0], iso.p(L, 0, 0)[0]]
    top_y, bot_y = min(pts_y), max(pts_y)
    left_x, right_x = min(pts_x), max(pts_x)
    ox = int(round((N - (right_x - left_x)) / 2 - left_x)) + xoff
    oy = int(round((N - (bot_y - top_y)) / 2 - top_y)) + yoff
    iso = Iso(ox, oy)
    y0, y1 = (P - bw) / 2, (P + bw) / 2
    box(cv, iso, 0, P, 0, P, 0, PH, 'c')               # mirrored -> back-right (home / Base)
    aqueduct(cv, iso, P - ab, P + G + ab, P, P + G, y0, y1, PH, Dz, H, ch_w=ch_w, ring_w=ring_w, ring_tone=ring_tone, ch_hi=ch_hi)
    box(cv, iso, P + G, L, 0, P, 0, PH, 'w')           # mirrored -> front-left (source / Mezo)
    sx, sy = iso.p(L / 2, P / 2, Dz)
    # coin: bottom edge sits coin_gap px above the deck crown. Place pre-mirror; mirror flips it, so stamp flipped
    cx0 = int(round(sx - cw / 2))
    cy0 = int(round(sy)) - ch - coin_gap + 1
    cv2 = mirror(cv)
    cx0m = N - (cx0 + cw) + coin_dx
    cv2.stamp(coin, cx0m, cy0, COIN_MAP)
    if line:
        cv2 = outline(cv2, line)
    return cv2


def sheet(cands, fname, pal=PAL, scale=5, bg='#0B1022', gap=4):
    N = max(c.h for c in cands)
    Wt = sum(c.w for c in cands) + gap * (len(cands) - 1)
    big = Canvas(Wt, N)
    x0 = 0
    for cv in cands:
        for y in range(cv.h):
            for x in range(cv.w):
                if cv.px[y][x]:
                    big.set(x + x0, y, cv.px[y][x])
        x0 += cv.w + gap
    write_png(fname, big, pal, scale=scale, bg=bg)
