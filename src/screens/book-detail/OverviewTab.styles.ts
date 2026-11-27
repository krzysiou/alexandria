import styled from 'styled-components';

import { color, font } from '@/app/theme/theme';

const Summary = styled.p`
  margin-top: 10px;
  font-family: ${font.serif};
  font-size: 17px;
  line-height: 1.6;
  user-select: text;
`;

const SectionList = styled.ol`
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  list-style: none;
`;

const SectionRow = styled.li`
  display: flex;
  gap: 14px;
  padding: 14px 4px;
  border-top: 1px solid ${color.border};

  > span:first-child {
    margin-top: 2px;
  }
`;

const SectionBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const SectionTitle = styled.div<{ $pending: boolean }>`
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  color: ${({ $pending }) => ($pending ? color.textMuted : color.text)};
`;

const SectionSummary = styled.p`
  margin-top: 4px;
  color: ${color.textMuted};
  user-select: text;
`;

export { SectionBody, SectionList, SectionRow, SectionSummary, SectionTitle, Summary };
