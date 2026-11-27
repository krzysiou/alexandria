import styled from 'styled-components';

import { color } from '@/app/theme/theme';

const Header = styled.header`
  display: flex;
  gap: 24px;
  align-items: flex-end;
  margin-bottom: 24px;
`;

const HeaderBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  min-width: 0;
`;

const Title = styled.h1`
  font-size: 32px;
`;

const Progress = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(460px, 100%);
  margin-top: 6px;
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${color.border};
`;

const TabActions = styled.div`
  display: flex;
  align-items: center;
  padding-bottom: 4px;
  margin-left: auto;
`;

const Tab = styled.button.attrs({ type: 'button', role: 'tab' })`
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 10px 14px;
  margin-bottom: -1px;
  font-weight: 600;
  color: ${color.textMuted};
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;

  &:hover {
    color: ${color.text};
  }

  &[aria-selected="true"] {
    color: ${color.text};
    border-bottom-color: ${color.accent};
  }
`;

export { Actions, Header, HeaderBody, Progress, Tab, TabActions, Tabs, Title };
