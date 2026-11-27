import styled from 'styled-components';

import { color, ease, radius, rise, shadow } from '@/app/theme/theme';

const Backdrop = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 48px 24px;
  overflow-y: auto;
  background: radial-gradient(circle at 50% -10%, ${color.accentSoft}, transparent 55%), ${color.bg};
`;

const Panel = styled.div`
  width: 100%;
  max-width: 560px;
  padding: 40px 40px 28px;
  text-align: center;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.lg};
  animation: ${rise} 0.35s ${ease};
`;

const Logo = styled.img`
  width: 84px;
  height: 84px;
  margin-bottom: 12px;
`;

const Lead = styled.p`
  max-width: 440px;
  margin: 10px auto 28px;
  color: ${color.textMuted};
`;

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
  text-align: left;
  list-style: none;
`;

const Step = styled.li<{ $state: 'done' | 'current' | 'upcoming' }>`
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: ${color.surface2};
  border: 1px solid ${({ $state }) => ($state === 'current' ? color.accent : color.border)};
  border-radius: ${radius.md};
  box-shadow: ${({ $state }) => ($state === 'current' ? `0 0 0 3px ${color.accentSoft}` : 'none')};
  opacity: ${({ $state }) => ($state === 'upcoming' ? 0.6 : 1)};
`;

const StepMark = styled.span<{ $done: boolean }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 13px;
  font-weight: 650;
  color: ${({ $done }) => ($done ? '#fff' : color.textMuted)};
  background: ${({ $done }) => ($done ? color.success : color.surfaceHover)};
  border-radius: 50%;
`;

const StepBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  code {
    overflow-wrap: anywhere;
  }
`;

const Advanced = styled.details`
  summary {
    font-size: 12.5px;
    color: ${color.textMuted};
    cursor: pointer;
  }

  > div {
    margin-top: 8px;
  }
`;

const ErrorText = styled.p`
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  font-size: 12.5px;
  color: ${color.danger};
  overflow-wrap: anywhere;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  margin-top: 24px;
  border-top: 1px solid ${color.border};
`;

export { Advanced, Backdrop, ErrorText, Footer, Lead, Logo, Panel, Step, StepBody, StepMark, Steps };
