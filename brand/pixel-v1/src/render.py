"""Render an SVG (or HTML) to PNG with headless Chrome."""
import os, subprocess, sys, tempfile
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
TMP = os.path.join(tempfile.gettempdir(), 'levada-render')
os.makedirs(TMP, exist_ok=True)


def shot(url, out, w, h, transparent=False, budget=None):
    args = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
            f'--screenshot={out}', f'--window-size={w},{h}']
    if transparent:
        args.append('--default-background-color=00000000')
    if budget:
        args.append(f'--virtual-time-budget={budget}')
    args.append(url)
    subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return out


def svg_png(svg, out, w, h, bg=None, pad=0):
    """Place the SVG at exactly w x h (plus padding) on bg (None = transparent)."""
    W, H = w + 2 * pad, h + 2 * pad
    html = (f'<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;padding:0;'
            f'background:{bg or "transparent"};}}img{{display:block;position:absolute;left:{pad}px;top:{pad}px;'
            f'width:{w}px;height:{h}px}}</style></head><body><img src="file://{os.path.abspath(svg)}"></body></html>')
    fd, path = tempfile.mkstemp(suffix='.html', dir=TMP)
    with os.fdopen(fd, 'w') as f:
        f.write(html)
    shot('file://' + path, os.path.abspath(out), W, H, transparent=bg is None)
    os.remove(path)
    return out


if __name__ == '__main__':
    svg, out, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    bg = sys.argv[5] if len(sys.argv) > 5 else None
    svg_png(svg, out, w, h, bg)
