import sys; sys.path.insert(0, '.')
from palette import TOKENS as T

GROUPS = [
    ('Ember: warm, the source side (Bitcoin / Mezo). Orange-red, never raspberry.', 'ember', ['50','100','200','300','400','500','600','700','800']),
    ('Tide: cool, the home side (Base). Cobalt-periwinkle, not Base blue #0052FF.', 'tide', ['50','100','200','300','400','500','600','700','800']),
    ('Gold: yield. Coins, rates and earnings only.', 'gold', ['100','200','300','400','500','600']),
    ('Aqua: water and flow (the channel).', 'aqua', ['100','200','300','400','500','600']),
    ('Stone: the aqueduct; light neutrals in illustration.', 'stone', ['50','100','200','300','400','500']),
    ('Ink: dark neutrals.', 'ink', ['950','900','800','700','600','500','400','300','200','100']),
    ('Paper: light neutrals.', 'paper', ['0','50','100','200','300','500']),
]
EXTRA = {'gold-700': '#8A4A12'}

LIGHT = [
    ('Surfaces', [
        ('bg', 'var(--lv-paper-50)', 'page'),
        ('surface', 'var(--lv-paper-0)', 'cards, inputs'),
        ('surface-2', 'var(--lv-paper-100)', 'wells, table stripes'),
        ('border', 'var(--lv-paper-200)', 'decorative dividers'),
        ('border-strong', '#857F71', 'input and control outlines, 3.8:1 on bg'),
    ]),
    ('Text (contrast on --lv-bg)', [
        ('text', 'var(--lv-ink-900)', '17.8:1'),
        ('text-muted', '#4A5274', '7.2:1'),
        ('text-subtle', '#5F6788', '5.2:1'),
        ('text-warm', 'var(--lv-ember-700)', '7.4:1, source / Mezo'),
        ('text-cool', 'var(--lv-tide-600)', '7.1:1, home / Base, links'),
        ('text-yield', 'var(--lv-gold-700)', '6.5:1, APR and earnings'),
        ('text-success', '#13795B', '5.1:1'),
        ('text-danger', '#C8102E', '5.6:1'),
    ]),
    ('Fills', [
        ('accent', 'var(--lv-tide-500)', 'primary button'),
        ('accent-hover', 'var(--lv-tide-600)', ''),
        ('on-accent', '#FFFFFF', '4.9:1 on tide-500'),
        ('warm', 'var(--lv-ember-500)', 'warm fills; never for errors'),
        ('on-warm', 'var(--lv-ink-900)', '5.6:1'),
        ('yield', 'var(--lv-gold-400)', 'yield chip'),
        ('on-yield', 'var(--lv-ink-900)', '10.8:1'),
        ('water', 'var(--lv-aqua-400)', 'progress, flow lines'),
        ('focus', 'var(--lv-tide-500)', 'focus ring, 4.7:1 on bg'),
        ('pixel-shadow', 'var(--lv-ink-900)', 'hard offset shadow colour'),
        ('shadow-pixel', '4px 4px 0 0 var(--lv-ink-900)', 'hard offset, no blur'),
        ('shadow-pixel-sm', '2px 2px 0 0 var(--lv-ink-900)', ''),
        ('scene-sea', 'var(--lv-ink-900)', 'sea colour behind scene.svg'),
    ]),
]
DARK = [
    ('Surfaces', [
        ('bg', 'var(--lv-ink-900)', ''),
        ('surface', 'var(--lv-ink-800)', ''),
        ('surface-2', 'var(--lv-ink-700)', ''),
        ('border', 'var(--lv-ink-600)', ''),
        ('border-strong', '#5D6AA8', '3.7:1 on bg'),
    ]),
    ('Text (contrast on --lv-bg)', [
        ('text', 'var(--lv-stone-100)', '16.7:1'),
        ('text-muted', 'var(--lv-ink-300)', '7.6:1'),
        ('text-subtle', '#7D87B0', '5.4:1 (use on bg/surface, not surface-2)'),
        ('text-warm', 'var(--lv-ember-400)', '7.3:1'),
        ('text-cool', 'var(--lv-tide-300)', '8.2:1'),
        ('text-yield', 'var(--lv-gold-300)', '13.0:1'),
        ('text-success', '#5FD6A8', '10.5:1'),
        ('text-danger', '#FF7B86', '7.6:1'),
    ]),
    ('Fills', [
        ('accent', 'var(--lv-tide-500)', ''),
        ('accent-hover', 'var(--lv-tide-400)', ''),
        ('on-accent', '#FFFFFF', '4.9:1'),
        ('warm', 'var(--lv-ember-400)', ''),
        ('on-warm', 'var(--lv-ink-900)', '7.3:1'),
        ('yield', 'var(--lv-gold-400)', ''),
        ('on-yield', 'var(--lv-ink-900)', '10.8:1'),
        ('water', 'var(--lv-aqua-300)', ''),
        ('focus', 'var(--lv-tide-400)', '5.7:1 on bg'),
        ('pixel-shadow', 'var(--lv-ink-950)', ''),
        ('shadow-pixel', '4px 4px 0 0 var(--lv-ink-950)', ''),
        ('shadow-pixel-sm', '2px 2px 0 0 var(--lv-ink-950)', ''),
        ('scene-sea', 'var(--lv-ink-900)', ''),
    ]),
]


def sem_block(groups, indent):
    out = []
    for title, rows in groups:
        out.append(f'{indent}/* {title} */')
        for name, val, note in rows:
            line = f'{indent}--lv-{name}: {val};'
            if note:
                line = f'{line:<52} /* {note} */'
            out.append(line)
    return '\n'.join(out)


