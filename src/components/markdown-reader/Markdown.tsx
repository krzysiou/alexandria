import type { Components } from 'react-markdown';

import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import { Prose, TableWrap } from '@/components/markdown-reader/Markdown.styles';
import { api } from '@/services/tauri-bridge/commands';

const EXTERNAL_LINK = /^https?:\/\//;

const components: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      onClick={event => {
        if (href && EXTERNAL_LINK.test(href)) {
          event.preventDefault();
          void api.openExternal(href.replace(/^http:/, 'https:'));
        }
      }}
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <TableWrap>
      <table>{children}</table>
    </TableWrap>
  ),
  input: ({ checked, type }) => <input type={type} checked={checked} readOnly disabled />,
};

/**
 * Renders GitHub-flavored markdown (tables, task lists, strikethrough) with
 * book-like reading typography. Headings get ids so the table of contents
 * can link to them; external links open in the default browser.
 */
const Markdown = ({ content }: { content: string }) => (
  <Prose>
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
      {content}
    </ReactMarkdown>
  </Prose>
);

export { Markdown };
