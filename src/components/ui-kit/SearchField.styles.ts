import styled from 'styled-components';

import { color, radius } from '@/app/theme/theme';

const Field = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 340px;
  color: ${color.textFaint};

  > svg {
    position: absolute;
    left: 11px;
    pointer-events: none;
  }
`;

const Input = styled.input`
  width: 100%;
  height: 34px;
  padding: 0 36px 0 34px;
  color: ${color.text};
  outline: none;
  background: ${color.surface};
  border: 1px solid ${color.borderStrong};
  border-radius: ${radius.sm};

  &:focus-visible {
    outline: none;
  }

  &:focus {
    border-color: ${color.accent};
    box-shadow: 0 0 0 3px ${color.accentSoft};
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`;

const Trailing = styled.span`
  position: absolute;
  right: 8px;
  display: flex;
  gap: 4px;
  align-items: center;
`;

const Clear = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  padding: 3px;
  color: ${color.textMuted};
  background: transparent;
  border: 0;
  border-radius: 6px;

  &:hover {
    color: ${color.text};
    background: ${color.surfaceHover};
  }
`;

export { Clear, Field, Input, Trailing };
