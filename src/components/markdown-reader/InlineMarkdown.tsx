import type { ReactNode } from 'react';

import { Code } from '@/components/markdown-reader/InlineMarkdown.styles';

const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*)/g;

/**
 * Renders the inline markdown Claude uses in questions and answers: `code`
 * and **bold**. Everything else stays plain text.
 */
const InlineMarkdown = ({ text }: { text: string }) => {
  let offset = 0;

  const parts: ReactNode[] = text.split(TOKEN).map(part => {
    const key = offset;
    offset += part.length;

    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return <Code key={key}>{part.slice(1, -1)}</Code>;
    }
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });

  return <>{parts}</>;
};

export { InlineMarkdown };
