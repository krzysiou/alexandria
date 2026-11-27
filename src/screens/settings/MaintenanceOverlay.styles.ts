import styled from 'styled-components';

import { color, ease, font, radius, rise, shadow } from '@/app/theme/theme';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${color.overlay};
  backdrop-filter: blur(8px);
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 520px;
  padding: 32px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.lg};
  animation: ${rise} 0.25s ${ease};
`;

const Heading = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
`;

const IconBadge = styled.span<{ $danger: boolean }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: ${({ $danger }) => ($danger ? color.danger : color.accentText)};
  background: ${({ $danger }) => ($danger ? color.dangerSoft : color.accentSoft)};
  border-radius: 12px;
`;

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
`;

const Step = styled.li<{ $state: 'done' | 'current' | 'upcoming' | 'failed' }>`
  display: flex;
  gap: 10px;
  align-items: center;
  height: 24px;
  font-weight: 500;
  color: ${({ $state }) => ($state === 'current' ? color.text : $state === 'failed' ? color.danger : color.textMuted)};
  white-space: nowrap;
`;

const StepIcon = styled.span<{ $state: 'done' | 'current' | 'upcoming' | 'failed' }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: ${({ $state }) =>
    $state === 'done'
      ? color.success
      : $state === 'failed'
        ? color.danger
        : $state === 'current'
          ? color.accentText
          : color.textFaint};
`;

const Pending = styled.span`
  width: 12px;
  height: 12px;
  border: 1.5px solid currentcolor;
  border-radius: 50%;
`;

const Log = styled.pre`
  max-height: 180px;
  padding: 12px 14px;
  margin: 0;
  overflow: auto;
  font-family: ${font.mono};
  font-size: 11.5px;
  line-height: 1.55;
  color: ${color.textMuted};
  white-space: pre-wrap;
  user-select: text;
  background: ${color.surface2};
  border: 1px solid ${color.border};
  border-radius: ${radius.sm};
`;

const Details = styled.details`
  summary {
    margin-bottom: 8px;
    font-size: 12.5px;
    color: ${color.textMuted};
    cursor: pointer;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export { Backdrop, Details, Footer, Heading, IconBadge, Log, Panel, Pending, Step, StepIcon, Steps };
