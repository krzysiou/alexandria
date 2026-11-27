import styled from 'styled-components';

import { color, font, radius } from '@/app/theme/theme';

const Body = styled.div`
  > :first-child {
    margin-top: 0;
  }

  > :last-child {
    margin-bottom: 0;
  }

  p {
    margin: 0 0 0.6em;
  }

  ul,
  ol {
    padding-left: 1.3em;
    margin: 0 0 0.6em;
  }

  code {
    padding: 0.08em 0.38em;
    font-family: ${font.mono};
    font-size: 0.84em;
    background: ${color.surfaceHover};
    border-radius: 5px;
  }

  pre {
    padding: 14px 16px;
    margin: 0.8em 0;
    overflow-x: auto;
    font-family: ${font.mono};
    font-size: 13.5px;
    font-weight: 400;
    line-height: 1.55;
    color: ${color.text};
    letter-spacing: 0;
    user-select: text;
    background: ${color.surface2};
    border: 1px solid ${color.border};
    border-radius: ${radius.sm};

    code {
      padding: 0;
      font-size: inherit;
      background: none;
    }
  }
`;

export { Body };
