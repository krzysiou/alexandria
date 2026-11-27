import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';

import type { DocumentInfo, DocumentKind } from '@/services/tauri-bridge/types';

import {
  Body,
  DocLink,
  Group,
  Nav,
  Reader,
  SideHeading,
  Toc,
  TocLink,
} from '@/components/markdown-reader/DocumentReader.styles';
import { Markdown } from '@/components/markdown-reader/Markdown';
import { ReadingMode } from '@/components/markdown-reader/ReadingMode';
import { tableOfContents } from '@/components/markdown-reader/table-of-contents';
import { EmptyState, ErrorBanner, Spinner } from '@/components/ui-kit/Feedback';
import { CenterPad } from '@/components/ui-kit/Layout.styles';
import { useResource } from '@/hooks/UseResource';
import { api } from '@/services/tauri-bridge/commands';
import { scrollMainToTop } from '@/utils/scroll';

type Props = {
  bookId: string;
  bookTitle: string;
  initialDoc?: string;
  kind: DocumentKind;
  reading: boolean;
  onReadingChange: (reading: boolean) => void;
  version: string;
  emptyTitle: string;
  emptyText: string;
};

const GROUPS: { id: DocumentInfo['group']; label: string }[] = [
  { id: 'Book', label: 'Whole book' },
  { id: 'Sections', label: 'Sections' },
];

/**
 * Three-column markdown reader: document list, rendered document and an
 * "On this page" outline. Reads the files from the book's folder.
 */
const DocumentReader = ({
  bookId,
  bookTitle,
  initialDoc,
  kind,
  reading,
  onReadingChange,
  version,
  emptyTitle,
  emptyText,
}: Props) => {
  const documents = useResource(
    `${bookId}:${kind}:${version}`,
    async () => ({ kind, files: await api.listDocuments(bookId, kind) }),
    { keepPrevious: true },
  );
  const [selected, setSelected] = useState<string | null>(initialDoc ?? null);

  const listKind = documents.data?.kind ?? kind;
  const files = documents.data?.files ?? [];
  const ordered = GROUPS.flatMap(group => files.filter(doc => doc.group === group.id));
  const active = ordered.find(doc => doc.file === selected) ?? ordered[0] ?? null;
  const activeIndex = active ? ordered.indexOf(active) : 0;

  const content = useResource(
    `${bookId}:${listKind}:${active?.file ?? ''}:${version}`,
    async () => (active ? api.readDocument(bookId, listKind, active.file) : ''),
    { keepPrevious: true },
  );
  const toc = useMemo(() => tableOfContents(content.data ?? ''), [content.data]);

  const open = (file: string) => {
    setSelected(file);
    scrollMainToTop(false);
  };

  const hasDocuments = ordered.length > 0;

  useEffect(() => {
    if (reading || !hasDocuments) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (!typing && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 'f') {
        onReadingChange(true);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reading, hasDocuments, onReadingChange]);

  if (documents.error) {
    return <ErrorBanner>{documents.error}</ErrorBanner>;
  }

  if (!documents.data) {
    return (
      <CenterPad>
        <Spinner />
      </CenterPad>
    );
  }

  if (files.length === 0) {
    return (
      <EmptyState icon={<FileText size={28} />} title={emptyTitle}>
        {emptyText}
      </EmptyState>
    );
  }

  return (
    <Reader>
      <Nav>
        {GROUPS.map(group => {
          const docs = ordered.filter(doc => doc.group === group.id);
          if (docs.length === 0) {
            return null;
          }

          return (
            <Group key={group.id}>
              <SideHeading>{group.label}</SideHeading>
              {docs.map(doc => (
                <DocLink
                  key={doc.file}
                  $active={doc.file === active?.file}
                  onClick={() => open(doc.file)}
                  title={doc.title}
                >
                  {doc.title}
                </DocLink>
              ))}
            </Group>
          );
        })}
      </Nav>

      <Body>
        {content.error ? <ErrorBanner>{content.error}</ErrorBanner> : null}
        {content.data === undefined ? <Spinner /> : <Markdown content={content.data} />}
      </Body>

      <Toc>
        {toc.length > 0 ? <SideHeading>On this page</SideHeading> : null}
        {toc.map(entry => (
          <TocLink
            key={entry.id}
            $level={entry.level}
            onClick={() => document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {entry.text}
          </TocLink>
        ))}
      </Toc>

      {reading && hasDocuments ? (
        <ReadingMode
          bookTitle={bookTitle}
          documents={ordered}
          index={activeIndex}
          content={content.data}
          onNavigate={index => setSelected(ordered[index]?.file ?? null)}
          onExit={() => onReadingChange(false)}
        />
      ) : null}
    </Reader>
  );
};

export { DocumentReader };
