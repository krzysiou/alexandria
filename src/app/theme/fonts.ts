type FontOption = {
  id: string;
  name: string;
  sans: string;
  serif: string;
};

const SYSTEM_SANS = '-apple-system, blinkmacsystemfont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif';
const SYSTEM_SERIF = '"New York", ui-serif, "Iowan Old Style", palatino, georgia, serif';

/**
 * A font used for both the interface and reading.
 */
const single = (id: string, name: string, stack: string): FontOption => ({ id, name, sans: stack, serif: stack });

const FONTS: FontOption[] = [
  { id: 'default', name: 'Default (SF Pro & New York)', sans: SYSTEM_SANS, serif: SYSTEM_SERIF },
  single('sf-pro', 'SF Pro', SYSTEM_SANS),
  single('new-york', 'New York', SYSTEM_SERIF),
  single('inter', 'Inter', '"Inter Variable", -apple-system, system-ui, sans-serif'),
  single('avenir', 'Avenir Next', '"Avenir Next", avenir, -apple-system, system-ui, sans-serif'),
  single('helvetica', 'Helvetica Neue', '"Helvetica Neue", helvetica, arial, sans-serif'),
  single('atkinson', 'Atkinson Hyperlegible', '"Atkinson Hyperlegible", system-ui, sans-serif'),
  single('charter', 'Charter', 'charter, "Bitstream Charter", georgia, serif'),
  single('georgia', 'Georgia', 'georgia, "Times New Roman", serif'),
  single('iowan', 'Iowan Old Style', '"Iowan Old Style", palatino, georgia, serif'),
  single('literata', 'Literata', '"Literata Variable", georgia, serif'),
  single('merriweather', 'Merriweather', 'merriweather, georgia, serif'),
  single('source-serif', 'Source Serif', '"Source Serif 4 Variable", georgia, serif'),
];

const DEFAULT_FONT = 'default';

/**
 * The font with `id`, falling back to the default pairing.
 */
const findFont = (id: string): FontOption => FONTS.find(option => option.id === id) ?? (FONTS[0] as FontOption);

export type { FontOption };
export { DEFAULT_FONT, FONTS, findFont };
