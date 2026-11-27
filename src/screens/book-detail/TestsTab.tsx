import { useState } from 'react';
import { ClipboardCheck, Play, Trash2 } from 'lucide-react';

import type { AttemptSummary, Book, QuestionKind, Section } from '@/services/tauri-bridge/types';

import { useNavigation } from '@/app/state/Navigation';
import { Button } from '@/components/ui-kit/Button.styles';
import { ConfirmButton } from '@/components/ui-kit/ConfirmButton';
import { EmptyState, ErrorBanner, ProgressBar } from '@/components/ui-kit/Feedback';
import { CheckRow, FieldLabel, Segmented } from '@/components/ui-kit/Form.styles';
import { Card, CardHead, Stack, Stat, StatGrid, StatLabel, StatValue } from '@/components/ui-kit/Layout.styles';
import { Text } from '@/components/ui-kit/Text.styles';
import { useLibraryChanged } from '@/hooks/UseLibraryChanged';
import { useResource } from '@/hooks/UseResource';
import {
  HistoryMain,
  HistoryRow,
  HistoryScore,
  HistoryText,
  Layout,
  MasteryList,
  MasteryRow,
  MasteryTitle,
  MasteryValue,
  NewTestCard,
  NewTestFooter,
  NewTestOptions,
  PickList,
} from '@/screens/book-detail/TestsTab.styles';
import { api, errorMessage } from '@/services/tauri-bridge/commands';
import { KIND_LABEL, percent, plural, relativeDate } from '@/utils/display-format';

const COUNTS = [10, 20, 30, 50];
const KINDS: QuestionKind[] = ['multiple_choice', 'true_false', 'short_answer'];

/**
 * Adds `value` to `list`, or removes it when already present.
 */
const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter(item => item !== value) : [...list, value];

/**
 * Form for starting a new test: scope, length, question types and focus.
 */
const NewTest = ({ book, sections }: { book: Book; sections: Section[] }) => {
  const { navigate } = useNavigation();
  const [scope, setScope] = useState<'all' | 'pick'>('all');
  const [picked, setPicked] = useState<number[]>([]);
  const [includeBook, setIncludeBook] = useState(true);
  const [count, setCount] = useState(20);
  const [kinds, setKinds] = useState<QuestionKind[]>(KINDS);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const withQuestions = sections.filter(section => section.questionCount > 0);
  const nothingPicked = scope === 'pick' && picked.length === 0 && !includeBook;

  const start = async () => {
    setError(null);
    setStarting(true);

    try {
      const attemptId = await api.startTest(book.id, {
        sectionIds: scope === 'pick' ? picked : [],
        includeBook: scope === 'all' || includeBook,
        count,
        kinds,
      });
      navigate({ name: 'test', attemptId });
    } catch (caught) {
      setError(errorMessage(caught));
      setStarting(false);
    }
  };

  return (
    <NewTestCard>
      <h2>New test</h2>

      <NewTestOptions>
        <FieldLabel>Cover</FieldLabel>
        <Segmented>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            Whole book
          </button>
          <button type="button" aria-pressed={scope === 'pick'} onClick={() => setScope('pick')}>
            Choose sections
          </button>
        </Segmented>

        {scope === 'pick' ? (
          <PickList>
            {withQuestions.map(section => (
              <CheckRow key={section.id}>
                <input
                  type="checkbox"
                  checked={picked.includes(section.id)}
                  onChange={() => setPicked(current => toggle(current, section.id))}
                />
                <span>{section.title}</span>
                <Text $tone="muted" $size="sm">
                  {section.questionCount}
                </Text>
              </CheckRow>
            ))}
            <CheckRow>
              <input type="checkbox" checked={includeBook} onChange={() => setIncludeBook(value => !value)} />
              <span>Cross-chapter questions</span>
            </CheckRow>
          </PickList>
        ) : null}

        <FieldLabel>Questions</FieldLabel>
        <Segmented>
          {COUNTS.map(value => (
            <button key={value} type="button" aria-pressed={count === value} onClick={() => setCount(value)}>
              {value}
            </button>
          ))}
        </Segmented>

        <FieldLabel>Types</FieldLabel>
        <Segmented>
          {KINDS.map(kind => (
            <button
              key={kind}
              type="button"
              aria-pressed={kinds.includes(kind)}
              onClick={() => setKinds(current => toggle(current, kind))}
            >
              {KIND_LABEL[kind]}
            </button>
          ))}
        </Segmented>
      </NewTestOptions>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <NewTestFooter>
        <Text $tone="muted" $size="sm">
          {plural(book.questionCount, 'question')} in the bank
        </Text>
        <Button $variant="primary" disabled={starting || kinds.length === 0 || nothingPicked} onClick={start}>
          <Play size={15} /> Start test
        </Button>
      </NewTestFooter>
    </NewTestCard>
  );
};

