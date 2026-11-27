import styled from 'styled-components';

import { color } from '@/app/theme/theme';

const Meter = styled.div`
  display: grid;
  grid-template-columns: auto 120px auto;
  gap: 10px;
  align-items: center;
  font-size: 12.5px;
  color: ${color.textMuted};
  white-space: nowrap;
`;

const Label = styled.span`
  font-weight: 600;
  color: ${color.text};
`;

export { Label, Meter };
