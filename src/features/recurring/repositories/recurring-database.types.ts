import type { Database } from "~/shared/api/database.types";

export type CompletionLogInsert =
  Database["public"]["Tables"]["completion_logs"]["Insert"];
export type CompletionLogRow =
  Database["public"]["Tables"]["completion_logs"]["Row"];
export type RecurringItemInsert =
  Database["public"]["Tables"]["recurring_items"]["Insert"];
export type RecurringItemRow =
  Database["public"]["Tables"]["recurring_items"]["Row"];
export type RecurringItemUpdate =
  Database["public"]["Tables"]["recurring_items"]["Update"];
export type RecurringItemScheduleVersionInsert =
  Database["public"]["Tables"]["recurring_item_schedule_versions"]["Insert"];
export type RecurringItemScheduleVersionRow =
  Database["public"]["Tables"]["recurring_item_schedule_versions"]["Row"];
