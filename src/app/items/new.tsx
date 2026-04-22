import { useLocalSearchParams } from "expo-router";

import { RecurringItemFormScreen } from "~/features/recurring/components/recurring-item-form-screen";

export default function NewRecurringItemRoute(): React.JSX.Element {
  const { returnTo } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();
  const normalizedReturnTo = Array.isArray(returnTo) ? returnTo[0] : returnTo;

  return <RecurringItemFormScreen returnTo={normalizedReturnTo} />;
}
