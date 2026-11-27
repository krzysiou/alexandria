import styled, { css } from 'styled-components';

import type { BookStatus } from '@/services/tauri-bridge/types';

import { color, ease, font, radius, spin } from '@/app/theme/theme';

type ProgressTone = 'accent' | 'success' | 'gold';
type RingTone = 'success' | 'gold' | 'danger';

const progressColor: Record<ProgressTone, string> = {
  accent: color.accent,
  success: color.success,
  gold: color.gold,
};

const ringColor: Record<RingTone, string> = {
  success: color.success,
  gold: color.gold,
  danger: color.danger,
};

const badgeTone: Record<BookStatus, ReturnType<typeof css>> = {
  ready: css`
    color: ${color.success};
    background: ${color.successSoft};
  `,
  processing: css`
    color: ${color.accentText};
    background: ${color.accentSoft};
  `,
  queued: css`
    color: ${color.accentText};
    background: ${color.accentSoft};
  `,
  importing: css`
    color: ${color.accentText};
    background: ${color.accentSoft};
  `,
  paused: css`
    color: ${color.textMuted};
    background: ${color.surfaceHover};
  `,
  failed: css`
    color: ${color.gold};
    background: ${color.goldSoft};
  `,
};

const SpinnerIcon = styled.span<{ $size: number }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  line-height: 0;
  vertical-align: -2px;

  svg {
    display: block;
    transform-origin: 50% 50%;
    animation: ${spin} 0.9s linear infinite;
  }
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  overflow: hidden;
  background: ${color.border};
  border-radius: 6px;
`;

const ProgressFill = styled.div<{ $tone: ProgressTone }>`
  height: 100%;
  background: ${({ $tone }) => progressColor[$tone]};
  border-radius: 6px;
  transition: width 0.4s ${ease};
`;

const Badge = styled.span<{ $status: BookStatus }>`
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 20px;

  ${({ $status }) => badgeTone[$status]}
`;

const Banner = styled.div<{ $tone?: 'info' | 'error' }>`
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  color: ${({ $tone }) => ($tone === 'error' ? color.danger : color.textMuted)};
  background: ${({ $tone }) => ($tone === 'error' ? color.dangerSoft : color.surface2)};
  border: 1px solid ${({ $tone }) => ($tone === 'error' ? 'transparent' : color.border)};
  border-radius: ${radius.md};

  > svg {
    flex-shrink: 0;
  }
`;

const BannerBody = styled.div`
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  max-width: 460px;
  padding: 56px 24px;
  margin: 0 auto;
  text-align: center;

  p {
    margin-bottom: 8px;
    color: ${color.textMuted};
  }
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 6px;
  color: ${color.accentText};
  background: ${color.accentSoft};
  border-radius: 18px;
`;

const Ring = styled.div<{ $size: number; $tone: RingTone }>`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;

  svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
  }

  circle:first-child {
    stroke: ${color.border};
  }

  circle:last-child {
    stroke: ${({ $tone }) => ringColor[$tone]};
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s ${ease};
  }
`;

const RingLabel = styled.span`
  font-family: ${font.serif};
  font-size: 30px;
  font-weight: 600;
`;

export type { ProgressTone, RingTone };
export { Badge, Banner, BannerBody, Empty, EmptyIcon, ProgressFill, ProgressTrack, Ring, RingLabel, SpinnerIcon };
