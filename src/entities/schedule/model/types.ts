export const recurrenceTypes = [
  "once",
  "daily",
  "interval_days",
  "weekly",
  "interval_weeks",
  "monthly",
  "interval_months",
] as const;

export const anchorTypes = ["fixed", "completion_based"] as const;

export const recurringItemColorKeys = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
] as const;
export const defaultRecurringItemColorKey: RecurringItemColorKey = "red";

export const completionBasedRecurrenceTypes = [
  "daily",
  "interval_days",
  "monthly",
  "interval_months",
] as const;

export type RecurrenceType = (typeof recurrenceTypes)[number];
export type AnchorType = (typeof anchorTypes)[number];
export type OccurrenceStatus =
  | "completed"
  | "overdue"
  | "scheduled"
  | "skipped";
export type CompletionAction = "completed" | "skipped";
export type RecurringItemColorKey = (typeof recurringItemColorKeys)[number];

export interface RecurringItemScheduleVersion {
  id: string;
  itemId: string;
  userId: string;
  effectiveFromUtc: string;
  endDateLocal?: string | null;
  recurrenceType: RecurrenceType;
  intervalValue?: number | null;
  weekdayMask?: number[] | null;
  reminderTimeLocal: string;
  anchorType: AnchorType;
  seedStartDateLocal: string;
  notificationsEnabled: boolean;
  createdAt: string;
}

export interface RecurringItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  contentStatus?: {
    reason?: "decryption-failed";
    status: "available" | "unrecoverable";
  };
  colorKey: RecurringItemColorKey;
  startDateLocal: string;
  timezone: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  scheduleVersions: [
    RecurringItemScheduleVersion,
    ...RecurringItemScheduleVersion[],
  ];
}

export function getCurrentScheduleVersion(
  item: RecurringItem
): RecurringItemScheduleVersion {
  return item.scheduleVersions.at(-1)!;
}

export interface CompletionLog {
  id: string;
  userId: string;
  itemId: string;
  scheduledAtUtc: string;
  action: CompletionAction;
  actedAtUtc: string;
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

export type RecurringItemDraft = {
  anchorType: AnchorType;
  colorKey: RecurringItemColorKey;
  description?: string | null;
  endDateLocal?: string | null;
  intervalValue?: number | null;
  isArchived: boolean;
  notificationsEnabled: boolean;
  recurrenceType: RecurrenceType;
  reminderTimeLocal: string;
  startDateLocal: string;
  timezone: string;
  title: string;
  weekdayMask?: number[] | null;
};
