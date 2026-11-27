import styled from 'styled-components';

import { color, font } from '@/app/theme/theme';

const Code = styled.code`
  padding: 0.08em 0.38em;
  font-family: ${font.mono};
  font-size: 0.84em;
  background: ${color.surfaceHover};
  border-radius: 5px;
`;

export { Code };
