import styled from 'styled-components';

import { color, ease, font, radius, rise } from '@/app/theme/theme';

const TRAFFIC_LIGHTS_SPACE = '88px';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  background: ${color.bg};
  animation: ${rise} 0.2s ${ease};
`;

const TopBar = styled.header`
  position: relative;
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
  height: 52px;
  padding: 0 20px 0 ${TRAFFIC_LIGHTS_SPACE};
  border-bottom: 1px solid ${color.border};
`;

const Breadcrumb = styled.div`
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: ${color.textMuted};
  white-space: nowrap;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 600;
    color: ${color.text};
  }
`;

const ScrollProgress = styled.div`
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: ${color.accent};
  transition: width 0.1s linear;
`;

const Scroller = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const Article = styled.article`
  padding: 64px 32px 96px;
`;

const Pager = styled.footer`
  display: grid;
  flex-shrink: 0;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: center;
  padding: 14px 24px;
  background: ${color.bg};
  border-top: 1px solid ${color.border};
`;

const PageLink = styled.button.attrs({ type: 'button' })<{ $align: 'start' | 'end' }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: ${({ $align }) => ($align === 'start' ? 'flex-start' : 'flex-end')};
  justify-self: ${({ $align }) => $align};
  min-width: 0;
  max-width: 100%;
  padding: 8px 12px;
  text-align: ${({ $align }) => ($align === 'start' ? 'left' : 'right')};
  background: transparent;
  border: 0;
  border-radius: ${radius.sm};

  &:hover:not(:disabled) {
    background: ${color.surfaceHover};
  }

  &:disabled {
    visibility: hidden;
  }
`;

const PageDirection = styled.span`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: ${color.accentText};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const PageTitle = styled.span`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ${font.serif};
  font-size: 15px;
  color: ${color.text};
  white-space: nowrap;
`;

const Position = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 160px;
  font-size: 12.5px;
  color: ${color.textMuted};
`;

export {
  Article,
  Breadcrumb,
  Overlay,
  PageDirection,
  PageLink,
  Pager,
  PageTitle,
  Position,
  Scroller,
  ScrollProgress,
  TopBar,
};
