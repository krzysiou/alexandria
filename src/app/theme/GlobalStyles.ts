import { createGlobalStyle } from 'styled-components';

import type { Palette } from '@/app/theme/palettes';

import { paletteDeclarations } from '@/app/theme/palettes';
import { color, ease, font } from '@/app/theme/theme';

type GlobalStylesProps = {
  $palette: Palette;
  $readingFont: string;
  $uiFont: string;
};

const GlobalStyles = createGlobalStyle<GlobalStylesProps>`
  :root {
    color-scheme: light;

    ${({ $palette }) => paletteDeclarations($palette.light)}
    --success: #1d8150;
    --success-soft: #e2f3e9;
    --danger: #c23b3b;
    --danger-soft: #fbe8e6;
    --shadow-sm: 0 1px 2px rgb(29 27 23 / 6%), 0 1px 1px rgb(29 27 23 / 4%);
    --shadow-md: 0 8px 24px rgb(29 27 23 / 8%), 0 2px 6px rgb(29 27 23 / 5%);
    --shadow-lg: 0 24px 60px rgb(29 27 23 / 16%);
    --font-sans: ${({ $uiFont }) => $uiFont};
    --font-serif: ${({ $readingFont }) => $readingFont};
    --font-mono: ui-monospace, "SF Mono", menlo, monospace;
  }

  [data-theme="dark"] {
    color-scheme: dark;

    ${({ $palette }) => paletteDeclarations($palette.dark)}
    --success: #4cc28a;
    --success-soft: rgb(76 194 138 / 13%);
    --danger: #f07171;
    --danger-soft: rgb(240 113 113 / 13%);
    --shadow-sm: 0 1px 2px rgb(0 0 0 / 40%);
    --shadow-md: 0 8px 24px rgb(0 0 0 / 35%), 0 2px 6px rgb(0 0 0 / 30%);
    --shadow-lg: 0 24px 60px rgb(0 0 0 / 55%);
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
    margin: 0;
  }

  body {
    overflow: hidden;
    font-family: ${font.sans};
    font-size: 14px;
    line-height: 1.5;
    color: ${color.text};
    cursor: default;
    user-select: none;
    background: ${color.bg};
    -webkit-font-smoothing: antialiased;
    transition: background-color 0.2s ${ease}, color 0.2s ${ease};
  }

  h1,
  h2,
  h3 {
    margin: 0;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  h1 {
    font-family: ${font.serif};
    font-size: 30px;
    font-weight: 600;
    line-height: 1.2;
  }

  h2 {
    font-size: 16px;
  }

  h3 {
    font-size: 15px;
  }

  p {
    margin: 0;
  }

  code {
    font-family: ${font.mono};
    font-size: 0.9em;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
  }

  input,
  textarea {
    user-select: text;
  }

  :focus-visible {
    outline: 2px solid ${color.accent};
    outline-offset: 2px;
  }

  ::selection {
    background: ${color.accentSoft};
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${color.borderStrong};
    background-clip: content-box;
    border: 3px solid transparent;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }
`;

export type { GlobalStylesProps };
export { GlobalStyles };
