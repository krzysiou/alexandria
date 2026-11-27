import type { ReactNode } from 'react';

import { useEffect, useRef } from 'react';
import { Check, Download, RotateCcw, Trash2, X } from 'lucide-react';

import type { MaintenanceAction, MaintenanceProgress } from '@/services/tauri-bridge/types';

import { Button } from '@/components/ui-kit/Button.styles';
import { ErrorBanner, Spinner } from '@/components/ui-kit/Feedback';
import { Text } from '@/components/ui-kit/Text.styles';
import { useMaintenanceProgress } from '@/hooks/UseMaintenanceProgress';
import {
  Backdrop,
  Details,
  Footer,
  Heading,
  IconBadge,
  Log,
  Panel,
  Pending,
  Step,
  StepIcon,
  Steps,
} from '@/screens/settings/MaintenanceOverlay.styles';

type Copy = {
  title: string;
  description: string;
  icon: ReactNode;
  danger: boolean;
};

const COPY: Record<MaintenanceAction, Copy> = {
  update: {
    title: 'Updating Alexandria',
    description: 'Your library is kept. Alexandria restarts by itself once the new version is ready.',
    icon: <Download size={22} />,
    danger: false,
  },
  reset: {
    title: 'Resetting your data',
    description: 'Alexandria closes, deletes ~/.alexandria and reopens with an empty library.',
    icon: <RotateCcw size={22} />,
    danger: true,
  },
  uninstall: {
    title: 'Uninstalling Alexandria',
    description: 'Alexandria closes, then removes its data and itself from Applications.',
    icon: <Trash2 size={22} />,
    danger: true,
  },
};

const UPDATE_STEPS = ['Getting the latest version', 'Building the new version', 'Installing and restarting'];

/**
 * Index of the update step currently running, derived from the script log.
 */
const currentUpdateStep = (progress: MaintenanceProgress | null): number => {
  if (!progress) {
    return 0;
  }
  if (progress.readyToInstall) {
    return 2;
  }
  return progress.lines.some(line => line.includes('Checking requirements')) ? 1 : 0;
};

/**
 * Step list of an update with a spinner on the running step.
 */
const UpdateSteps = ({ current, failed }: { current: number; failed: boolean }) => (
  <Steps>
    {UPDATE_STEPS.map((label, index) => {
      const state = index < current ? 'done' : index > current ? 'upcoming' : failed ? 'failed' : 'current';

      return (
        <Step key={label} $state={state}>
          <StepIcon $state={state}>
            {state === 'done' ? <Check size={16} /> : null}
            {state === 'current' ? <Spinner size={16} /> : null}
            {state === 'failed' ? <X size={16} /> : null}
            {state === 'upcoming' ? <Pending /> : null}
          </StepIcon>
          {label}
        </Step>
      );
    })}
  </Steps>
);

/**
 * Modal shown while an update, reset or uninstall runs in the background,
 * with the steps, the latest log output and errors.
 */
const MaintenanceOverlay = ({ action, onClose }: { action: MaintenanceAction; onClose: () => void }) => {
  const progress = useMaintenanceProgress(true);
  const logRef = useRef<HTMLPreElement>(null);

  const copy = COPY[action];
  const failed = progress?.failed ?? false;
  const log = (progress?.lines ?? []).slice(-40).join('\n');

  useEffect(() => {
    if (log) {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    }
  }, [log]);

  return (
    <Backdrop>
      <Panel role="dialog" aria-modal="true" aria-label={copy.title}>
        <Heading>
          <IconBadge $danger={copy.danger}>{copy.icon}</IconBadge>
          <div>
            <h2>{copy.title}</h2>
            <Text $tone="muted" $size="sm">
              {copy.description}
            </Text>
          </div>
        </Heading>

        {action === 'update' ? <UpdateSteps current={currentUpdateStep(progress)} failed={failed} /> : null}

        {failed ? (
          <ErrorBanner>
            {action === 'update'
              ? 'The update failed. Your current version is unchanged; see the details below.'
              : 'Something went wrong; see the details below.'}
          </ErrorBanner>
        ) : null}

        {action === 'update' ? (
          <Details open={failed}>
            <summary>Details</summary>
            <Log ref={logRef}>{log || 'Waiting for output…'}</Log>
          </Details>
        ) : null}

        {failed ? (
          <Footer>
            <Button onClick={onClose}>Close</Button>
          </Footer>
        ) : null}
      </Panel>
    </Backdrop>
  );
};

export { MaintenanceOverlay };
