import { Stack } from '@/components/ui-kit/Layout.styles';
import { Text } from '@/components/ui-kit/Text.styles';
import { UsageMeter } from '@/components/ui-kit/UsageMeter';
import { useResource } from '@/hooks/UseResource';
import { api } from '@/services/tauri-bridge/commands';

type Props = {
  refreshKey: string;
  weekly?: boolean;
  emptyText?: string;
};

/**
 * Current usage of the Claude plan's 5-hour (and optionally weekly) limit, as
 * reported by the most recent Claude call. Reloads when `refreshKey` changes.
 */
const PlanUsage = ({ refreshKey, weekly = false, emptyText }: Props) => {
  const usage = useResource(`plan-usage:${refreshKey}`, api.claudeUsage, { keepPrevious: true });
  const data = usage.data;

  if (!data) {
    return emptyText ? (
      <Text $tone="muted" $size="sm">
        {emptyText}
      </Text>
    ) : null;
  }

  const fiveHourExpired = data.fiveHourResetsAt * 1000 < Date.now();

  return (
    <Stack $gap={6}>
      <UsageMeter
        label="5-hour limit"
        used={fiveHourExpired ? 0 : data.fiveHour}
        resetsAt={fiveHourExpired ? null : data.fiveHourResetsAt}
      />
      {weekly && data.sevenDay !== null ? (
        <UsageMeter label="Weekly limit" used={data.sevenDay} resetsAt={data.sevenDayResetsAt} />
      ) : null}
    </Stack>
  );
};

export { PlanUsage };
