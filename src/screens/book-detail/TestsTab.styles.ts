import styled from 'styled-components';

import { color, radius } from '@/app/theme/theme';
import { Card } from '@/components/ui-kit/Layout.styles';

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const NewTestCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const NewTestOptions = styled.div`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 12px 28px;
  place-items: center start;
`;

const NewTestFooter = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid ${color.border};
`;

const PickList = styled.div`
  display: flex;
  flex-direction: column;
  grid-column: 2;
  justify-self: stretch;
  max-height: 260px;
  padding: 6px;
  overflow-y: auto;
  border: 1px solid ${color.border};
  border-radius: ${radius.sm};
`;

const MasteryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MasteryRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px 44px;
  gap: 14px;
  align-items: center;
`;

const MasteryTitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MasteryValue = styled.span`
  font-size: 12.5px;
  color: ${color.textMuted};
  text-align: right;
`;

const HistoryRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  border-top: 1px solid ${color.border};
`;

const HistoryMain = styled.button.attrs({ type: 'button' })`
  display: flex;
  flex: 1;
  gap: 14px;
  align-items: center;
  padding: 10px 4px;
  text-align: left;
  background: transparent;
  border: 0;

  &:hover > span:first-child {
    border-color: ${color.accent};
  }
`;

const HistoryScore = styled.span<{ $good: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 34px;
  font-weight: 650;
  color: ${({ $good }) => ($good ? color.success : color.text)};
  border: 1px solid ${color.border};
  border-radius: ${radius.sm};
`;

const HistoryText = styled.span`
  display: flex;
  flex-direction: column;
`;

export {
  HistoryMain,
  HistoryRow,
  HistoryScore,
  HistoryText,
  Layout,
  MasteryList,
  MasteryRow,
  MasteryTitle,
  MasteryValue,
  NewTestCard,
  NewTestFooter,
  NewTestOptions,
  PickList,
};
