import styled from 'styled-components';

import { color, radius, shadow, sidebarWidth } from '@/app/theme/theme';

const Shell = styled.div<{ $sidebarHidden: boolean }>`
  display: grid;
  grid-template-columns: ${({ $sidebarHidden }) => ($sidebarHidden ? '0px' : sidebarWidth)} minmax(0, 1fr);
  height: 100%;
`;

const SidebarSlot = styled.div`
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

const ShowSidebarButton = styled.button.attrs({ type: 'button' })`
  position: fixed;
  bottom: 14px;
  left: 14px;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: ${color.textMuted};
  background: transparent;
  border: 0;
  border-radius: ${radius.sm};

  &:hover {
    color: ${color.text};
    background: ${color.surfaceHover};
  }
`;

const Main = styled.main`
  position: relative;
  min-width: 0;
  min-height: 0;
`;

const DragStrip = styled.div`
  position: absolute;
  inset: 0 0 auto;
  z-index: 5;
  height: 28px;
`;

const MainScroll = styled.div`
  height: 100%;
  overflow-y: scroll;
  scrollbar-gutter: stable;
`;

const DropOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: ${color.overlay};
  backdrop-filter: blur(6px);
`;

const DropCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 44px 64px;
  color: ${color.accentText};
  background: ${color.surface};
  border: 2px dashed ${color.accent};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.lg};
`;

export { DragStrip, DropCard, DropOverlay, Main, MainScroll, Shell, ShowSidebarButton, SidebarSlot };
