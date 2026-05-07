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

export const occurrenceStatuses = [
  "scheduled",
  "completed",
  "skipped",
  "overdue",
] as const;

export const completionActions = ["completed", "skipped"] as const;
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
export const devicePlatforms = ["ios", "android", "web", "unknown"] as const;
export const notificationKinds = ["reminder"] as const;

export const completionBasedRecurrenceTypes = [
  "once",
  "daily",
  "interval_days",
  "monthly",
  "interval_months",
] as const;

export type RecurrenceType = (typeof recurrenceTypes)[number];
export type AnchorType = (typeof anchorTypes)[number];
export type OccurrenceStatus = (typeof occurrenceStatuses)[number];
export type CompletionAction = (typeof completionActions)[number];
export type RecurringItemColorKey = (typeof recurringItemColorKeys)[number];
export type DevicePlatform = (typeof devicePlatforms)[number];
export type NotificationKind = (typeof notificationKinds)[number];
export type CompletionBasedRecurrenceType =
  (typeof completionBasedRecurrenceTypes)[number];

export interface RecurringItemScheduleVersion {
  id: string;
  itemId: string;
  userId: string;
  effectiveFromUtc: string;
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
  scheduleVersions?: RecurringItemScheduleVersion[];
}

export function getCurrentScheduleVersion(
  item: RecurringItem
): RecurringItemScheduleVersion | null {
  if (!item.scheduleVersions?.length) {
    return null;
  }

  return (
    item.scheduleVersions
      .slice()
      .sort((left, right) =>
        left.effectiveFromUtc.localeCompare(right.effectiveFromUtc)
      )
      .at(-1) ?? null
  );
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

export interface Device {
  id: string;
  userId: string;
  platform: DevicePlatform;
  deviceName?: string | null;
  isActive: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
  | "colorKey"
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
