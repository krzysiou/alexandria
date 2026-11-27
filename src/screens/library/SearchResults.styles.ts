import styled from 'styled-components';

import { color, font, radius } from '@/app/theme/theme';

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 36px;
`;

const Heading = styled.div`
  display: flex;
  gap: 10px;
  align-items: baseline;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.md};
`;

const Hit = styled.button.attrs({ type: 'button' })`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  text-align: left;
  background: transparent;
  border: 0;
  border-top: 1px solid ${color.border};

  &:first-child {
    border-top: 0;
  }

  &:hover {
    background: ${color.surfaceHover};
  }
`;

const HitTitle = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  font-weight: 600;

  > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Snippet = styled.p`
  font-family: ${font.serif};
  font-size: 14.5px;
  line-height: 1.55;
  color: ${color.textMuted};

  mark {
    padding: 0 2px;
    color: ${color.text};
    background: ${color.goldSoft};
    border-radius: 3px;
  }
`;

export { Heading, Hit, HitTitle, List, Section, Snippet };
