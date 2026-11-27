import styled from 'styled-components';

import { color } from '@/app/theme/theme';
import { Card } from '@/components/ui-kit/Layout.styles';

const SettingsCard = styled(Card)`
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;

  h2 {
    margin-bottom: 6px;
  }
`;

const SettingRow = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid ${color.border};

  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
`;

const SettingText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const SettingLabel = styled.div`
  font-weight: 600;
`;

const SettingControl = styled.div`
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  max-width: 60%;
`;

const Footer = styled.p`
  font-size: 12.5px;
  color: ${color.textMuted};
  text-align: center;
`;

export { Footer, SettingControl, SettingLabel, SettingRow, SettingsCard, SettingText };
