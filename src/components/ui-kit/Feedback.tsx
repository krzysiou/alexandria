import type { ReactNode } from 'react';

import { AlertTriangle, CheckCircle2, Clock, Loader2, PauseCircle } from 'lucide-react';

import type { ProgressTone, RingTone } from '@/components/ui-kit/Feedback.styles';
import type { BookStatus } from '@/services/tauri-bridge/types';

import {
  Badge,
  Banner,
  BannerBody,
  Empty,
  EmptyIcon,
  ProgressFill,
  ProgressTrack,
  Ring,
  RingLabel,
  SpinnerIcon,
} from '@/components/ui-kit/Feedback.styles';
import { STATUS_LABEL } from '@/utils/display-format';

/**
 * Spinning loader icon.
 */
const Spinner = ({ size = 16 }: { size?: number }) => (
  <SpinnerIcon $size={size}>
    <Loader2 size={size} />
  </SpinnerIcon>
);

/**
 * Thin horizontal progress bar; `value` is between 0 and 1.
 */
const ProgressBar = ({ value, tone = 'accent' }: { value: number; tone?: ProgressTone }) => {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <ProgressTrack role="progressbar" aria-valuenow={Math.round(clamped * 100)}>
      <ProgressFill $tone={tone} style={{ width: `${clamped * 100}%` }} />
    </ProgressTrack>
  );
};

const STATUS_ICON: Record<BookStatus, ReactNode> = {
  importing: <Spinner size={13} />,
  queued: <Clock size={13} />,
  processing: <Spinner size={13} />,
  paused: <PauseCircle size={13} />,
  failed: <AlertTriangle size={13} />,
  ready: <CheckCircle2 size={13} />,
};

/**
 * Small pill showing a book's parsing status.
 */
const StatusBadge = ({ status }: { status: BookStatus }) => (
  <Badge $status={status}>
    {STATUS_ICON[status]}
    {STATUS_LABEL[status]}
  </Badge>
);

/**
 * Neutral information banner.
 */
const InfoBanner = ({ children }: { children: ReactNode }) => (
  <Banner $tone="info">
    <BannerBody>{children}</BannerBody>
  </Banner>
);

/**
 * Error banner with an optional action on the right.
 */
const ErrorBanner = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <Banner $tone="error">
    <AlertTriangle size={18} />
    <BannerBody>{children}</BannerBody>
    {action}
  </Banner>
);

/**
 * Centered message for empty lists and screens.
 */
const EmptyState = ({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) => (
  <Empty>
    <EmptyIcon>{icon}</EmptyIcon>
    <h3>{title}</h3>
    {children ? <p>{children}</p> : null}
    {action}
  </Empty>
);

/**
 * Circular score indicator; `value` is between 0 and 1.
 */
const ScoreRing = ({ value, size = 132 }: { value: number | null; size?: number }) => {
  const stroke = 10;
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = value ?? 0;
  const tone: RingTone = fraction >= 0.8 ? 'success' : fraction >= 0.5 ? 'gold' : 'danger';

  return (
    <Ring $size={size} $tone={tone}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <RingLabel>{value === null ? '—' : `${Math.round(fraction * 100)}%`}</RingLabel>
    </Ring>
  );
};

export { EmptyState, ErrorBanner, InfoBanner, ProgressBar, ScoreRing, Spinner, StatusBadge };
