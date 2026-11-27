import styled from 'styled-components';

import { ease, rise } from '@/app/theme/theme';

const Splash = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
  justify-content: center;
  height: 100%;

  img {
    width: 88px;
    height: 88px;
    animation: ${rise} 0.4s ${ease};
  }
`;

export { Splash };
