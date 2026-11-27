import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import {
  BookOpen,
  ClipboardCheck,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';

import type { BookTab } from '@/app/state/Navigation';
import type { Book } from '@/services/tauri-bridge/types';

import { useNavigation } from '@/app/state/Navigation';
import { DocumentReader } from '@/components/markdown-reader/DocumentReader';
import { BookCover } from '@/components/ui-kit/BookCover';
import { Button, IconButton } from '@/components/ui-kit/Button.styles';
import { ConfirmButton } from '@/components/ui-kit/ConfirmButton';
import { ErrorBanner, ProgressBar, Spinner, StatusBadge } from '@/components/ui-kit/Feedback';
import { CenterPad, Page } from '@/components/ui-kit/Layout.styles';
import { Text } from '@/components/ui-kit/Text.styles';
import { useLibraryChanged } from '@/hooks/UseLibraryChanged';
import { useResource } from '@/hooks/UseResource';
import {
  Actions,
  Header,
  HeaderBody,
  Progress,
  Tab,
  TabActions,
  Tabs,
  Title,
} from '@/screens/book-detail/BookScreen.styles';
import { OverviewTab } from '@/screens/book-detail/OverviewTab';
import { TestsTab } from '@/screens/book-detail/TestsTab';
import { api, errorMessage } from '@/services/tauri-bridge/commands';
import { parseProgress, plural, usd } from '@/utils/display-format';

const TABS: { id: BookTab; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
  { id: 'notes', label: 'Notes', icon: <FileText size={15} /> },
  { id: 'key-data', label: 'Key data', icon: <ListChecks size={15} /> },
  { id: 'tests', label: 'Tests', icon: <ClipboardCheck size={15} /> },
];

const EMPTY_DOCUMENTS = {
  notes: {
    title: 'No notes yet',
    text: 'Structured notes appear here section by section while Claude reads the book.',
  },
  'key-data': {
    title: 'No key data yet',
    text: 'The most important concepts, facts and quotes of each section appear here as they are extracted.',
  },
};

/**
 * One-line description of what the parsing job is doing right now.
 */
const progressText = (book: Book, costCapUsd: number): string => {
  const spending = book.costUsd > 0 ? ` · ${usd(book.costUsd)} of ${usd(costCapUsd)}` : '';

  if (book.status === 'queued') {
    return 'Waiting to start…';
  }
  if (book.stage === 'book') {
    return 'Writing the book overview, glossary and cross-chapter questions…';
  }
  return `Claude is reading the book · ${book.sectionsDone} of ${plural(book.sectionsTotal, 'section')} done${spending}`;
};

/**
 * A single book: header with parsing status and actions, and tabs for the
 * overview, notes, key data and tests.
 */
const BookScreen = ({ bookId, tab, doc }: { bookId: string; tab: BookTab; doc?: string }) => {
  const { navigate } = useNavigation();
  const detail = useResource(`book:${bookId}`, () => api.getBook(bookId));
  const [reading, setReading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useLibraryChanged(changed => {
    if (changed === bookId) {
      detail.reload();
    }
  });

  useEffect(() => {
    if (detail.error?.includes('not found')) {
      navigate({ name: 'library' });
    }
  }, [detail.error, navigate]);

  if (!detail.data) {
    return <CenterPad>{detail.error ? <ErrorBanner>{detail.error}</ErrorBanner> : <Spinner />}</CenterPad>;
  }

  const { book, sections } = detail.data;
  const running = book.status === 'processing' || book.status === 'queued';
  const canResume = book.status === 'paused' || book.status === 'failed';
  const version = `${book.sectionsDone}:${book.stage ?? ''}:${book.status}`;

  const remove = async () => {
    await api.deleteBook(book.id);
    navigate({ name: 'library' });
  };

  const savePdf = async () => {
    const destination = await save({
      defaultPath: book.fileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (!destination) {
      return;
    }

    setSaveError(null);
    try {
      await api.saveBookPdf(book.id, destination);
    } catch (error) {
      setSaveError(errorMessage(error));
    }
  };

  return (
    <Page $width="wide">
      <Header data-tauri-drag-region>
        <BookCover book={book} size="md" />

        <HeaderBody>
          <StatusBadge status={book.status} />
          <Title>{book.title}</Title>
          <Text as="p" $tone="muted">
            {book.author ?? 'Unknown author'} · {plural(book.pageCount, 'page')}
          </Text>
          {running ? (
            <Progress>
              <ProgressBar value={parseProgress(book.sectionsDone, book.sectionsTotal, book.stage)} />
              <Text $tone="muted" $size="sm">
                {progressText(book, detail.data.costCapUsd)}
              </Text>
            </Progress>
          ) : null}
        </HeaderBody>

        <Actions>
          {running ? (
            <Button onClick={() => api.pauseBook(book.id)}>
              <Pause size={15} /> Pause
            </Button>
          ) : null}
          {canResume ? (
            <Button $variant="primary" onClick={() => api.resumeBook(book.id)}>
              <Play size={15} /> Resume
            </Button>
          ) : null}
          <IconButton title="Save PDF" aria-label="Save PDF" onClick={savePdf}>
            <Download size={17} />
          </IconButton>
          <IconButton title="Show in Finder" aria-label="Show in Finder" onClick={() => api.revealInFinder(book.id)}>
            <FolderOpen size={17} />
          </IconButton>
          <ConfirmButton icon onConfirm={remove} confirmLabel="Delete book?" title="Delete book">
            <Trash2 size={17} />
          </ConfirmButton>
        </Actions>
      </Header>

      {saveError ? <ErrorBanner>{saveError}</ErrorBanner> : null}

      <Tabs role="tablist">
        {TABS.map(item => (
          <Tab
            key={item.id}
            aria-selected={tab === item.id}
            onClick={() => navigate({ name: 'book', bookId, tab: item.id })}
          >
            {item.icon}
            {item.label}
          </Tab>
        ))}
        {tab === 'notes' || tab === 'key-data' ? (
          <TabActions>
            <Button $variant="ghost" $size="sm" onClick={() => setReading(true)}>
              <BookOpen size={15} /> Reading mode
            </Button>
          </TabActions>
        ) : null}
      </Tabs>

      {tab === 'overview' ? <OverviewTab book={book} sections={sections} costCapUsd={detail.data.costCapUsd} /> : null}
      {tab === 'notes' || tab === 'key-data' ? (
        <DocumentReader
          bookId={book.id}
          bookTitle={book.title}
          initialDoc={doc}
          kind={tab}
          reading={reading}
          onReadingChange={setReading}
          version={version}
          emptyTitle={EMPTY_DOCUMENTS[tab].title}
          emptyText={EMPTY_DOCUMENTS[tab].text}
        />
      ) : null}
      {tab === 'tests' ? <TestsTab book={book} sections={sections} /> : null}
    </Page>
  );
};

export { BookScreen };
