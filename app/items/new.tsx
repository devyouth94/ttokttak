import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/application/routes";
import { ScheduleFormScreen } from "~/screens/schedule-form";

export default function NewRecurringItemRoute(): React.JSX.Element {
  const { returnTo } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();

  return <ScheduleFormScreen returnTo={getFirstRouteParam(returnTo)} />;
}