def main():
    o = []
    o.append('/* ==========================================================================')
    o.append('   Levada brand tokens  ·  v1.0  ·  2026-10-23')
    o.append('   Isometric pixel identity for "Mezo\'s savings rate, on Base."')
    o.append('   Light theme is the default. Dark theme applies with prefers-color-scheme:')
    o.append('   dark (unless <html data-theme="light">) or with <html data-theme="dark">.')
    o.append('   Contrast ratios are WCAG 2.x, measured against --lv-bg of the same theme.')
    o.append('   ========================================================================== */')
    o.append('')
    o.append('@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..500&family=Pixelify+Sans:wght@400..700&display=swap");')
    o.append('')
    o.append(':root {')
    o.append('  /* ---------- Primitives ---------- */')
    for title, name, steps in GROUPS:
        o.append(f'  /* {title} */')
        row = []
        for s in steps:
            row.append(f'--lv-{name}-{s}: {T[f"{name}-{s}"]};')
        if name == 'gold':
            row.append(f'--lv-gold-700: {EXTRA["gold-700"]};')
        for i in range(0, len(row), 3):
            o.append('  ' + ' '.join(row[i:i + 3]))
    o.append('')
    o.append('  /* ---------- Type ---------- */')
    o.append('  --lv-font-display: "Pixelify Sans", ui-monospace, "SF Mono", Menlo, monospace;')
    o.append('  --lv-font-ui: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;')
    o.append('  --lv-font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;')
    o.append('  --lv-weight-regular: 400; --lv-weight-medium: 500; --lv-weight-semibold: 600; --lv-weight-bold: 700;')
    scale = [
        ('display-xl', '4rem', '64px  Pixelify Sans 600 / 1.0'),
        ('display-lg', '3rem', '48px  Pixelify Sans 600 / 1.05'),
        ('display-md', '2rem', '32px  Pixelify Sans 500 / 1.1'),
        ('h1', '1.75rem', '28px  Geist 600 / 1.2, -0.01em'),
        ('h2', '1.375rem', '22px  Geist 600 / 1.3'),
        ('h3', '1.125rem', '18px  Geist 600 / 1.4'),
        ('body', '1rem', '16px  Geist 400 / 1.55'),
        ('small', '0.875rem', '14px  Geist 400 / 1.5'),
        ('caption', '0.75rem', '12px  Geist 500 / 1.4, +0.04em, uppercase'),
        ('figure-xl', '3rem', '48px  Geist Mono 500, tabular-nums (headline APR)'),
        ('figure', '1.25rem', '20px  Geist Mono 500, tabular-nums (balances)'),
    ]
    for n, v, note in scale:
        o.append(f'  {"--lv-text-" + n + ": " + v + ";":<34} /* {note} */')
    o.append('  --lv-leading-tight: 1.05; --lv-leading-snug: 1.25; --lv-leading-body: 1.55;')
    o.append('  --lv-tracking-display: 0.01em; --lv-tracking-tight: -0.01em; --lv-tracking-caption: 0.04em;')
    o.append('')
    o.append('  /* ---------- Space and shape (4px = one art pixel at 1x) ---------- */')
    o.append('  --lv-px: 4px;')
    o.append('  --lv-space-1: 4px; --lv-space-2: 8px; --lv-space-3: 12px; --lv-space-4: 16px;')
    o.append('  --lv-space-6: 24px; --lv-space-8: 32px; --lv-space-12: 48px; --lv-space-16: 64px;')
    o.append('  --lv-radius-0: 0; --lv-radius-1: 2px; --lv-radius-2: 4px;   /* square or near-square; no pills */')
    o.append('  --lv-border-width: 2px;')
    o.append('  /* Notched pixel corners for cards and buttons: clip-path: var(--lv-clip-pixel); */')
    o.append('  --lv-clip-pixel: polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,')
    o.append('    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%,')
    o.append('    4px calc(100% - 4px), 0 calc(100% - 4px));')
    o.append('  --lv-motion-step: steps(8, end);   /* pixel motion: move in whole art pixels */')
    o.append('  --lv-motion-fast: 120ms; --lv-motion-base: 200ms;')
    o.append('}')
    o.append('')
    o.append('/* ---------- Semantic: light (default). data-theme also scopes a subtree. ---------- */')
    o.append(':root, [data-theme="light"] {')
    o.append('  color-scheme: light;')
    o.append(sem_block(LIGHT, '  '))
    o.append('}')
    o.append('')
    o.append('/* ---------- Semantic: dark ---------- */')
    o.append('@media (prefers-color-scheme: dark) {')
    o.append('  :root:not([data-theme="light"]) {')
    o.append('    color-scheme: dark;')
    o.append(sem_block(DARK, '    '))
    o.append('  }')
    o.append('}')
    o.append('')
    o.append('[data-theme="dark"] {')
    o.append('  color-scheme: dark;')
    o.append(sem_block(DARK, '  '))
    o.append('}')
    o.append('')
    o.append('/* ---------- Base ---------- */')
    o.append('body { background: var(--lv-bg); color: var(--lv-text); font-family: var(--lv-font-ui); }')
    o.append('.lv-figure { font-family: var(--lv-font-mono); font-variant-numeric: tabular-nums; }')
    o.append('.lv-display { font-family: var(--lv-font-display); letter-spacing: var(--lv-tracking-display); }')
    o.append('.lv-pixel-art, .lv-pixel-art img, .lv-pixel-art svg { image-rendering: pixelated; shape-rendering: crispEdges; }')
    o.append('')
    return '\n'.join(o) + '\n'


if __name__ == '__main__':
    out = sys.argv[1]
    open(out, 'w').write(main())
    print('wrote', out)
