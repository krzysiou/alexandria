import { describe, expect, it } from 'vitest';

import { DEFAULT_FONT, FONTS, findFont } from '@/app/theme/fonts';
import { DEFAULT_PALETTE, findPalette, PALETTES, paletteDeclarations } from '@/app/theme/palettes';

describe('palettes', () => {
  it('define every color in both light and dark versions', () => {
    const keys = Object.keys(findPalette(DEFAULT_PALETTE).light).sort();
    for (const palette of PALETTES) {
      expect(Object.keys(palette.light).sort()).toEqual(keys);
      expect(Object.keys(palette.dark).sort()).toEqual(keys);
    }
  });

  it('have unique ids and fall back to the default', () => {
    expect(new Set(PALETTES.map(palette => palette.id)).size).toBe(PALETTES.length);
    expect(findPalette('missing').id).toBe(DEFAULT_PALETTE);
  });

  it('write CSS variables with kebab-case names', () => {
    const css = paletteDeclarations(findPalette(DEFAULT_PALETTE).light);
    expect(css).toContain('--bg-sidebar: #ece8e0;');
    expect(css).toContain('--surface-2: #faf8f4;');
    expect(css).toContain('--accent-soft: #f5ecdb;');
  });
});

describe('fonts', () => {
  it('fall back to the default pairing', () => {
    expect(findFont('missing').id).toBe(DEFAULT_FONT);
    expect(new Set(FONTS.map(font => font.id)).size).toBe(FONTS.length);
  });
});
