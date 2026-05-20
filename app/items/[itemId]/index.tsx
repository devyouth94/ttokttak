import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/application/routes/route-params";
import { RecurringItemDetailScreen } from "~/features/recurring/components/recurring-item-detail-screen";

export default function RecurringItemDetailPage(): React.JSX.Element {
  const { itemId, returnTo, scheduledAtUtc } = useLocalSearchParams<{
    itemId?: string | string[];
    returnTo?: string | string[];
    scheduledAtUtc?: string | string[];
  }>();

  return (
    <RecurringItemDetailScreen
      itemId={getFirstRouteParam(itemId)}
      returnTo={getFirstRouteParam(returnTo)}
      scheduledAtUtc={getFirstRouteParam(scheduledAtUtc)}
    />
  );
}