/**
 * One finished or in-progress test in the history list.
 */
const HistoryItem = ({ attempt }: { attempt: AttemptSummary }) => {
  const { navigate } = useNavigation();

  const note =
    attempt.status === 'in_progress'
      ? ' · in progress'
      : attempt.status === 'review'
        ? ' · open answers to review'
        : '';

  return (
    <HistoryRow>
      <HistoryMain onClick={() => navigate({ name: 'test', attemptId: attempt.id })}>
        <HistoryScore $good={attempt.score !== null && attempt.score >= 0.8}>
          {attempt.status === 'in_progress' ? '…' : percent(attempt.score)}
        </HistoryScore>
        <HistoryText>
          <span>{plural(attempt.questionCount, 'question')}</span>
          <Text $tone="muted" $size="sm">
            {relativeDate(attempt.startedAt)}
            {note}
          </Text>
        </HistoryText>
      </HistoryMain>

      <ConfirmButton icon onConfirm={() => api.deleteTest(attempt.id)} confirmLabel="Delete?" title="Delete test">
        <Trash2 size={15} />
      </ConfirmButton>
    </HistoryRow>
  );
};

/**
 * Tests for a book: start a new one, mastery per section and past results.
 * Everything here works offline from the stored question bank.
 */
const TestsTab = ({ book, sections }: { book: Book; sections: Section[] }) => {
  const stats = useResource(`stats:${book.id}`, () => api.quizStats(book.id));
  const history = useResource(`history:${book.id}`, () => api.listTests(book.id));

  useLibraryChanged(changed => {
    if (changed === book.id) {
      stats.reload();
      history.reload();
    }
  });

  if (book.questionCount === 0) {
    return (
      <EmptyState icon={<ClipboardCheck size={28} />} title="No questions yet">
        Claude writes test questions for every section while it reads the book. They appear here as soon as the first
        section is done.
      </EmptyState>
    );
  }

  const tiles = [
    { label: 'tests taken', value: String(stats.data?.attempts ?? 0) },
    { label: 'best score', value: percent(stats.data?.bestScore) },
    { label: 'average', value: percent(stats.data?.averageScore) },
  ];
  const attempts = history.data ?? [];

  return (
    <Layout>
      <NewTest book={book} sections={sections} />

      <Stack>
        <StatGrid $columns={3}>
          {tiles.map(tile => (
            <Stat key={tile.label}>
              <StatValue>{tile.value}</StatValue>
              <StatLabel>{tile.label}</StatLabel>
            </Stat>
          ))}
        </StatGrid>

        <Card>
          <CardHead>
            <h2>Mastery</h2>
            <Text $tone="muted" $size="sm">
              average score per section
            </Text>
          </CardHead>
          <MasteryList>
            {(stats.data?.sections ?? []).map(row => (
              <MasteryRow key={row.sectionId ?? 'book'}>
                <MasteryTitle title={row.title}>{row.title}</MasteryTitle>
                <ProgressBar
                  value={row.mastery ?? 0}
                  tone={row.mastery === null ? 'accent' : row.mastery >= 0.8 ? 'success' : 'gold'}
                />
                <MasteryValue>{row.mastery === null ? 'new' : percent(row.mastery)}</MasteryValue>
              </MasteryRow>
            ))}
          </MasteryList>
        </Card>

        <Card>
          <CardHead>
            <h2>History</h2>
          </CardHead>
          {attempts.length === 0 ? (
            <Text as="p" $tone="muted">
              Your finished tests will show up here.
            </Text>
          ) : (
            attempts.map(attempt => <HistoryItem key={attempt.id} attempt={attempt} />)
          )}
        </Card>
      </Stack>
    </Layout>
  );
};

export { TestsTab };
