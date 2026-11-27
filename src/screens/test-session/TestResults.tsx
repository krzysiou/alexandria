import { useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, CircleDashed, RotateCcw, XCircle } from 'lucide-react';

import type { AttemptDetail, AttemptItem } from '@/services/tauri-bridge/types';

import { useNavigation } from '@/app/state/Navigation';
import { InlineMarkdown } from '@/components/markdown-reader/InlineMarkdown';
import { RichText } from '@/components/markdown-reader/RichText';
import { Button } from '@/components/ui-kit/Button.styles';
import { ErrorBanner, ScoreRing } from '@/components/ui-kit/Feedback';
import { Segmented } from '@/components/ui-kit/Form.styles';
import { CenterPad, Page, Row } from '@/components/ui-kit/Layout.styles';
import { Eyebrow, Text, ToneIcon } from '@/components/ui-kit/Text.styles';
import {
  Answers,
  Bullet,
  Explanation,
  Filter,
  Head,
  Item,
  ItemHead,
  ItemPrompt,
  List,
  OptionList,
  OptionRow,
  SelfGrade,
  Summary,
} from '@/screens/test-session/TestResults.styles';
import { api, errorMessage } from '@/services/tauri-bridge/commands';
import { answerText, KIND_LABEL, percent, plural, relativeDate } from '@/utils/display-format';

type FilterId = 'all' | 'mistakes' | 'review';

const SELF_GRADES = [
  { score: 0, label: 'Missed it' },
  { score: 0.5, label: 'Partly' },
  { score: 1, label: 'Got it' },
];

const isMistake = (item: AttemptItem): boolean => item.score !== null && item.score < 1;

const needsReview = (item: AttemptItem): boolean => item.score === null;

/**
 * Icon for a graded answer: full, partial, wrong or still to review.
 */
const ScoreIcon = ({ score }: { score: number | null }) => {
  if (score === null) {
    return (
      <ToneIcon $tone="gold">
        <CircleDashed size={20} />
      </ToneIcon>
    );
  }

  if (score > 0) {
    return (
      <ToneIcon $tone={score >= 1 ? 'success' : 'gold'}>
        <CheckCircle2 size={20} />
      </ToneIcon>
    );
  }

  return (
    <ToneIcon $tone="danger">
      <XCircle size={20} />
    </ToneIcon>
  );
};

/**
 * Multiple-choice options with the correct one and the learner's pick marked.
 */
const ChoiceReview = ({ item }: { item: AttemptItem }) => (
  <OptionList>
    {item.options.map((option, index) => {
      const correct = String(index) === item.answer;
      const chosen = String(index) === item.response;
      const state = correct ? 'correct' : chosen ? 'wrong' : 'neutral';

      return (
        <OptionRow key={option} $state={state}>
          {correct ? <Check size={14} /> : chosen ? <XCircle size={14} /> : <Bullet />}
          <span>
            <InlineMarkdown text={option} />
          </span>
          {chosen ? (
            <Text $tone="muted" $size="sm">
              your answer
            </Text>
          ) : null}
        </OptionRow>
      );
    })}
  </OptionList>
);

/**
 * One reviewed question: the learner's answer next to the correct one, the
 * explanation, and self-grading buttons for open questions.
 */
