import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/route-param";
import { ScheduleFormScreen } from "~/screens/schedule-form/ui/screen";

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
