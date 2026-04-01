export const recurrenceTypes = [
  "once",
  "daily",
  "interval_days",
  "weekly",
  "interval_weeks",
  "monthly",
  "interval_months",
  "yearly",
] as const;

export const anchorTypes = ["fixed", "completion_based"] as const;

export const occurrenceStatuses = [
  "scheduled",
  "completed",
  "skipped",
  "overdue",
] as const;

export const completionActions = ["completed", "skipped"] as const;

export const completionBasedRecurrenceTypes = [
  "once",
  "daily",
  "interval_days",
  "monthly",
  "interval_months",
  "yearly",
] as const;

export type RecurrenceType = (typeof recurrenceTypes)[number];
export type AnchorType = (typeof anchorTypes)[number];
export type OccurrenceStatus = (typeof occurrenceStatuses)[number];
export type CompletionAction = (typeof completionActions)[number];
export type CompletionBasedRecurrenceType =
  (typeof completionBasedRecurrenceTypes)[number];

export interface RecurringItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  recurrenceType: RecurrenceType;
  intervalValue?: number | null;
  weekdayMask?: number[] | null;
  startDateLocal: string;
  reminderTimeLocal: string;
  notificationsEnabled: boolean;
  anchorType: AnchorType;
  timezone: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompletionLog {
  id: string;
  userId: string;
  itemId: string;
  scheduledAtUtc: string;
  action: CompletionAction;
  actedAtUtc: string;
  deviceId?: string | null;
  createdAt: string;
}

export interface DerivedOccurrence {
  itemId: string;
  scheduledAtUtc: string;
  scheduledAtLocal: string;
  localDate: string;
  localTime?: string | null;
  status: OccurrenceStatus;
}

export type RecurringItemDraft = Pick<
  RecurringItem,
  | "anchorType"
  | "category"
  | "description"
  | "intervalValue"
  | "isArchived"
  | "notificationsEnabled"
  | "recurrenceType"
  | "reminderTimeLocal"
  | "startDateLocal"
  | "timezone"
  | "title"
  | "weekdayMask"
>;
