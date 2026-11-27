type PaletteColors = {
  bg: string;
  bgSidebar: string;
  surface: string;
  surface2: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentText: string;
  onAccent: string;
  gold: string;
  goldSoft: string;
  overlay: string;
};

type Palette = {
  id: string;
  name: string;
  light: PaletteColors;
  dark: PaletteColors;
};

const PALETTES: Palette[] = [
  {
    id: 'alexandria',
    name: 'Alexandria',
    light: {
      bg: '#f5f2ec',
      bgSidebar: '#ece8e0',
      surface: '#fff',
      surface2: '#faf8f4',
      surfaceHover: '#f1ede5',
      border: '#e4dfd5',
      borderStrong: '#d2ccbf',
      text: '#1f1d20',
      textMuted: '#67625a',
      textFaint: '#a19b90',
      accent: '#9c6b1e',
      accentHover: '#855a17',
      accentSoft: '#f5ecdb',
      accentText: '#7f5617',
      onAccent: '#fff',
      gold: '#c2602a',
      goldSoft: '#f9e6da',
      overlay: 'rgb(245 242 236 / 82%)',
    },
    dark: {
      bg: '#1c1b1e',
      bgSidebar: '#161518',
      surface: '#242226',
      surface2: '#29272b',
      surfaceHover: '#312f33',
      border: '#343136',
      borderStrong: '#444046',
      text: '#ece5d8',
      textMuted: '#a9a294',
      textFaint: '#6f6a62',
      accent: '#d4a24c',
      accentHover: '#e0b363',
      accentSoft: 'rgb(212 162 76 / 14%)',
      accentText: '#e3b96a',
      onAccent: '#1c1b1e',
      gold: '#e58a57',
      goldSoft: 'rgb(229 138 87 / 14%)',
      overlay: 'rgb(22 21 24 / 80%)',
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    light: {
      bg: '#f4ecd8',
      bgSidebar: '#ede3cb',
      surface: '#fbf6ea',
      surface2: '#f7f0df',
      surfaceHover: '#ece2c9',
      border: '#e0d4b6',
      borderStrong: '#cfc09c',
      text: '#3b2f22',
      textMuted: '#74634d',
      textFaint: '#a8977b',
      accent: '#9a5b2a',
      accentHover: '#7f4a21',
      accentSoft: '#f1e0cb',
      accentText: '#8a4f22',
      onAccent: '#fff',
      gold: '#b8862e',
      goldSoft: '#f3e6c4',
      overlay: 'rgb(244 236 216 / 82%)',
    },
    dark: {
      bg: '#1e1913',
      bgSidebar: '#18140f',
      surface: '#26201a',
      surface2: '#2b241d',
      surfaceHover: '#342c23',
      border: '#3a3128',
      borderStrong: '#4a3f33',
      text: '#eadfc9',
      textMuted: '#b3a48b',
      textFaint: '#7d705c',
      accent: '#d49a63',
      accentHover: '#e2ae7c',
      accentSoft: 'rgb(212 154 99 / 15%)',
      accentText: '#e6b585',
      onAccent: '#1e1913',
      gold: '#e0b35c',
      goldSoft: 'rgb(224 179 92 / 13%)',
      overlay: 'rgb(24 20 15 / 80%)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    light: {
      bg: '#f3f5f0',
      bgSidebar: '#e9eee4',
      surface: '#fff',
      surface2: '#f8faf6',
      surfaceHover: '#eef2ea',
      border: '#dfe5d8',
      borderStrong: '#cbd4c2',
      text: '#1c2219',
      textMuted: '#5f6b59',
      textFaint: '#9aa594',
      accent: '#2f7d4f',
      accentHover: '#256641',
      accentSoft: '#e3f1e8',
      accentText: '#276a43',
      onAccent: '#fff',
      gold: '#b5822a',
      goldSoft: '#f7ecd5',
      overlay: 'rgb(243 245 240 / 82%)',
    },
    dark: {
      bg: '#111613',
      bgSidebar: '#0c100d',
      surface: '#18201b',
      surface2: '#1c2520',
      surfaceHover: '#222c26',
      border: '#28332c',
      borderStrong: '#354239',
      text: '#e3eae3',
      textMuted: '#9fae9f',
      textFaint: '#677468',
      accent: '#5fc28a',
      accentHover: '#79d19f',
      accentSoft: 'rgb(95 194 138 / 14%)',
      accentText: '#86d6a8',
      onAccent: '#0c140f',
      gold: '#e2b45a',
      goldSoft: 'rgb(226 180 90 / 13%)',
      overlay: 'rgb(12 16 13 / 80%)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    light: {
      bg: '#f1f5f8',
      bgSidebar: '#e6eef3',
      surface: '#fff',
      surface2: '#f7fafc',
      surfaceHover: '#edf3f7',
      border: '#dbe5ec',
      borderStrong: '#c6d4de',
      text: '#16212a',
      textMuted: '#57687a',
      textFaint: '#93a3b2',
      accent: '#0e7490',
      accentHover: '#0b5f76',
      accentSoft: '#dff2f7',
      accentText: '#0b6680',
      onAccent: '#fff',
      gold: '#c2862b',
      goldSoft: '#f8ecd6',
      overlay: 'rgb(241 245 248 / 82%)',
    },
    dark: {
      bg: '#0e151b',
      bgSidebar: '#0a1015',
      surface: '#141e26',
      surface2: '#18232c',
      surfaceHover: '#1e2b35',
      border: '#24323d',
      borderStrong: '#31424f',
      text: '#e2ebf1',
      textMuted: '#9cb0bf',
      textFaint: '#637786',
      accent: '#38bdf8',
      accentHover: '#5ccafa',
      accentSoft: 'rgb(56 189 248 / 14%)',
      accentText: '#7dd3fc',
      onAccent: '#06141c',
      gold: '#e9b55a',
      goldSoft: 'rgb(233 181 90 / 13%)',
      overlay: 'rgb(10 16 21 / 80%)',
    },
  },
  {
    id: 'rose',
    name: 'Rosé',
    light: {
      bg: '#f8f3f4',
      bgSidebar: '#f1e8ea',
      surface: '#fff',
      surface2: '#fcf8f9',
      surfaceHover: '#f4ebee',
      border: '#ead9de',
      borderStrong: '#dcc4cb',
      text: '#2a1b20',
      textMuted: '#735a63',
      textFaint: '#ab939b',
      accent: '#b0306a',
      accentHover: '#932658',
      accentSoft: '#f8e1ec',
      accentText: '#9c2a5e',
      onAccent: '#fff',
      gold: '#b9822e',
      goldSoft: '#f7ead5',
      overlay: 'rgb(248 243 244 / 82%)',
    },
    dark: {
      bg: '#181114',
      bgSidebar: '#120c0f',
      surface: '#21171b',
      surface2: '#261b20',
      surfaceHover: '#2e2127',
      border: '#35262d',
      borderStrong: '#45323a',
      text: '#f0e4e8',
      textMuted: '#b99ea8',
      textFaint: '#7f6670',
      accent: '#f472b6',
      accentHover: '#f68cc4',
      accentSoft: 'rgb(244 114 182 / 14%)',
      accentText: '#f9a8d4',
      onAccent: '#1c0a13',
      gold: '#e8b45c',
      goldSoft: 'rgb(232 180 92 / 13%)',
      overlay: 'rgb(18 12 15 / 80%)',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    light: {
      bg: '#f5f5f4',
      bgSidebar: '#ececeb',
      surface: '#fff',
      surface2: '#fafafa',
      surfaceHover: '#f0f0ef',
      border: '#e2e2e0',
      borderStrong: '#cfcfcc',
      text: '#1a1a19',
      textMuted: '#63635f',
      textFaint: '#9e9e99',
      accent: '#27272a',
      accentHover: '#3f3f46',
      accentSoft: '#ececee',
      accentText: '#27272a',
      onAccent: '#fff',
      gold: '#a16207',
      goldSoft: '#f6ecd6',
      overlay: 'rgb(245 245 244 / 82%)',
    },
    dark: {
      bg: '#121212',
      bgSidebar: '#0d0d0d',
      surface: '#1a1a1a',
      surface2: '#1f1f1f',
      surfaceHover: '#262626',
      border: '#2b2b2b',
      borderStrong: '#3a3a3a',
      text: '#ececec',
      textMuted: '#a3a3a3',
      textFaint: '#6b6b6b',
      accent: '#e5e5e5',
      accentHover: '#fff',
      accentSoft: 'rgb(229 229 229 / 12%)',
      accentText: '#f5f5f5',
      onAccent: '#121212',
      gold: '#e3b35a',
      goldSoft: 'rgb(227 179 90 / 12%)',
      overlay: 'rgb(13 13 13 / 82%)',
    },
  },
];

const DEFAULT_PALETTE = 'alexandria';

/**
 * The palette with `id`, falling back to the default palette.
 */
const findPalette = (id: string): Palette => PALETTES.find(palette => palette.id === id) ?? (PALETTES[0] as Palette);

/**
 * `surface2` → `--surface-2`, `bgSidebar` → `--bg-sidebar`.
 */
const cssVariableName = (key: string): string => `--${key.replace(/([A-Z0-9])/g, '-$1').toLowerCase()}`;

/**
 * CSS custom property declarations for a set of palette colors.
 */
const paletteDeclarations = (colors: PaletteColors): string =>
  Object.entries(colors)
    .map(([key, value]) => `${cssVariableName(key)}: ${value};`)
    .join('\n');

export type { Palette, PaletteColors };
export { DEFAULT_PALETTE, findPalette, PALETTES, paletteDeclarations };
