import { useLocalSearchParams } from "expo-router";

import { RecurringItemFormScreen } from "~/features/recurring/components/recurring-item-form-screen";

export default function EditRecurringItemRoute(): React.JSX.Element {
  const { itemId } = useLocalSearchParams<{ itemId?: string | string[] }>();
  const normalizedItemId = Array.isArray(itemId) ? itemId[0] : itemId;

  return <RecurringItemFormScreen itemId={normalizedItemId} />;
}
