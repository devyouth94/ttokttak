import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/application/routes/route-params";
import { RecurringItemFormScreen } from "~/features/recurring/components/recurring-item-form-screen";

export default function NewRecurringItemRoute(): React.JSX.Element {
  const { returnTo } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();

  return <RecurringItemFormScreen returnTo={getFirstRouteParam(returnTo)} />;
}
