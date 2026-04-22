import { useLocalSearchParams } from "expo-router";

import { RecurringItemFormScreen } from "~/features/recurring/components/recurring-item-form-screen";

export default function EditRecurringItemRoute(): React.JSX.Element {
  const { itemId, returnTo } = useLocalSearchParams<{
    itemId?: string | string[];
    returnTo?: string | string[];
  }>();
  const normalizedItemId = Array.isArray(itemId) ? itemId[0] : itemId;
  const normalizedReturnTo = Array.isArray(returnTo) ? returnTo[0] : returnTo;

  return (
    <RecurringItemFormScreen
      itemId={normalizedItemId}
      returnTo={normalizedReturnTo}
    />
  );
}
