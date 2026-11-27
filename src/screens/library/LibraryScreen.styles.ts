import styled from 'styled-components';

import { color, ease, font, radius, rise, shadow } from '@/app/theme/theme';

const HeaderActions = styled.div`
  display: flex;
  flex: 1;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
`;

const Imports = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
`;

const ImportRow = styled.div<{ $failed: boolean }>`
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 14px 18px;
  color: ${({ $failed }) => ($failed ? color.danger : color.accentText)};
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.md};
`;

const ImportBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  color: ${color.text};
`;

const ImportName = styled.div`
  font-weight: 600;
`;

const Dropzone = styled.div`
  background: ${color.surface2};
  border: 2px dashed ${color.borderStrong};
  border-radius: ${radius.lg};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 176px);
  gap: 28px 24px;
`;

const Card = styled.button.attrs({ type: 'button' })`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  text-align: left;
  background: transparent;
  border: 0;
  animation: ${rise} 0.3s ${ease};

  > div:first-child {
    transition:
      transform 0.2s ${ease},
      box-shadow 0.2s ${ease};
  }

  &:hover > div:first-child {
    box-shadow: ${shadow.lg};
    transform: translateY(-4px);
  }
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const CardTitle = styled.div`
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-family: ${font.serif};
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.3;
  -webkit-box-orient: vertical;
`;

const CardMeta = styled.div`
  font-size: 12.5px;
  color: ${color.textMuted};
`;

const CardProgress = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  margin-top: 6px;
`;

export {
  Card,
  CardBody,
  CardMeta,
  CardProgress,
  CardTitle,
  Dropzone,
  Grid,
  HeaderActions,
  ImportBody,
  ImportName,
  ImportRow,
  Imports,
};
