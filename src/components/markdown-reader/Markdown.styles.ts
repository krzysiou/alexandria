import styled from 'styled-components';

import { color, font, radius } from '@/app/theme/theme';

const Prose = styled.div`
  max-width: 74ch;
  margin: 0 auto;
  font-family: ${font.serif};
  font-size: 17px;
  line-height: 1.72;
  color: ${color.text};
  cursor: auto;
  user-select: text;

  > :first-child {
    margin-top: 0;
  }

  > :last-child {
    margin-bottom: 0;
  }

  h1,
  h2,
  h3,
  h4 {
    font-family: ${font.sans};
    line-height: 1.3;
    letter-spacing: -0.015em;
    scroll-margin-top: 24px;
  }

  h1 {
    margin: 0 0 8px;
    font-family: ${font.serif};
    font-size: 34px;
    font-weight: 650;
  }

  h1 + p em:only-child {
    font-family: ${font.sans};
    font-size: 13px;
    font-style: normal;
    color: ${color.textFaint};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  h2 {
    padding-bottom: 8px;
    margin: 2.2em 0 0.7em;
    font-size: 21px;
    font-weight: 700;
    border-bottom: 1px solid ${color.border};
  }

  h3 {
    margin: 1.8em 0 0.5em;
    font-size: 17px;
    font-weight: 700;
    color: ${color.accentText};
  }

  h4 {
    margin: 1.5em 0 0.4em;
    font-size: 15px;
    font-weight: 700;
  }

  p,
  ul,
  ol,
  blockquote,
  pre {
    margin: 0 0 1.05em;
  }

  ul,
  ol {
    padding-left: 1.4em;
  }

  li {
    padding-left: 0.2em;
    margin: 0.3em 0;
  }

  li > ul,
  li > ol {
    margin: 0.3em 0 0.4em;
  }

  ul li::marker {
    color: ${color.gold};
  }

  ol li::marker {
    font-family: ${font.sans};
    font-size: 0.85em;
    font-weight: 650;
    color: ${color.textFaint};
  }

  li:has(> input[type="checkbox"]) {
    margin-left: -1.2em;
    list-style: none;
  }

  input[type="checkbox"] {
    margin-right: 8px;
    accent-color: ${color.accent};
  }

  strong {
    font-weight: 700;
    color: ${color.text};
  }

  a {
    color: ${color.accentText};
    text-decoration: underline;
    text-decoration-color: ${color.accentSoft};
    text-underline-offset: 3px;

    &:hover {
      text-decoration-color: currentcolor;
    }
  }

  blockquote {
    padding: 14px 20px;
    font-style: italic;
    color: ${color.text};
    background: ${color.goldSoft};
    border-left: 4px solid ${color.gold};
    border-radius: 0 ${radius.sm} ${radius.sm} 0;

    p:last-child {
      margin-bottom: 0;
    }
  }

  h1 + p + blockquote,
  h1 + blockquote {
    font-size: 17.5px;
    font-style: normal;
    background: ${color.accentSoft};
    border-left-color: ${color.accent};
  }

  code {
    padding: 0.12em 0.4em;
    font-size: 0.82em;
    background: ${color.surfaceHover};
    border-radius: 5px;
  }

  pre {
    padding: 14px 16px;
    overflow-x: auto;
    line-height: 1.5;
    background: ${color.surface2};
    border: 1px solid ${color.border};
    border-radius: ${radius.sm};

    code {
      padding: 0;
      font-size: 13px;
      background: none;
    }
  }

  hr {
    height: 1px;
    margin: 2em 0;
    background: ${color.border};
    border: 0;
  }

  img {
    max-width: 100%;
    border-radius: ${radius.sm};
  }
`;

const TableWrap = styled.div`
  margin: 0 0 1.05em;
  overflow-x: auto;
  border: 1px solid ${color.border};
  border-radius: ${radius.sm};

  table {
    width: 100%;
    font-family: ${font.sans};
    font-size: 14px;
    line-height: 1.5;
    border-collapse: collapse;
  }

  th {
    font-size: 12px;
    font-weight: 650;
    color: ${color.textMuted};
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: ${color.surface2};
  }

  th,
  td {
    padding: 9px 14px;
    vertical-align: top;
    border-bottom: 1px solid ${color.border};
  }

  tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:nth-child(even) td {
    background: ${color.surface2};
  }

  td:first-child {
    font-weight: 600;
  }
`;

export { Prose, TableWrap };
