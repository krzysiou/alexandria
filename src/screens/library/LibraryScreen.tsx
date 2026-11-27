import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { BookPlus, FileUp, Library, X } from 'lucide-react';

import type { ImportJob } from '@/app/state/Imports';
import type { Book } from '@/services/tauri-bridge/types';

import { useImports } from '@/app/state/Imports';
import { useNavigation } from '@/app/state/Navigation';
import { BookCover } from '@/components/ui-kit/BookCover';
import { Button, IconButton } from '@/components/ui-kit/Button.styles';
import { EmptyState, ErrorBanner, ProgressBar, Spinner, StatusBadge } from '@/components/ui-kit/Feedback';
import { Page, PageHeader } from '@/components/ui-kit/Layout.styles';
import { SearchField } from '@/components/ui-kit/SearchField';
import { Text } from '@/components/ui-kit/Text.styles';
import { useDebouncedValue } from '@/hooks/UseDebouncedValue';
import { useLibraryChanged } from '@/hooks/UseLibraryChanged';
import { useResource } from '@/hooks/UseResource';
import {
  Card,
  CardBody,
  CardMeta,
  CardProgress,
  CardTitle,
  Dropzone,
  Grid,
  HeaderActions,
  ImportBody,
  ImportName,
  ImportRow,
  Imports,
} from '@/screens/library/LibraryScreen.styles';
import { SearchResults } from '@/screens/library/SearchResults';
import { api } from '@/services/tauri-bridge/commands';
import { parseProgress, plural } from '@/utils/display-format';

/**
 * Opens the native file picker and imports the chosen PDFs.
 */
const pickPdfs = async (importFiles: (paths: string[]) => void) => {
  const selected = await open({ multiple: true, filters: [{ name: 'PDF books', extensions: ['pdf'] }] });
  if (selected) {
    importFiles(Array.isArray(selected) ? selected : [selected]);
  }
};

/**
 * Status line of an import in progress.
 */
const importStatus = (job: ImportJob): string => {
  if (job.stage === 'copying') {
    return 'Copying into your library…';
  }
  if (job.stage === 'saving') {
    return 'Preparing sections…';
  }
  return job.total > 0 ? `Reading page ${job.page} of ${job.total}…` : 'Opening PDF…';
};

/**
 * Row showing an import being read, or why it failed.
 */
const ImportItem = ({ job, onDismiss }: { job: ImportJob; onDismiss: () => void }) => (
  <ImportRow $failed={Boolean(job.error)}>
    {job.error ? <FileUp size={18} /> : <Spinner size={18} />}

    <ImportBody>
      <ImportName>{job.name}</ImportName>
      {job.error ? (
        <Text $tone="danger" $size="sm">
          {job.error}
        </Text>
      ) : (
        <>
          <Text $tone="muted" $size="sm">
            {importStatus(job)}
          </Text>
          <ProgressBar value={job.total > 0 ? job.page / job.total : 0} />
        </>
      )}
    </ImportBody>

    {job.error ? (
      <IconButton onClick={onDismiss} aria-label="Dismiss">
        <X size={16} />
      </IconButton>
    ) : null}
  </ImportRow>
);

/**
 * Cover card of a book in the library grid.
 */
const BookCard = ({ book }: { book: Book }) => {
  const { navigate } = useNavigation();

  return (
    <Card onClick={() => navigate({ name: 'book', bookId: book.id, tab: 'overview' })}>
      <BookCover book={book} size="lg" />
      <CardBody>
        <CardTitle>{book.title}</CardTitle>
        <CardMeta>{book.author ?? 'Unknown author'}</CardMeta>
        {book.status === 'ready' ? (
          <CardMeta>
            {plural(book.pageCount, 'page')} · {plural(book.questionCount, 'question')}
          </CardMeta>
        ) : (
          <CardProgress>
            <StatusBadge status={book.status} />
            <ProgressBar
              value={parseProgress(book.sectionsDone, book.sectionsTotal, book.stage)}
              tone={book.status === 'failed' ? 'gold' : 'accent'}
            />
          </CardProgress>
        )}
      </CardBody>
    </Card>
  );
};

/**
 * Home screen: every imported book plus imports currently being read.
 */
/**
 * Whether a book's title, author or summary contains every word of the query.
 */
const matchesQuery = (book: Book, query: string): boolean => {
  const haystack = [book.title, book.author, book.summary].filter(Boolean).join(' ').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(term => haystack.includes(term));
};

const SEARCH_DELAY_MS = 200;
const MIN_QUERY_CHARS = 2;

const LibraryScreen = () => {
  const books = useResource('library', api.listBooks);
  const { jobs, importFiles, dismiss } = useImports();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DELAY_MS);
  const searching = debouncedQuery.length >= MIN_QUERY_CHARS;
  const hits = useResource(`search:${debouncedQuery}`, () => api.searchLibrary(debouncedQuery), {
    keepPrevious: true,
  });
  useLibraryChanged(() => books.reload());

  const allBooks = (books.data ?? []).filter(book => book.status !== 'importing');
  const visibleBooks = query.trim() ? allBooks.filter(book => matchesQuery(book, query.trim())) : allBooks;
  const isEmpty = books.data !== undefined && allBooks.length === 0 && jobs.length === 0;

  return (
    <Page>
      <PageHeader data-tauri-drag-region>
        <div>
          <h1>Library</h1>
          <Text as="p" $tone="muted">
            {allBooks.length > 0
              ? `${plural(allBooks.length, 'book')} · drop PDFs anywhere to add more`
              : 'Your books, notes and tests live here.'}
          </Text>
        </div>
        <HeaderActions>
          {allBooks.length > 0 ? (
            <SearchField value={query} onChange={setQuery} placeholder="Search books and notes" />
          ) : null}
          <Button $variant="primary" onClick={() => pickPdfs(importFiles)}>
            <BookPlus size={16} /> Add book
          </Button>
        </HeaderActions>
      </PageHeader>

      {books.error ? <ErrorBanner>{books.error}</ErrorBanner> : null}

      {jobs.length > 0 ? (
        <Imports>
          {jobs.map(job => (
            <ImportItem key={job.id} job={job} onDismiss={() => dismiss(job.id)} />
          ))}
        </Imports>
      ) : null}

      {isEmpty ? (
        <Dropzone>
          <EmptyState
            icon={<Library size={30} />}
            title="Add your first book"
            action={
              <Button $variant="primary" onClick={() => pickPdfs(importFiles)}>
                <BookPlus size={16} /> Choose a PDF
              </Button>
            }
          >
            Drop a PDF here or choose one. Claude reads it once and prepares key data, structured notes and a question
            bank. After that, everything works offline.
          </EmptyState>
        </Dropzone>
      ) : (
        <>
          {query.trim() && visibleBooks.length === 0 ? (
            <Text as="p" $tone="muted">
              No book titles or authors match “{query.trim()}”.
            </Text>
          ) : (
            <Grid>
              {visibleBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </Grid>
          )}

          {searching ? (
            <SearchResults
              query={debouncedQuery}
              hits={hits.data?.length === 0 && hits.loading ? undefined : hits.data}
              searching={hits.loading}
            />
          ) : null}
        </>
      )}
    </Page>
  );
};

export { LibraryScreen };
