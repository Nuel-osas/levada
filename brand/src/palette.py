"""Levada palette. Keys used by the pixel engine map to token names."""

TOKENS = {
    # Ember: warm, the Bitcoin/Mezo side (orange-red, not Mezo's raspberry)
    'ember-50': '#FFF4EC', 'ember-100': '#FFE2CF', 'ember-200': '#FFC29C', 'ember-300': '#FF9C68',
    'ember-400': '#FF7A45', 'ember-500': '#F05A2A', 'ember-600': '#C8411F', 'ember-700': '#962D1E',
    'ember-800': '#5E1C18',
    # Tide: cool, the Base side (cobalt-periwinkle, not Base's #0052FF)
    'tide-50': '#F0F4FF', 'tide-100': '#DCE5FF', 'tide-200': '#B7C9FF', 'tide-300': '#8AA8FF',
    'tide-400': '#5F86FF', 'tide-500': '#3B63F2', 'tide-600': '#2B47C4', 'tide-700': '#1F3291',
    'tide-800': '#172463',
    # Stone: the bridge
    'stone-50': '#FFFFFF', 'stone-100': '#EEF1F7', 'stone-200': '#D5DAE6', 'stone-300': '#AEB5C8',
    'stone-400': '#7C849C', 'stone-500': '#4F566B',
    # Gold: the yield coin
    'gold-100': '#FFF6CF', 'gold-200': '#FFE78A', 'gold-300': '#FFD150', 'gold-400': '#FFB627',
    'gold-500': '#E8901C', 'gold-600': '#A85A14',
    # Aqua: water in the channel
    'aqua-100': '#D9FFFA', 'aqua-200': '#9AF2EA', 'aqua-300': '#5EDDE0', 'aqua-400': '#2FB4CB',
    'aqua-500': '#1E86A8', 'aqua-600': '#155D80',
    # Ink: dark neutrals
    'ink-950': '#070A16', 'ink-900': '#0B1022', 'ink-800': '#121937', 'ink-700': '#1B2448',
    'ink-600': '#283363', 'ink-500': '#3B4780', 'ink-400': '#6470A6', 'ink-300': '#9AA3C7',
    'ink-200': '#C9CFE6', 'ink-100': '#E8EBF5',
    # Paper: light neutrals
    'paper-0': '#FFFFFF', 'paper-50': '#FAF8F4', 'paper-100': '#F3F0E9', 'paper-200': '#E6E1D6',
    'paper-300': '#CFC8B9', 'paper-500': '#6B6457',
}

# engine material keys -> token
# materials: w (warm/ember), c (cool/tide), s (stone), a (aqua), g (gold)
# tone index: 0 lightest .. 5 darkest; 1 = rim, 2 = top, 3 = lit side, 4 = shade side, 5 = inner/deep
KEYMAP = {
    'w0': 'ember-100', 'w1': 'ember-200', 'w2': 'ember-300', 'w3': 'ember-500', 'w4': 'ember-600', 'w5': 'ember-700',
    'c0': 'tide-100', 'c1': 'tide-200', 'c2': 'tide-300', 'c3': 'tide-500', 'c4': 'tide-600', 'c5': 'tide-700',
    's0': 'stone-50', 's1': 'stone-50', 's2': 'stone-100', 's3': 'stone-200', 's4': 'stone-300', 's5': 'stone-400',
    'a0': 'aqua-100', 'a1': 'aqua-200', 'a2': 'aqua-300', 'a3': 'aqua-400', 'a4': 'aqua-500', 'a5': 'aqua-600',
    'g0': 'gold-100', 'g1': 'gold-200', 'g2': 'gold-300', 'g3': 'gold-400', 'g4': 'gold-500', 'g5': 'gold-600',
    'k': 'ink-900', 'k8': 'ink-800', 'k7': 'ink-700', 'k6': 'ink-600',
}

PAL = {k: TOKENS[v] for k, v in KEYMAP.items()}