const ResultItem = ({ item, onGrade }: { item: AttemptItem; onGrade: (score: number) => void }) => {
  const response = answerText(item.kind, item.options, item.response);
  const section = item.sectionTitle ? ` · ${item.sectionTitle}` : '';

  return (
    <Item $pending={needsReview(item)}>
      <ItemHead>
        <ScoreIcon score={item.score} />
        <Text $tone="muted" $size="sm">
          {item.position + 1}. {KIND_LABEL[item.kind]}
          {section}
        </Text>
      </ItemHead>

      <ItemPrompt>
        <RichText text={item.prompt} />
      </ItemPrompt>

      {item.kind === 'multiple_choice' ? (
        <ChoiceReview item={item} />
      ) : (
        <Answers>
          <div>
            <Eyebrow>Your answer</Eyebrow>
            <Text as="p" $tone={response ? 'default' : 'muted'}>
              {response || 'No answer'}
            </Text>
          </div>
          <div>
            <Eyebrow>{item.kind === 'short_answer' ? 'Model answer' : 'Correct answer'}</Eyebrow>
            <RichText text={answerText(item.kind, item.options, item.answer)} />
          </div>
        </Answers>
      )}

      {item.explanation ? (
        <Explanation>
          <RichText text={item.explanation} />
        </Explanation>
      ) : null}

      {item.kind === 'short_answer' && response ? (
        <SelfGrade>
          <Text $tone="muted" $size="sm">
            {needsReview(item) ? 'How did you do? Compare with the model answer:' : 'Your self-assessment:'}
          </Text>
          <Segmented $size="sm">
            {SELF_GRADES.map(grade => (
              <button
                key={grade.score}
                type="button"
                aria-pressed={item.score === grade.score}
                onClick={() => onGrade(grade.score)}
              >
                {grade.label}
              </button>
            ))}
          </Segmented>
        </SelfGrade>
      ) : null}
    </Item>
  );
};

/**
 * Score summary and per-question review of a submitted test.
 */
const TestResults = ({ attempt, onChange }: { attempt: AttemptDetail; onChange: (detail: AttemptDetail) => void }) => {
  const { navigate } = useNavigation();
  const [filter, setFilter] = useState<FilterId>(attempt.status === 'review' ? 'review' : 'all');
  const [error, setError] = useState<string | null>(null);

  const toReview = attempt.items.filter(needsReview).length;
  const mistakes = attempt.items.filter(isMistake).length;
  const points = attempt.items.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const graded = attempt.status === 'graded';

  const visible = attempt.items.filter(item => {
    if (filter === 'mistakes') {
      return isMistake(item);
    }
    if (filter === 'review') {
      return needsReview(item);
    }
    return true;
  });

  const filters: { id: FilterId; label: string }[] = [
    { id: 'all', label: `All ${attempt.items.length}` },
    { id: 'mistakes', label: `Mistakes ${mistakes}` },
    { id: 'review', label: `To review ${toReview}` },
  ];

  const backToTests = () => navigate({ name: 'book', bookId: attempt.bookId, tab: 'tests' });

  const grade = async (item: AttemptItem, score: number) => {
    setError(null);
    try {
      onChange(await api.selfGrade(attempt.id, item.questionId, score));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <Page $width="narrow">
      <Head data-tauri-drag-region>
        <ScoreRing value={graded ? attempt.score : null} />

        <Summary>
          <Eyebrow>{attempt.bookTitle}</Eyebrow>
          <h1>{graded ? `You scored ${percent(attempt.score)}` : `${plural(toReview, 'open answer')} to review`}</h1>
          <Text as="p" $tone="muted">
            {points} of {plural(attempt.items.length, 'point')} · {relativeDate(attempt.startedAt)}
            {graded ? '' : ' · the final score appears once you have reviewed your open answers'}
          </Text>
          <Row>
            <Button onClick={backToTests}>
              <ArrowLeft size={15} /> Back to tests
            </Button>
            <Button $variant="primary" onClick={backToTests}>
              <RotateCcw size={15} /> New test
            </Button>
          </Row>
        </Summary>
      </Head>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <Filter>
        <Segmented>
          {filters.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </Segmented>
      </Filter>

      <List>
        {visible.map(item => (
          <ResultItem key={item.questionId} item={item} onGrade={score => grade(item, score)} />
        ))}
        {visible.length === 0 ? (
          <CenterPad>
            <Text $tone="muted">Nothing here.</Text>
          </CenterPad>
        ) : null}
      </List>
    </Page>
  );
};

export { TestResults };
