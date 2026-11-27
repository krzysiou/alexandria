import styled from 'styled-components';

import { color, ease, font, radius, shadow } from '@/app/theme/theme';

const PAGE_VERTICAL_PADDING = '116px';

const Runner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 760px;
  min-height: calc(100vh - ${PAGE_VERTICAL_PADDING});
  margin: 0 auto;
`;

const Head = styled.header`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const HeadProgress = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
`;

const QuestionCard = styled.div`
  flex: 1;
  padding: 32px 34px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.md};
`;

const QuestionMeta = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;

  > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Prompt = styled.div`
  margin-bottom: 24px;
  font-family: ${font.serif};
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
  user-select: text;
`;

const Options = styled.div<{ $row?: boolean }>`
  display: flex;
  flex-direction: ${({ $row }) => ($row ? 'row' : 'column')};
  gap: 10px;

  > button {
    flex: ${({ $row }) => ($row ? 1 : 'initial')};
  }
`;

const Option = styled.button.attrs({ type: 'button' })<{ $selected: boolean }>`
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  font-size: 15px;
  text-align: left;
  background: ${({ $selected }) => ($selected ? color.accentSoft : color.surface)};
  border: 1px solid ${({ $selected }) => ($selected ? color.accent : color.borderStrong)};
  border-radius: ${radius.md};
  box-shadow: ${({ $selected }) => ($selected ? `0 0 0 1px ${color.accent}` : 'none')};
  transition:
    border-color 0.15s ${ease},
    background-color 0.15s ${ease};

  &:hover {
    border-color: ${color.accent};
  }
`;

const OptionKey = styled.span<{ $selected: boolean }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ $selected }) => ($selected ? color.onAccent : color.textMuted)};
  background: ${({ $selected }) => ($selected ? color.accent : 'transparent')};
  border: 1px solid ${({ $selected }) => ($selected ? color.accent : color.borderStrong)};
  border-radius: 8px;
`;

const Foot = styled.footer`
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  padding: 12px 0;
  background: ${color.bg};

  > :first-child {
    justify-self: start;
  }

  > :last-child {
    justify-self: end;
  }
`;

const Dots = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
`;

const Dot = styled.button.attrs({ type: 'button' })<{ $current: boolean; $answered: boolean }>`
  width: 10px;
  height: 10px;
  padding: 0;
  background: ${({ $answered }) => ($answered ? color.accent : 'transparent')};
  border: 1px solid ${({ $answered }) => ($answered ? color.accent : color.borderStrong)};
  border-radius: 50%;
  box-shadow: ${({ $current }) => ($current ? `0 0 0 3px ${color.accentSoft}` : 'none')};
  transform: ${({ $current }) => ($current ? 'scale(1.25)' : 'none')};
`;

export { Dot, Dots, Foot, Head, HeadProgress, Option, OptionKey, Options, Prompt, QuestionCard, QuestionMeta, Runner };
