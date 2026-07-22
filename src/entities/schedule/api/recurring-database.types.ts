import type { Database } from "~/database.types";

export type CompletionLogInsert =
  Database["public"]["Tables"]["completion_logs"]["Insert"];
export type CompletionLogRow =
  Database["public"]["Tables"]["completion_logs"]["Row"];
export type RecurringItemRow =
  Database["public"]["Tables"]["recurring_items"]["Row"];
export type RecurringItemScheduleVersionRow =
  Database["public"]["Tables"]["recurring_item_schedule_versions"]["Row"];
