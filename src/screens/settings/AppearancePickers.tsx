import type { PaletteColors } from '@/app/theme/palettes';

import { FONTS, findFont } from '@/app/theme/fonts';
import { PALETTES } from '@/app/theme/palettes';
import { Select } from '@/components/ui-kit/Form.styles';
import {
  FontRow,
  FontSample,
  Preview,
  PreviewHalf,
  PreviewLine,
  Swatch,
  Swatches,
  SwatchName,
} from '@/screens/settings/AppearancePickers.styles';

const FONT_SAMPLE = 'Aa Ąą Żż — Zażółć';

/**
 * Half of a swatch: a tiny page in the palette's light or dark colors.
 */
const PaletteHalf = ({ colors }: { colors: PaletteColors }) => (
  <PreviewHalf style={{ background: colors.surface }}>
    <PreviewLine style={{ width: '70%', background: colors.text, opacity: 0.75 }} />
    <PreviewLine style={{ width: '45%', background: colors.accent }} />
    <PreviewLine style={{ width: '30%', background: colors.gold }} />
  </PreviewHalf>
);

/**
 * Grid of color themes, each previewed in its light and dark version.
 */
const PalettePicker = ({ value, onChange }: { value: string; onChange: (palette: string) => void }) => (
  <Swatches>
    {PALETTES.map(palette => (
      <Swatch key={palette.id} aria-pressed={palette.id === value} onClick={() => onChange(palette.id)}>
        <Preview>
          <PaletteHalf colors={palette.light} />
          <PaletteHalf colors={palette.dark} />
        </Preview>
        <SwatchName>{palette.name}</SwatchName>
      </Swatch>
    ))}
  </Swatches>
);

/**
 * Font dropdown with a sample rendered in the selected font.
 */
const FontPicker = ({ value, onChange }: { value: string; onChange: (font: string) => void }) => (
  <FontRow>
    <FontSample style={{ fontFamily: findFont(value).serif }}>{FONT_SAMPLE}</FontSample>
    <Select value={value} onChange={event => onChange(event.target.value)}>
      {FONTS.map(option => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </Select>
  </FontRow>
);

export { FontPicker, PalettePicker };
