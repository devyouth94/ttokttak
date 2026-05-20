import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/application/routes/route-params";
import { ScheduleEditScreen } from "~/screens/schedule-edit";

export default function EditRecurringItemRoute(): React.JSX.Element {
  const { itemId, returnTo } = useLocalSearchParams<{
    itemId?: string | string[];
    returnTo?: string | string[];
  }>();

  return (
    <ScheduleEditScreen
      itemId={getFirstRouteParam(itemId)}
      returnTo={getFirstRouteParam(returnTo)}
    />
  );
}
