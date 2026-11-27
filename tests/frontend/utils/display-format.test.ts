import { describe, expect, it } from 'vitest';

import {
  answerText,
  pageRange,
  parseProgress,
  percent,
  plural,
  relativeDate,
  resetTime,
} from '@/utils/display-format';

describe('format', () => {
  it('formats percentages', () => {
    expect(percent(0.756)).toBe('76%');
    expect(percent(null)).toBe('—');
  });

  it('pluralizes', () => {
    expect(plural(1, 'question')).toBe('1 question');
    expect(plural(3, 'question')).toBe('3 questions');
  });

  it('formats page ranges', () => {
    expect(pageRange(4, 4)).toBe('Page 4');
    expect(pageRange(4, 12)).toBe('Pages 4–12');
  });

  it('formats relative dates', () => {
    const now = new Date('2026-11-26T12:00:00Z');
    expect(relativeDate('2026-11-26T11:59:30Z', now)).toBe('just now');
    expect(relativeDate('2026-11-26T09:00:00Z', now)).toBe('3 hours ago');
    expect(relativeDate('2026-11-25T12:00:00Z', now)).toBe('yesterday');
  });

  it('computes parse progress including the whole-book step', () => {
    expect(parseProgress(0, 0, null)).toBe(0);
    expect(parseProgress(3, 3, 'book')).toBe(0.75);
    expect(parseProgress(3, 3, 'done')).toBe(1);
  });

  it('renders answers', () => {
    expect(answerText('multiple_choice', ['a', 'b'], '1')).toBe('b');
    expect(answerText('true_false', [], 'false')).toBe('False');
    expect(answerText('short_answer', [], '  ')).toBe('');
  });

  it('formats usage reset times', () => {
    const now = new Date(2026, 10, 26, 12, 0);
    const at = (date: Date) => Math.floor(date.getTime() / 1000);
    expect(resetTime(at(new Date(2026, 10, 26, 21, 0)), now)).not.toContain('tomorrow');
    expect(resetTime(at(new Date(2026, 10, 27, 9, 0)), now)).toContain('tomorrow');
    expect(resetTime(at(new Date(2026, 10, 30, 10, 0)), now)).not.toContain('tomorrow');
  });
});
