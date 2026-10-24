"""Export the hero scene to SVG with animatable layers."""
import sys; sys.path.insert(0, '.')
import scene
from pixiso import Canvas, mirror, canvas_rects, rects_to_path

W, H = scene.W, scene.H
PAL = scene.SCENE_PAL
CLASSED = {  # palette keys that get a class so the water can be re-themed when the SVG is inlined
    'sea1': 'ripple', 'sea2': 'ripple-hi', 'sh0': 'shallows-1', 'sh1': 'shallows-2', 'foam': 'foam',
}


def crop_mirror(cv, crop):
    x0, y0 = crop
    out = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            c = cv.get(x + x0, y + y0)
            if c is not None:
                out.px[y][x] = c
    return mirror(out)


def paths(cv, indent='    '):
    rects = canvas_rects(cv)
    out = []
    # stable order: by number of pixels desc (big areas first is irrelevant for non-overlapping colours)
    for k in sorted(rects.keys()):
        cls = CLASSED.get(k)
        c = f' class="{cls}"' if cls else ''
        out.append(f'{indent}<path{c} fill="{PAL[k]}" d="{rects_to_path(rects[k])}"/>')
    return '\n'.join(out)


def build_svg():
    P = scene.build()
    crop = scene.auto_crop(P)
    water = crop_mirror(P['water'], crop)
    land = crop_mirror(P['land'], crop)
    layers = {k: crop_mirror(v, crop) for k, v in P['layers'].items()}
    flat = scene.flatten(P, crop)
    rip = scene.ripples(flat)
    world = Canvas(W, H)
    world.overlay(water)
    world.overlay(land)
    # coin start positions (post-mirror, art px) for docs
    coin_boxes = {k: layers[k].bbox() for k in layers if k.startswith('coin')}
    parts = []
    parts.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="1200" height="500" '
                 'shape-rendering="crispEdges" role="img" aria-labelledby="levada-scene-title levada-scene-desc">')
    parts.append('  <title id="levada-scene-title">Levada: Mezo\'s savings rate, on Base</title>')
    parts.append('  <desc id="levada-scene-desc">Isometric pixel scene. A warm island with a vault (Mezo) is joined to a '
                 'cool island with a harbour (Base) by a three-arch aqueduct. Gold coins ride the water channel '
                 'from the vault to the Base side.</desc>')
    parts.append('  <!-- 1 art pixel = 4 viewBox units. Moving parts: #coin-1..3 (.coin), #sparkle, .glint, '
                 '#boat, #beacon, .ripple. Coins travel up-right along the channel: (+2, -1) art px per step. -->')
    parts.append('  <g transform="scale(4)">')
    parts.append(f'    <rect class="sea" width="{W}" height="{H}" fill="{PAL["sea"]}"/>')
    parts.append('    <g id="ripples" class="ripples">')
    parts.append(paths(rip, '      '))
    parts.append('    </g>')
    parts.append('    <g id="world">')
    parts.append(paths(world, '      '))
    parts.append('    </g>')
    for name, cls in (('boat', 'boat'), ('beacon', 'beacon')):
        parts.append(f'    <g id="{name}" class="{cls}">')
        parts.append(paths(layers[name], '      '))
        parts.append('    </g>')
    parts.append('    <g id="coins">')
    for i in (1, 2, 3):
        parts.append(f'      <g id="coin-{i}" class="coin">')
        parts.append(paths(layers[f"coin-{i}"], '        '))
        parts.append('      </g>')
    parts.append('    </g>')
    parts.append('    <g id="sparkles">')
    parts.append('      <g id="sparkle" class="sparkle">')
    parts.append(paths(layers['sparkle'], '        '))
    parts.append('      </g>')
    for g in ('glint-1', 'glint-2'):
        parts.append(f'      <g id="{g}" class="glint">')
        parts.append(paths(layers[g], '        '))
        parts.append('      </g>')
    parts.append('    </g>')
    parts.append('  </g>')
    parts.append('</svg>')
    svg = '\n'.join(parts) + '\n'
    # flattened preview
    full = flat.copy()
    for y in range(H):
        for x in range(W):
            if rip.px[y][x] and full.px[y][x] == 'sea':
                full.px[y][x] = rip.px[y][x]
    return svg, full, coin_boxes


if __name__ == '__main__':
    svg, full, coin_boxes = build_svg()
    out = sys.argv[1] if len(sys.argv) > 1 else 'scene.svg'
    open(out, 'w').write(svg)
    print('bytes', len(svg.encode()), 'coins', coin_boxes)
