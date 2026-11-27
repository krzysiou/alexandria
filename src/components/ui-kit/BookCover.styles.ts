import styled, { css } from 'styled-components';

import { color, font, shadow } from '@/app/theme/theme';

type CoverSize = 'sm' | 'md' | 'lg';

const sizes: Record<CoverSize, ReturnType<typeof css>> = {
  sm: css`
    width: 28px;
    height: 40px;
    border-radius: 2px 4px 4px 2px;
    box-shadow: ${shadow.sm};
  `,
  md: css`
    width: 104px;
    height: 148px;
  `,
  lg: css`
    width: 100%;
    aspect-ratio: 2 / 3;
  `,
};

const Cover = styled.div<{ $size: CoverSize }>`
  flex-shrink: 0;
  overflow: hidden;
  background: ${color.surfaceHover};
  border-radius: 4px 7px 7px 4px;
  box-shadow: ${shadow.md}, inset 3px 0 0 rgb(0 0 0 / 12%);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  ${({ $size }) => sizes[$size]}
`;

const Placeholder = styled.div<{ $size: CoverSize }>`
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 100%;
  padding: ${({ $size }) => ($size === 'sm' ? '0' : '12%')};
  font-family: ${font.serif};
  font-size: ${({ $size }) => ($size === 'sm' ? '0' : '15px')};
  font-weight: 600;
  line-height: 1.2;
  color: #f6e9c8;
  background: linear-gradient(160deg, #3346b8, #121852);

  span {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
  }
`;

export type { CoverSize };
export { Cover, Placeholder };
