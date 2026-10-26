"""pixiso: a tiny isometric pixel-art engine.

Art is drawn on an integer pixel grid. Isometric axes use the true 2:1
pixel ratio: +x moves (+2, +1), +y moves (-2, +1), +z moves (0, -1).
Faces are rasterised by sampling pixel centres, so 2:1 edges come out as
clean 2-pixel stairs. Output is SVG made of merged rectangles (crispEdges)
or a nearest-neighbour PNG for previews.
"""
import math
import struct
import zlib


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x]
        return None

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def copy(self):
        c = Canvas(self.w, self.h)
        c.px = [row[:] for row in self.px]
        return c

    # --- primitives -------------------------------------------------------
    def poly(self, pts, c, only=None):
        """Fill polygon (any simple polygon) by pixel-centre sampling.
        only: optional predicate(x, y, current) restricting which pixels are painted."""
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x0, x1 = max(0, int(math.floor(min(xs)))), min(self.w - 1, int(math.ceil(max(xs))))
        y0, y1 = max(0, int(math.floor(min(ys)))), min(self.h - 1, int(math.ceil(max(ys))))
        n = len(pts)
        for y in range(y0, y1 + 1):
            cy = y + 0.5
            # scanline intersections
            xints = []
            for i in range(n):
                ax, ay = pts[i]
                bx, by = pts[(i + 1) % n]
                if (ay <= cy < by) or (by <= cy < ay):
                    xints.append(ax + (cy - ay) * (bx - ax) / (by - ay))
            xints.sort()
            for k in range(0, len(xints) - 1, 2):
                xa, xb = xints[k], xints[k + 1]
                # pixel centre cx in [xa, xb)
                start = int(math.ceil(xa - 0.5))
                end = int(math.ceil(xb - 0.5)) - 1
                for x in range(max(start, x0), min(end, x1) + 1):
                    if only is None or only(x, y, self.px[y][x]):
                        self.px[y][x] = c

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, c)

    def mask_fill(self, mask, c):
        for (x, y) in mask:
            self.set(x, y, c)

    def stamp(self, rows, x, y, cmap):
        """Paint an ASCII sprite. rows: list of strings; cmap: char -> colour (None/absent = skip)."""
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                col = cmap.get(ch)
                if col is not None:
                    self.set(x + i, y + j, col)

    def overlay(self, other):
        for y in range(self.h):
            for x in range(self.w):
                if other.px[y][x] is not None:
                    self.px[y][x] = other.px[y][x]

    def bbox(self):
        xs, ys = [], []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is not None:
                    xs.append(x)
                    ys.append(y)
        if not xs:
            return None
        return min(xs), min(ys), max(xs), max(ys)


class Iso:
    """Projection helper. Units: x/y in tiles (2px wide, 1px tall per step), z in pixels."""

    def __init__(self, ox, oy):
        self.ox, self.oy = ox, oy

    def p(self, x, y, z=0):
        return (self.ox + 2 * (x - y), self.oy + (x + y) - z)

    # faces of an axis-aligned box
    def top(self, x0, x1, y0, y1, z):
        return [self.p(x0, y0, z), self.p(x1, y0, z), self.p(x1, y1, z), self.p(x0, y1, z)]

    def face_y(self, x0, x1, y, z0, z1):
        """Plane y=const (faces +y, seen on the lower-left)."""
        return [self.p(x0, y, z1), self.p(x1, y, z1), self.p(x1, y, z0), self.p(x0, y, z0)]

    def face_x(self, x, y0, y1, z0, z1):
        """Plane x=const (faces +x, seen on the lower-right)."""
        return [self.p(x, y0, z1), self.p(x, y1, z1), self.p(x, y1, z0), self.p(x, y0, z0)]

    def box(self, cv, x0, x1, y0, y1, z0, z1, top, left, right):
        if right:
            cv.poly(self.face_x(x1, y0, y1, z0, z1), right)
        if left:
            cv.poly(self.face_y(x0, x1, y1, z0, z1), left)
        if top:
            cv.poly(self.top(x0, x1, y0, y1, z1), top)


# --- output ---------------------------------------------------------------

def _rects_rowfirst(mask_rows, w, h):
    """mask_rows: set of (x,y). Greedy: horizontal runs merged downward."""
    used = set()
    rects = []
    pts = mask_rows
    for y in range(h):
        x = 0
        while x < w:
            if (x, y) in pts and (x, y) not in used:
                x2 = x
                while (x2 + 1, y) in pts and (x2 + 1, y) not in used:
                    x2 += 1
                # extend down
                y2 = y
                while True:
                    ny = y2 + 1
                    if ny >= h:
                        break
                    ok = all(((xx, ny) in pts and (xx, ny) not in used) for xx in range(x, x2 + 1))
                    # require exact run (no extension beyond) to keep it simple
                    if not ok:
                        break
                    y2 = ny
                for yy in range(y, y2 + 1):
                    for xx in range(x, x2 + 1):
                        used.add((xx, yy))
                rects.append((x, y, x2 - x + 1, y2 - y + 1))
                x = x2 + 1
            else:
                x += 1
    return rects


