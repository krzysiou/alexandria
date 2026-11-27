import { describe, expect, it } from 'vitest';

import { tableOfContents } from '@/components/markdown-reader/table-of-contents';

describe('tableOfContents', () => {
  it('lists level 2 and 3 headings with rehype-slug compatible ids', () => {
    const markdown = [
      '# Title',
      '## Overview',
      'text',
      '```',
      '## not a heading',
      '```',
      '### **Main** idea',
      '## Overview',
    ].join('\n');
    expect(tableOfContents(markdown)).toEqual([
      { id: 'overview', text: 'Overview', level: 2 },
      { id: 'main-idea', text: 'Main idea', level: 3 },
      { id: 'overview-1', text: 'Overview', level: 2 },
    ]);
  });
});
