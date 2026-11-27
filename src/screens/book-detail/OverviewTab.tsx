import { AlertTriangle, CheckCircle2, Circle, Eye } from 'lucide-react';

import type { Book, Section } from '@/services/tauri-bridge/types';

import { Button } from '@/components/ui-kit/Button.styles';
import { ErrorBanner, InfoBanner, Spinner } from '@/components/ui-kit/Feedback';
import { Chip } from '@/components/ui-kit/Form.styles';
import { Card, CardHead, Stack, Stat, StatGrid, StatLabel, StatValue } from '@/components/ui-kit/Layout.styles';
import { Eyebrow, Text, ToneIcon } from '@/components/ui-kit/Text.styles';
import {
  SectionBody,
  SectionList,
  SectionRow,
  SectionSummary,
  SectionTitle,
  Summary,
} from '@/screens/book-detail/OverviewTab.styles';
import { api } from '@/services/tauri-bridge/commands';
import { pageRange, plural, usd } from '@/utils/display-format';

/**
 * Status icon of a single section in the parsing list.
 */
const SectionIcon = ({ section }: { section: Section }) => {
  if (section.status === 'done') {
    return (
      <ToneIcon $tone="success">
        <CheckCircle2 size={17} />
      </ToneIcon>
    );
  }

  if (section.status === 'processing') {
    return (
      <ToneIcon $tone="accent">
        <Spinner size={17} />
      </ToneIcon>
    );
  }

  if (section.status === 'failed') {
    return (
      <ToneIcon $tone="danger">
        <AlertTriangle size={17} />
      </ToneIcon>
    );
  }

  return (
    <ToneIcon $tone="faint">
      <Circle size={17} />
    </ToneIcon>
  );
};

/**
 * Book summary, numbers and the list of sections with their parsing status.
 */
const OverviewTab = ({ book, sections, costCapUsd }: { book: Book; sections: Section[]; costCapUsd: number }) => {
  const words = sections.reduce((sum, section) => sum + section.wordCount, 0);
  const cost = book.costUsd > 0 ? ` · one-time AI usage ≈ ${usd(book.costUsd)} of ${usd(costCapUsd)} cap` : '';

  const stats = [
    { label: 'pages', value: book.pageCount },
    { label: 'words', value: words },
    { label: 'sections', value: sections.length },
    { label: 'questions', value: book.questionCount },
  ];

  return (
    <Stack>
      {book.status === 'failed' && book.error ? (
        <ErrorBanner
          action={
            <Button $size="sm" onClick={() => api.resumeBook(book.id)}>
              Resume
            </Button>
          }
        >
          <strong>Parsing stopped.</strong> {book.error}
        </ErrorBanner>
      ) : null}

      {book.status === 'paused' ? (
        <InfoBanner>
          {book.error ?? 'Parsing is paused. Finished sections are kept; press Resume to continue where it stopped.'}
        </InfoBanner>
      ) : null}

      <Card>
        <Eyebrow>About this book</Eyebrow>
        {book.summary ? (
          <Summary>{book.summary}</Summary>
        ) : (
          <Text as="p" $tone="muted">
            The summary is written once Claude has read every section.
          </Text>
        )}
      </Card>

      <StatGrid>
        {stats.map(stat => (
          <Stat key={stat.label}>
            <StatValue>{stat.value.toLocaleString()}</StatValue>
            <StatLabel>{stat.label}</StatLabel>
          </Stat>
        ))}
      </StatGrid>

      <Card>
        <CardHead>
          <h2>Sections</h2>
          <Text $tone="muted" $size="sm">
            {book.sectionsDone} of {plural(sections.length, 'section')} parsed{cost}
          </Text>
        </CardHead>

        <SectionList>
          {sections.map(section => (
            <SectionRow key={section.id}>
              <SectionIcon section={section} />
              <SectionBody>
                <SectionTitle $pending={section.status === 'pending'}>
                  <span>{section.title}</span>
                  {section.mode === 'vision' ? (
                    <Chip title="No text layer: Claude reads the page images">
                      <Eye size={12} /> scanned
                    </Chip>
                  ) : null}
                </SectionTitle>
                <Text $tone="muted" $size="sm">
                  {pageRange(section.startPage, section.endPage)} · {plural(section.wordCount, 'word')}
                  {section.questionCount > 0 ? ` · ${plural(section.questionCount, 'question')}` : ''}
                </Text>
                {section.summary ? <SectionSummary>{section.summary}</SectionSummary> : null}
                {section.error ? (
                  <Text $tone="danger" $size="sm">
                    {section.error}
                  </Text>
                ) : null}
              </SectionBody>
            </SectionRow>
          ))}
        </SectionList>
      </Card>
    </Stack>
  );
};

export { OverviewTab };
