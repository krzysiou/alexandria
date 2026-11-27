import type { ReactNode } from 'react';

import type { SearchHit } from '@/services/tauri-bridge/types';

import { useNavigation } from '@/app/state/Navigation';
import { Spinner } from '@/components/ui-kit/Feedback';
import { Chip } from '@/components/ui-kit/Form.styles';
import { Text } from '@/components/ui-kit/Text.styles';
import { Heading, Hit, HitTitle, List, Section, Snippet } from '@/screens/library/SearchResults.styles';
import { plural } from '@/utils/display-format';

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  notes: 'Notes',
  'key-data': 'Key data',
};

/**
 * Escapes a string for use inside a regular expression.
 */
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Wraps every occurrence of the query terms in `<mark>`.
 */
const highlight = (text: string, query: string): ReactNode[] => {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (terms.length === 0) {
    return [text];
  }

  const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
  const matcher = new RegExp(`^(${terms.join('|')})$`, 'i');
  let offset = 0;

  return text.split(pattern).map(part => {
    const start = offset;
    offset += part.length;
    return matcher.test(part) ? <mark key={start}>{part}</mark> : part;
  });
};

type Props = {
  query: string;
  hits: SearchHit[] | undefined;
  searching: boolean;
};

/**
 * Full-text matches in the notes and key data of every book.
 */
const SearchResults = ({ query, hits, searching }: Props) => {
  const { navigate } = useNavigation();

  return (
    <Section>
      <Heading>
        <h2>In notes & key data</h2>
        <Text $tone="muted" $size="sm">
          {hits ? plural(hits.length, 'match', 'matches') : ''}
        </Text>
        {searching ? <Spinner size={13} /> : null}
      </Heading>

      {hits && hits.length === 0 ? (
        <Text as="p" $tone="muted">
          Nothing in your notes mentions “{query.trim()}”.
        </Text>
      ) : null}

      {hits && hits.length > 0 ? (
        <List>
          {hits.map(hit => (
            <Hit
              key={`${hit.bookId}:${hit.kind}:${hit.file}`}
              onClick={() => navigate({ name: 'book', bookId: hit.bookId, tab: hit.kind, doc: hit.file })}
            >
              <HitTitle>
                <Chip>{KIND_LABEL[hit.kind]}</Chip>
                <span>
                  {hit.title}
                  <Text $tone="muted"> · {hit.bookTitle}</Text>
                </span>
              </HitTitle>
              <Snippet>{highlight(hit.snippet, query)}</Snippet>
            </Hit>
          ))}
        </List>
      ) : null}
    </Section>
  );
};

export { SearchResults };
