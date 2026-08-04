import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/route-param";
import { ScheduleFormScreen } from "~/screens/schedule-form/ui/screen";

export default function NewRecurringItemRoute(): React.JSX.Element {
  const { returnTo } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();

  return <ScheduleFormScreen returnTo={getFirstRouteParam(returnTo)} />;
}
