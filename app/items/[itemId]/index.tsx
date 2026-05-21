import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/application/routes";
import { ScheduleDetailScreen } from "~/screens/schedule-detail";

export default function RecurringItemDetailPage(): React.JSX.Element {
  const { itemId, returnTo, scheduledAtUtc } = useLocalSearchParams<{
    itemId?: string | string[];
    returnTo?: string | string[];
    scheduledAtUtc?: string | string[];
  }>();

  return (
    <ScheduleDetailScreen
      itemId={getFirstRouteParam(itemId)}
      returnTo={getFirstRouteParam(returnTo)}
      scheduledAtUtc={getFirstRouteParam(scheduledAtUtc)}
    />
  );
}
