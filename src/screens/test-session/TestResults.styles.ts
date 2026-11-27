import styled from 'styled-components';

import { color, font, radius } from '@/app/theme/theme';

const Head = styled.header`
  display: flex;
  gap: 32px;
  align-items: center;
  margin-bottom: 28px;
`;

const Summary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  > div:last-child {
    margin-top: 8px;
  }
`;

const Filter = styled.div`
  margin-bottom: 16px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Item = styled.article<{ $pending: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 22px;
  background: ${color.surface};
  border: 1px solid ${({ $pending }) => ($pending ? color.gold : color.border)};
  border-radius: ${radius.md};
  box-shadow: ${({ $pending }) => ($pending ? `0 0 0 3px ${color.goldSoft}` : 'none')};

  p {
    user-select: text;
  }
`;

const ItemHead = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const ItemPrompt = styled.div`
  font-family: ${font.serif};
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  user-select: text;
`;

const OptionList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
`;

const OptionRow = styled.li<{ $state: 'correct' | 'wrong' | 'neutral' }>`
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  font-weight: ${({ $state }) => ($state === 'correct' ? 600 : 400)};
  color: ${({ $state }) => ($state === 'correct' ? color.success : $state === 'wrong' ? color.danger : color.text)};
  background: ${({ $state }) =>
    $state === 'correct' ? color.successSoft : $state === 'wrong' ? color.dangerSoft : color.surface2};
  border-radius: ${radius.sm};

  > span:last-child:not(:nth-child(2)) {
    margin-left: auto;
  }
`;

const Bullet = styled.span`
  width: 14px;
`;

const Answers = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  > div {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    background: ${color.surface2};
    border-radius: ${radius.sm};
  }
`;

const Explanation = styled.div`
  padding-left: 12px;
  color: ${color.textMuted};
  border-left: 3px solid ${color.borderStrong};
`;

const SelfGrade = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid ${color.border};
`;

export {
  Answers,
  Bullet,
  Explanation,
  Filter,
  Head,
  Item,
  ItemHead,
  ItemPrompt,
  List,
  OptionList,
  OptionRow,
  SelfGrade,
  Summary,
};
