import styled from 'styled-components';

import type { Tone } from '@/app/theme/theme';

import { color, toneColor } from '@/app/theme/theme';

type TextProps = {
  $tone?: Tone;
  $size?: 'sm' | 'md';
};

const Text = styled.span<TextProps>`
  font-size: ${({ $size }) => ($size === 'sm' ? '12.5px' : 'inherit')};
  color: ${({ $tone }) => toneColor[$tone ?? 'default']};
  overflow-wrap: anywhere;
`;

const Eyebrow = styled.div`
  font-size: 11px;
  font-weight: 650;
  color: ${color.textFaint};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const ToneIcon = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  color: ${({ $tone }) => toneColor[$tone]};
`;

export { Eyebrow, Text, ToneIcon };
