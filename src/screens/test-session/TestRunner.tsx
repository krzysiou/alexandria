import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Flag, X } from 'lucide-react';

import type { AttemptDetail, AttemptItem } from '@/services/tauri-bridge/types';

import { useNavigation } from '@/app/state/Navigation';
import { InlineMarkdown } from '@/components/markdown-reader/InlineMarkdown';
import { RichText } from '@/components/markdown-reader/RichText';
import { Button } from '@/components/ui-kit/Button.styles';
import { ConfirmButton } from '@/components/ui-kit/ConfirmButton';
import { ErrorBanner, ProgressBar, Spinner } from '@/components/ui-kit/Feedback';
import { Chip, TextArea } from '@/components/ui-kit/Form.styles';
import { Text } from '@/components/ui-kit/Text.styles';
import {
  Dot,
  Dots,
  Foot,
  Head,
  HeadProgress,
  Option,
  OptionKey,
  Options,
  Prompt,
  QuestionCard,
  QuestionMeta,
  Runner,
} from '@/screens/test-session/TestRunner.styles';
import { api, errorMessage } from '@/services/tauri-bridge/commands';
import { KIND_LABEL } from '@/utils/display-format';

type Responses = Record<number, string | null>;

const LETTERS = 'ABCDEF';
const TEXT_SAVE_DELAY_MS = 600;

/**
 * True when a response holds a real answer.
 */
const isAnswered = (value: string | null | undefined): boolean => (value ?? '').trim() !== '';

/**
 * Answer controls for one question: option cards, true/false or a text area.
 */
const AnswerInput = ({
  item,
  value,
  onChange,
}: {
  item: AttemptItem;
  value: string | null;
  onChange: (value: string | null) => void;
}) => {
  if (item.kind === 'multiple_choice') {
    return (
      <Options>
        {item.options.map((option, index) => {
          const selected = value === String(index);

          return (
            <Option key={option} $selected={selected} onClick={() => onChange(String(index))}>
              <OptionKey $selected={selected}>{LETTERS[index]}</OptionKey>
              <span>
                <InlineMarkdown text={option} />
              </span>
            </Option>
          );
        })}
      </Options>
    );
  }

  if (item.kind === 'true_false') {
    return (
      <Options $row>
        {(['true', 'false'] as const).map(option => {
          const selected = value === option;

          return (
            <Option key={option} $selected={selected} onClick={() => onChange(option)}>
              <OptionKey $selected={selected}>{option === 'true' ? 'T' : 'F'}</OptionKey>
              <span>{option === 'true' ? 'True' : 'False'}</span>
            </Option>
          );
        })}
      </Options>
    );
  }

  return (
    <TextArea
      placeholder="Write your answer in your own words. You will compare it with the model answer after finishing."
      value={value ?? ''}
      onChange={event => onChange(event.target.value)}
      rows={6}
    />
  );
};

/**
 * Takes a test one question at a time. Answers are saved as you go, so a test
 * can be left and resumed later from the book's history.
 */
const TestRunner = ({
  attempt,
  onSubmitted,
}: {
  attempt: AttemptDetail;
  onSubmitted: (detail: AttemptDetail) => void;
}) => {
  const { navigate } = useNavigation();
  const items = attempt.items;
  const total = items.length;

  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex(item => !isAnswered(item.response)),
    ),
  );
  const [responses, setResponses] = useState<Responses>(() =>
    Object.fromEntries(items.map(item => [item.questionId, item.response])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const item = items[index];
  const answered = items.filter(entry => isAnswered(responses[entry.questionId])).length;
  const unanswered = total - answered;
  const isLast = index === total - 1;

  const setAnswer = useCallback(
    (questionId: number, value: string | null, immediate: boolean) => {
      setResponses(current => ({ ...current, [questionId]: value }));

      window.clearTimeout(saveTimer.current);
      const save = () => api.saveAnswer(attempt.id, questionId, value).catch(() => undefined);
      if (immediate) {
        save();
      } else {
        saveTimer.current = window.setTimeout(save, TEXT_SAVE_DELAY_MS);
      }
    },
    [attempt.id],
  );

  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(total - 1, next))), [total]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const detail = await api.submitTest(
        attempt.id,
        items.map(entry => ({ questionId: entry.questionId, response: responses[entry.questionId] ?? null })),
      );
      onSubmitted(detail);
    } catch (caught) {
      setError(errorMessage(caught));
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement).tagName === 'TEXTAREA';
      if (!item || typing || event.metaKey || event.ctrlKey) {
        return;
      }

      const key = event.key.toUpperCase();

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        go(index + 1);
      } else if (event.key === 'ArrowLeft') {
        go(index - 1);
      } else if (item.kind === 'multiple_choice') {
        const position = /^[1-6]$/.test(key) ? Number(key) - 1 : LETTERS.indexOf(key);
        if (position >= 0 && position < item.options.length) {
          setAnswer(item.questionId, String(position), true);
        }
      } else if (item.kind === 'true_false' && (key === 'T' || key === 'F')) {
        setAnswer(item.questionId, key === 'T' ? 'true' : 'false', true);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, item, setAnswer]);

  if (!item) {
    return null;
  }

  const finishButton = submitting ? (
    <Button $variant="primary" disabled>
      <Spinner size={15} /> Grading…
    </Button>
  ) : unanswered > 0 ? (
    <ConfirmButton onConfirm={submit} variant="primary" confirmLabel={`Finish with ${unanswered} unanswered?`}>
      <Flag size={15} /> Finish test
    </ConfirmButton>
  ) : (
    <Button $variant="primary" onClick={submit}>
      <Flag size={15} /> Finish test
    </Button>
  );

  return (
    <Runner>
      <Head data-tauri-drag-region>
        <Button
          $variant="ghost"
          $size="sm"
          onClick={() => navigate({ name: 'book', bookId: attempt.bookId, tab: 'tests' })}
        >
          <X size={15} /> Leave
        </Button>
        <HeadProgress>
          <Text $tone="muted" $size="sm">
            Question {index + 1} of {total} · {attempt.bookTitle}
          </Text>
          <ProgressBar value={answered / total} />
        </HeadProgress>
        <Text $tone="muted" $size="sm">
          {answered} answered
        </Text>
      </Head>

      <QuestionCard>
        <QuestionMeta>
          <Chip>{KIND_LABEL[item.kind]}</Chip>
          <Chip $tone={item.difficulty}>{item.difficulty}</Chip>
          {item.sectionTitle ? (
            <Text $tone="muted" $size="sm">
              {item.sectionTitle}
            </Text>
          ) : null}
        </QuestionMeta>

        <Prompt>
          <RichText text={item.prompt} />
        </Prompt>

        <AnswerInput
          item={item}
          value={responses[item.questionId] ?? null}
          onChange={value => setAnswer(item.questionId, value, item.kind !== 'short_answer')}
        />
      </QuestionCard>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <Foot>
        <Button disabled={index === 0} onClick={() => go(index - 1)}>
          <ArrowLeft size={15} /> Previous
        </Button>

        <Dots>
          {items.map((entry, position) => (
            <Dot
              key={entry.questionId}
              aria-label={`Question ${position + 1}`}
              $current={position === index}
              $answered={isAnswered(responses[entry.questionId])}
              onClick={() => go(position)}
            />
          ))}
        </Dots>

        {isLast || unanswered === 0 ? (
          finishButton
        ) : (
          <Button $variant="primary" onClick={() => go(index + 1)}>
            Next <ArrowRight size={15} />
          </Button>
        )}
      </Foot>
    </Runner>
  );
};

export { TestRunner };
