import styled, { css } from 'styled-components';

import { color, font, radius, shadow, sidebarWidth } from '@/app/theme/theme';
import { Eyebrow } from '@/components/ui-kit/Text.styles';

const activeItem = css`
  color: ${color.text};
  background: ${color.surface};
  box-shadow: ${shadow.sm};
`;

const Aside = styled.aside`
  display: flex;
  flex-direction: column;
  width: ${sidebarWidth};
  height: 100%;
  min-height: 0;
  background: ${color.bgSidebar};
  border-right: 1px solid ${color.border};
`;

const Brand = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  height: 92px;
  padding: 44px 20px 12px;

  img {
    width: 30px;
    height: 30px;
  }
`;

const BrandName = styled.span`
  font-family: ${font.serif};
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.01em;
`;

const NavList = styled.nav`
  padding: 4px 12px;
`;

const NavItem = styled.button.attrs({ type: 'button' })<{ $active: boolean }>`
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  font-weight: 550;
  color: ${color.textMuted};
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: ${radius.sm};

  &:hover {
    color: ${color.text};
    background: ${color.surfaceHover};
  }

  ${({ $active }) => ($active ? activeItem : '')}
`;

const Section = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding-top: 18px;
`;

const SectionHeading = styled(Eyebrow)`
  padding: 0 22px 8px;
`;

const Books = styled.div`
  flex: 1;
  padding: 0 12px 12px;
  overflow-y: auto;
`;

const BookItem = styled.button.attrs({ type: 'button' })<{ $active: boolean }>`
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: ${radius.sm};

  &:hover {
    background: ${color.surfaceHover};
  }

  ${({ $active }) => ($active ? activeItem : '')}
`;

const BookText = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const ellipsis = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BookTitle = styled.span`
  ${ellipsis}
  font-size: 13px;
  font-weight: 550;
`;

const BookMeta = styled.span`
  ${ellipsis}
  font-size: 12px;
  color: ${color.textMuted};
`;

const Hint = styled.p`
  padding: 4px 10px;
  font-size: 12.5px;
  color: ${color.textFaint};
`;

const Footer = styled.div`
  padding: 12px;
  border-top: 1px solid ${color.border};
`;

const FooterRow = styled.div`
  display: flex;
  gap: 2px;
  align-items: center;
`;

const FooterNavItem = styled(NavItem)`
  width: auto;
  margin-right: auto;
`;

export {
  Aside,
  BookItem,
  BookMeta,
  Books,
  BookText,
  BookTitle,
  Brand,
  BrandName,
  Footer,
  FooterNavItem,
  FooterRow,
  Hint,
  NavItem,
  NavList,
  Section,
  SectionHeading,
};
