import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

import type { DocumentInfo } from '@/services/tauri-bridge/types';

import { Markdown } from '@/components/markdown-reader/Markdown';
import {
  Article,
  Breadcrumb,
  Overlay,
  PageDirection,
  PageLink,
  Pager,
  PageTitle,
  Position,
  Scroller,
  ScrollProgress,
  TopBar,
} from '@/components/markdown-reader/ReadingMode.styles';
import { Button } from '@/components/ui-kit/Button.styles';
import { ProgressBar, Spinner } from '@/components/ui-kit/Feedback';

type Props = {
  bookTitle: string;
  documents: DocumentInfo[];
  index: number;
  content: string | undefined;
  onNavigate: (index: number) => void;
  onExit: () => void;
};

/**
 * Distraction-free reading: one document at a time over the whole window,
 * with previous / next pagination. Keys: ← → to page, Esc to leave.
 */
const ReadingMode = ({ bookTitle, documents, index, content, onNavigate, onExit }: Props) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [readProgress, setReadProgress] = useState(0);

  const current = documents[index];
  const previous = documents[index - 1];
  const next = documents[index + 1];

  const file = current?.file;

  useEffect(() => {
    if (file === undefined) {
      return;
    }

    scrollerRef.current?.scrollTo({ top: 0 });
    setReadProgress(0);
  }, [file]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'Escape') {
        onExit();
      } else if (event.key === 'ArrowRight' && next) {
        onNavigate(index + 1);
      } else if (event.key === 'ArrowLeft' && previous) {
        onNavigate(index - 1);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, next, previous, onExit, onNavigate]);

  const onScroll = () => {
    const element = scrollerRef.current;
    if (!element) {
      return;
    }

    const scrollable = element.scrollHeight - element.clientHeight;
    setReadProgress(scrollable > 0 ? element.scrollTop / scrollable : 1);
  };

  return createPortal(
    <Overlay role="dialog" aria-modal="true" aria-label="Reading mode">
      <TopBar data-tauri-drag-region>
        <Breadcrumb data-tauri-drag-region>
          <span>{bookTitle}</span>
          <span>·</span>
          <strong>{current?.title}</strong>
        </Breadcrumb>
        <Button $variant="ghost" $size="sm" onClick={onExit} title="Leave reading mode">
          <X size={15} /> Close
        </Button>
        <ScrollProgress style={{ width: `${readProgress * 100}%` }} />
      </TopBar>

      <Scroller ref={scrollerRef} onScroll={onScroll}>
        <Article>{content === undefined ? <Spinner /> : <Markdown content={content} />}</Article>
      </Scroller>

      <Pager>
        <PageLink $align="start" disabled={!previous} onClick={() => onNavigate(index - 1)}>
          <PageDirection>
            <ArrowLeft size={13} /> Previous
          </PageDirection>
          <PageTitle>{previous?.title}</PageTitle>
        </PageLink>

        <Position>
          <span>
            {index + 1} of {documents.length}
          </span>
          <ProgressBar value={(index + 1) / documents.length} />
        </Position>

        <PageLink $align="end" disabled={!next} onClick={() => onNavigate(index + 1)}>
          <PageDirection>
            Next <ArrowRight size={13} />
          </PageDirection>
          <PageTitle>{next?.title}</PageTitle>
        </PageLink>
      </Pager>
    </Overlay>,
    document.body,
  );
};

export { ReadingMode };
