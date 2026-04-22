import { useLocalSearchParams } from "expo-router";

import { RecurringItemDetailScreen } from "~/features/recurring/components/recurring-item-detail-screen";

export default function RecurringItemDetailPage(): React.JSX.Element {
  const { itemId, returnTo, scheduledAtUtc } = useLocalSearchParams<{
    itemId?: string | string[];
    returnTo?: string | string[];
    scheduledAtUtc?: string | string[];
  }>();
  const normalizedItemId = Array.isArray(itemId) ? itemId[0] : itemId;
  const normalizedReturnTo = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const normalizedScheduledAtUtc = Array.isArray(scheduledAtUtc)
    ? scheduledAtUtc[0]
    : scheduledAtUtc;

  return (
    <RecurringItemDetailScreen
      itemId={normalizedItemId}
      returnTo={normalizedReturnTo}
      scheduledAtUtc={normalizedScheduledAtUtc}
    />
  );
}
