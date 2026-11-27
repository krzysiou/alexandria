import styled, { css } from 'styled-components';

import { color, ease, radius, shadow } from '@/app/theme/theme';

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  $variant?: ButtonVariant;
  $size?: ButtonSize;
  $armed?: boolean;
};

const armed = css`
  color: ${color.danger};
  background: ${color.dangerSoft};
  border-color: ${color.danger};
`;

const variants: Record<ButtonVariant, ReturnType<typeof css> | null> = {
  default: null,
  primary: css`
    color: ${color.onAccent};
    background: ${color.accent};
    border-color: ${color.accent};

    &:hover:not(:disabled) {
      background: ${color.accentHover};
      border-color: ${color.accentHover};
    }
  `,
  ghost: css`
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  `,
  danger: css`
    color: ${color.danger};
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  `,
};

const sizes: Record<ButtonSize, ReturnType<typeof css>> = {
  sm: css`
    height: 28px;
    padding: 0 10px;
    font-size: 12.5px;
  `,
  md: css`
    height: 34px;
    padding: 0 14px;
  `,
  lg: css`
    height: 42px;
    padding: 0 20px;
    font-size: 15px;
  `,
};

const Button = styled.button.attrs(({ type }) => ({ type: type ?? 'button' }))<ButtonProps>`
  display: inline-flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
  font-weight: 550;
  color: ${color.text};
  white-space: nowrap;
  background: ${color.surface};
  border: 1px solid ${color.borderStrong};
  border-radius: ${radius.sm};
  box-shadow: ${shadow.sm};
  transition:
    background-color 0.15s ${ease},
    border-color 0.15s ${ease},
    transform 0.1s ${ease};

  &:hover:not(:disabled) {
    background: ${color.surfaceHover};
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
  }

  ${({ $size }) => sizes[$size ?? 'md']}
  ${({ $variant }) => variants[$variant ?? 'default']}
  ${({ $armed }) => ($armed ? armed : '')}
`;

const IconButton = styled.button.attrs(({ type }) => ({ type: type ?? 'button' }))<{
  $armed?: boolean;
  $danger?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  font-size: 12.5px;
  color: ${({ $danger }) => ($danger ? color.danger : color.textMuted)};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${radius.sm};

  &:hover {
    color: ${({ $danger }) => ($danger ? color.danger : color.text)};
    background: ${({ $danger }) => ($danger ? color.dangerSoft : color.surfaceHover)};
  }

  ${({ $armed }) => ($armed ? armed : '')}
`;

export type { ButtonSize, ButtonVariant };
export { Button, IconButton };
