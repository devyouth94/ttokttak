import { useOccurrenceProjectionNow } from "~/features/recurring/hooks/use-occurrence-projection-now";

export function useReminderListNow(): Date {
  return useOccurrenceProjectionNow();
}
