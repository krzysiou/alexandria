import { useState } from 'react';

import type { AttemptDetail } from '@/services/tauri-bridge/types';

import { ErrorBanner, Spinner } from '@/components/ui-kit/Feedback';
import { CenterPad, Page } from '@/components/ui-kit/Layout.styles';
import { useResource } from '@/hooks/UseResource';
import { TestResults } from '@/screens/test-session/TestResults';
import { TestRunner } from '@/screens/test-session/TestRunner';
import { api } from '@/services/tauri-bridge/commands';

/**
 * A test attempt: the runner while in progress, the results afterwards.
 */
const TestScreen = ({ attemptId }: { attemptId: string }) => {
  const loaded = useResource(`test:${attemptId}`, () => api.getTest(attemptId));
  const [latest, setLatest] = useState<AttemptDetail | null>(null);

  const attempt = latest?.id === attemptId ? latest : loaded.data;

  if (!attempt) {
    return <CenterPad>{loaded.error ? <ErrorBanner>{loaded.error}</ErrorBanner> : <Spinner />}</CenterPad>;
  }

  if (attempt.status === 'in_progress') {
    return (
      <Page>
        <TestRunner attempt={attempt} onSubmitted={setLatest} />
      </Page>
    );
  }

  return <TestResults attempt={attempt} onChange={setLatest} />;
};

export { TestScreen };
