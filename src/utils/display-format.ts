import type { BookStatus, QuestionKind } from '@/services/tauri-bridge/types';

/**
 * Formats a 0–1 score as a whole percentage.
 */
const percent = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;

/**
 * "1 question", "3 questions".
 */
const plural = (count: number, word: string, pluralWord = `${word}s`): string =>
  `${count.toLocaleString()} ${count === 1 ? word : pluralWord}`;

/**
 * "Page 4" or "Pages 4–12".
 */
const pageRange = (start: number, end: number): string => (start === end ? `Page ${start}` : `Pages ${start}–${end}`);

/**
 * Human friendly relative date ("just now", "3 hours ago", "12 Mar 2026").
 */
const relativeDate = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) {
    return '';
  }
  if (seconds < 60) {
    return 'just now';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${plural(minutes, 'minute')} ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${plural(hours, 'hour')} ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * When a usage window resets, from Unix seconds: "21:00", "tomorrow 09:00" or
 * "Mon 10:00".
 */
const resetTime = (unixSeconds: number, now: Date = new Date()): string => {
  const date = new Date(unixSeconds * 1000);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const days = Math.round(
    (new Date(date.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 86_400_000,
  );

  if (days <= 0) {
    return time;
  }
  if (days === 1) {
    return `tomorrow ${time}`;
  }
  return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${time}`;
};

/**
 * Dollar amount with cents: "$2.20".
 */
const usd = (value: number): string => `$${value.toFixed(2)}`;

const STATUS_LABEL: Record<BookStatus, string> = {
  importing: 'Importing',
  queued: 'Queued',
  processing: 'Parsing',
  paused: 'Paused',
  failed: 'Needs attention',
  ready: 'Ready',
};

const KIND_LABEL: Record<QuestionKind, string> = {
  multiple_choice: 'Multiple choice',
  true_false: 'True / false',
  short_answer: 'Open question',
};

/**
 * Parsing progress between 0 and 1. The whole-book pass counts as one extra step.
 */
const parseProgress = (done: number, total: number, stage: string | null): number => {
  if (total === 0) {
    return 0;
  }
  const steps = total + 1;
  const completed = stage === 'done' ? steps : done;
  return Math.min(1, completed / steps);
};

/**
 * Display text of an answer value ("2" -> option text, "true" -> "True").
 */
const answerText = (kind: QuestionKind, options: string[], value: string | null): string => {
  if (value === null || value.trim() === '') {
    return '';
  }
  if (kind === 'multiple_choice') {
    return options[Number(value)] ?? value;
  }
  if (kind === 'true_false') {
    return value === 'true' ? 'True' : 'False';
  }
  return value;
};

export {
  answerText,
  KIND_LABEL,
  pageRange,
  parseProgress,
  percent,
  plural,
  relativeDate,
  resetTime,
  STATUS_LABEL,
  usd,
};