def _rects_colfirst(pts, w, h):
    flipped = {(y, x) for (x, y) in pts}
    r = _rects_rowfirst(flipped, h, w)
    return [(y, x, hh, ww) for (x, y, ww, hh) in r]


def canvas_rects(cv, keys=None):
    """Return {colour: [rects]} choosing the smaller decomposition per colour."""
    groups = {}
    for y in range(cv.h):
        for x in range(cv.w):
            c = cv.px[y][x]
            if c is None:
                continue
            groups.setdefault(c, set()).add((x, y))
    out = {}
    for c, pts in groups.items():
        a = _rects_rowfirst(pts, cv.w, cv.h)
        b = _rects_colfirst(pts, cv.w, cv.h)
        out[c] = a if len(a) <= len(b) else b
    return out


def rects_to_path(rects, ox=0, oy=0):
    parts = []
    for (x, y, w, h) in rects:
        parts.append(f"M{x+ox} {y+oy}h{w}v{h}h-{w}z")
    return "".join(parts)


def svg_layer(cv, palette, attrs="", ox=0, oy=0, order=None):
    """Return SVG <path> elements for a canvas. palette: key -> hex or CSS var expr."""
    rects = canvas_rects(cv)
    keys = order or sorted(rects.keys())
    out = []
    for k in keys:
        if k not in rects:
            continue
        fill = palette[k]
        out.append(f'<path fill="{fill}" d="{rects_to_path(rects[k], ox, oy)}"/>')
    return "".join(out)


def write_png(path, cv, palette, scale=1, bg=None):
    """palette: key -> '#rrggbb' or '#rrggbbaa'. bg: optional '#rrggbb'."""
    def rgba(hexs):
        hexs = hexs.lstrip('#')
        if len(hexs) == 6:
            hexs += 'ff'
        return bytes(int(hexs[i:i + 2], 16) for i in (0, 2, 4, 6))

    cache = {k: rgba(v) for k, v in palette.items()}
    bgc = rgba(bg) if bg else b'\x00\x00\x00\x00'
    W, H = cv.w * scale, cv.h * scale
    raw = bytearray()
    for y in range(cv.h):
        row = bytearray()
        for x in range(cv.w):
            c = cv.px[y][x]
            px = cache[c] if c is not None else bgc
            row += px * scale
        for _ in range(scale):
            raw += b'\x00' + row
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def mask_poly(pts, w=10**6, h=10**6):
    """Return the set of pixels a polygon covers (pixel-centre sampling)."""
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    y0, y1 = int(math.floor(min(ys))), int(math.ceil(max(ys)))
    n = len(pts); out = set()
    for y in range(y0, y1 + 1):
        cy = y + 0.5; xints = []
        for i in range(n):
            ax, ay = pts[i]; bx, by = pts[(i + 1) % n]
            if (ay <= cy < by) or (by <= cy < ay):
                xints.append(ax + (cy - ay) * (bx - ax) / (by - ay))
        xints.sort()
        for k in range(0, len(xints) - 1, 2):
            start = int(math.ceil(xints[k] - 0.5)); end = int(math.ceil(xints[k + 1] - 0.5)) - 1
            for x in range(start, end + 1):
                out.add((x, y))
    return out


def mirror(cv):
    out = Canvas(cv.w, cv.h)
    for y in range(cv.h):
        out.px[y] = cv.px[y][::-1]
    return out


def recolor(cv, mapping):
    out = cv.copy()
    for y in range(cv.h):
        for x in range(cv.w):
            c = cv.px[y][x]
            if c in mapping:
                out.px[y][x] = mapping[c]
    return out


def outline_selective(cv, colmap, default, diag=False):
    """Grow a 1px outline whose colour follows the neighbouring material (key prefix)."""
    out = cv.copy()
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if diag:
        nb += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    for y in range(cv.h):
        for x in range(cv.w):
            if cv.px[y][x] is not None:
                continue
            mats = {}
            for dx, dy in nb:
                c = cv.get(x + dx, y + dy)
                if c is not None:
                    m = c.rstrip('0123456789')
                    mats[m] = mats.get(m, 0) + 1
            if mats:
                m = max(mats.items(), key=lambda kv: kv[1])[0]
                out.px[y][x] = colmap.get(m, default)
    return out
