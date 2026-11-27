import styled from 'styled-components';

import { color, ease, font, radius, rise, shadow } from '@/app/theme/theme';

const PAGE_WIDTH = {
  narrow: '820px',
  default: '1180px',
  wide: '1400px',
};

const Page = styled.div<{ $width?: keyof typeof PAGE_WIDTH }>`
  max-width: ${({ $width }) => PAGE_WIDTH[$width ?? 'default']};
  padding: 52px 40px 64px;
  margin: 0 auto;
  animation: ${rise} 0.25s ${ease};
`;

const PageHeader = styled.header`
  display: flex;
  gap: 20px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;

  p {
    margin-top: 6px;
  }
`;

const Row = styled.div<{ $wrap?: boolean }>`
  display: flex;
  flex-wrap: ${({ $wrap }) => ($wrap === false ? 'nowrap' : 'wrap')};
  gap: 8px;
  align-items: center;
`;

const Stack = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? 20}px;
  min-width: 0;
`;

const CenterPad = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
`;

const Card = styled.section`
  padding: 20px 22px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.md};
  box-shadow: ${shadow.sm};
`;

const CardHead = styled.div`
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const StatGrid = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns ?? 4}, minmax(0, 1fr));
  gap: 12px;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 18px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.md};
`;

const StatValue = styled.span`
  font-family: ${font.serif};
  font-size: 26px;
  font-weight: 600;
  line-height: 1.15;
`;

const StatLabel = styled.span`
  font-size: 12.5px;
  color: ${color.textMuted};
`;

export { Card, CardHead, CenterPad, Page, PageHeader, Row, Stack, Stat, StatGrid, StatLabel, StatValue };
