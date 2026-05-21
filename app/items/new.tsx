import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/application/routes";
import { ScheduleCreateScreen } from "~/screens/schedule-create";

export default function NewRecurringItemRoute(): React.JSX.Element {
  const { returnTo } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();

  return <ScheduleCreateScreen returnTo={getFirstRouteParam(returnTo)} />;
}
