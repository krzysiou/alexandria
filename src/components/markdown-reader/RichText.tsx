import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Body } from '@/components/markdown-reader/RichText.styles';

/**
 * Compact markdown for questions, model answers and explanations: inherits the
 * surrounding typography and renders `code`, **bold**, lists and fenced code
 * blocks, which questions use to show the snippet they ask about.
 */
const RichText = ({ text }: { text: string }) => (
  <Body>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  </Body>
);

export { RichText };
