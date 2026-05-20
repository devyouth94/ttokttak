import { useLocalSearchParams } from "expo-router";

import { getFirstRouteParam } from "~/application/routes/route-params";
import { RecurringItemFormScreen } from "~/features/recurring/components/recurring-item-form-screen";

export default function EditRecurringItemRoute(): React.JSX.Element {
  const { itemId, returnTo } = useLocalSearchParams<{
    itemId?: string | string[];
    returnTo?: string | string[];
  }>();

  return (
    <RecurringItemFormScreen
      itemId={getFirstRouteParam(itemId)}
      returnTo={getFirstRouteParam(returnTo)}
    />
  );
}
