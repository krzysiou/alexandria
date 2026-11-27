import styled, { css } from 'styled-components';

import { color, radius, shadow } from '@/app/theme/theme';

const field = css`
  min-width: 0;
  outline: none;
  background: ${color.surface};
  border: 1px solid ${color.borderStrong};
  border-radius: ${radius.sm};

  &:focus {
    border-color: ${color.accent};
    box-shadow: 0 0 0 3px ${color.accentSoft};
  }

  &:focus-visible {
    outline: none;
  }
`;

const Input = styled.input`
  ${field}
  width: 100%;
  height: 34px;
  padding: 0 10px;
`;

const Select = styled.select`
  ${field}
  max-width: 100%;
  height: 34px;
  padding: 0 28px 0 10px;
`;

const TextArea = styled.textarea`
  ${field}
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  line-height: 1.55;
  resize: vertical;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FieldLabel = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${color.textMuted};
`;

const CheckRow = styled.label`
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  border-radius: ${radius.sm};

  &:hover {
    background: ${color.surfaceHover};
  }

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: ${color.accent};
  }

  > span:nth-child(2) {
    flex: 1;
    min-width: 0;
  }
`;

const Segmented = styled.div<{ $size?: 'sm' | 'md' }>`
  display: inline-flex;
  gap: 2px;
  align-self: flex-start;
  padding: 3px;
  background: ${color.surfaceHover};
  border-radius: 10px;

  button {
    height: ${({ $size }) => ($size === 'sm' ? '24px' : '28px')};
    padding: 0 12px;
    font-size: ${({ $size }) => ($size === 'sm' ? '12.5px' : 'inherit')};
    font-weight: 550;
    color: ${color.textMuted};
    white-space: nowrap;
    background: transparent;
    border: 0;
    border-radius: 7px;
  }

  button[aria-pressed="true"] {
    color: ${color.text};
    background: ${color.surface};
    box-shadow: ${shadow.sm};
  }
`;

const Chip = styled.span<{ $tone?: 'easy' | 'medium' | 'hard' }>`
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 550;
  color: ${({ $tone }) =>
    $tone === 'easy'
      ? color.success
      : $tone === 'medium'
        ? color.gold
        : $tone === 'hard'
          ? color.danger
          : color.textMuted};
  white-space: nowrap;
  background: ${color.surface2};
  border: 1px solid ${color.border};
  border-radius: 20px;
`;

export { CheckRow, Chip, Field, FieldLabel, Input, Segmented, Select, TextArea };
