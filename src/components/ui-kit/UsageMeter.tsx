import { ProgressBar } from '@/components/ui-kit/Feedback';
import { Label, Meter } from '@/components/ui-kit/UsageMeter.styles';
import { percent, resetTime } from '@/utils/display-format';

type Props = {
  label: string;
  used: number;
  resetsAt: number | null;
};

const WARNING_LEVEL = 0.8;

/**
 * One Claude plan limit: how much of it is used and when it resets.
 */
const UsageMeter = ({ label, used, resetsAt }: Props) => (
  <Meter>
    <Label>{label}</Label>
    <ProgressBar value={used} tone={used >= WARNING_LEVEL ? 'gold' : 'accent'} />
    <span>
      {percent(used)} used{resetsAt ? ` · resets ${resetTime(resetsAt)}` : ''}
    </span>
  </Meter>
);

export { UsageMeter };
