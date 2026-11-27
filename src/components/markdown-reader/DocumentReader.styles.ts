import styled, { css } from 'styled-components';

import { color, radius, shadow } from '@/app/theme/theme';
import { Eyebrow } from '@/components/ui-kit/Text.styles';

const Reader = styled.div`
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 200px;
  gap: 28px;
  align-items: start;

  @media (width <= 1180px) {
    grid-template-columns: 220px minmax(0, 1fr);
  }
`;

const sideColumn = css`
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
`;

const Nav = styled.nav`
  ${sideColumn}
`;

const Toc = styled.aside`
  ${sideColumn}

  @media (width <= 1180px) {
    display: none;
  }
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 16px;
`;

const SideHeading = styled(Eyebrow)`
  padding: 0 10px 6px;
`;

const sideLink = css`
  padding: 6px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${color.textMuted};
  text-align: left;
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: ${radius.sm};

  &:hover {
    color: ${color.text};
    background: ${color.surfaceHover};
  }
`;

const DocLink = styled.button.attrs({ type: 'button' })<{ $active: boolean }>`
  ${sideLink}

  ${({ $active }) =>
    $active
      ? css`
          font-weight: 600;
          color: ${color.accentText};
          background: ${color.accentSoft};
        `
      : ''}
`;

const TocLink = styled.button.attrs({ type: 'button' })<{ $level: 2 | 3 }>`
  ${sideLink}
  padding: 4px 10px 4px ${({ $level }) => ($level === 3 ? '22px' : '10px')};
  font-size: 12.5px;
  white-space: normal;
`;

const Body = styled.article`
  min-width: 0;
  padding: 40px 52px 56px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.md};
  box-shadow: ${shadow.sm};
`;

export { Body, DocLink, Group, Nav, Reader, SideHeading, Toc, TocLink };
