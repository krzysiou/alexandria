import GithubSlugger from 'github-slugger';

type TocEntry = {
  id: string;
  text: string;
  level: 2 | 3;
};

/**
 * Removes inline markdown syntax so heading text matches what is rendered.
 */
const plainText = (markdown: string): string =>
  markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

/**
 * Builds the "On this page" list from `##` and `###` headings. Ids are created
 * exactly like rehype-slug does (github-slugger over every heading, in order).
 */
const tableOfContents = (markdown: string): TocEntry[] => {
  const slugger = new GithubSlugger();
  const entries: TocEntry[] = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    const match = inFence ? null : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match?.[1] || !match[2]) {
      continue;
    }
    const text = plainText(match[2]);
    const id = slugger.slug(text);
    const level = match[1].length;
    if (level === 2 || level === 3) {
      entries.push({ id, text, level });
    }
  }
  return entries;
};

export type { TocEntry };
export { tableOfContents };
