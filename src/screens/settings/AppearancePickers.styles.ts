import styled from 'styled-components';

import { color, radius } from '@/app/theme/theme';

const Swatches = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 4px 0 14px;
`;

const Swatch = styled.button.attrs({ type: 'button' })`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  text-align: left;
  background: ${color.surface2};
  border: 1px solid ${color.border};
  border-radius: ${radius.md};

  &:hover {
    border-color: ${color.borderStrong};
  }

  &[aria-pressed="true"] {
    border-color: ${color.accent};
    box-shadow: 0 0 0 2px ${color.accentSoft};
  }
`;

const Preview = styled.span`
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 46px;
  overflow: hidden;
  border: 1px solid ${color.border};
  border-radius: 8px;
`;

const PreviewHalf = styled.span`
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
  padding: 0 9px;
`;

const PreviewLine = styled.span`
  display: block;
  height: 5px;
  border-radius: 3px;
`;

const SwatchName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
`;

const FontRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const FontSample = styled.span`
  min-width: 140px;
  font-size: 16px;
  color: ${color.textMuted};
  text-align: right;
  white-space: nowrap;
`;

export { FontRow, FontSample, Preview, PreviewHalf, PreviewLine, Swatch, Swatches, SwatchName };
