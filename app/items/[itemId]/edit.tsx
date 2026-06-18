import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/application/routes";
import { ScheduleFormScreen } from "~/screens/schedule-form";

export default function EditRecurringItemRoute(): React.JSX.Element {
  const { itemId, returnTo } = useLocalSearchParams<{
    itemId?: string | string[];
    returnTo?: string | string[];
  }>();

  return (
    <ScheduleFormScreen
      itemId={getFirstRouteParam(itemId)}
      returnTo={getFirstRouteParam(returnTo)}
    />
  );
}
