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
export const recurringItemColorKeys = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
] as const;
export const defaultRecurringItemColorKey: RecurringItemColorKey = "blue";
export const devicePlatforms = ["ios", "android", "web", "unknown"] as const;
export const pushProviders = ["apns", "fcm"] as const;
export const devicePushTokenPermissionStatuses = ["granted", "denied"] as const;
export const devicePushTokenDeactivationReasons = [
  "logout",
  "permission-denied",
  "delivery-failed",
] as const;
export const notificationKinds = ["reminder"] as const;
export const notificationDeliveryJobStatuses = [
  "pending",
  "processing",
  "retrying",
  "succeeded",
  "partially-failed",
  "failed",
  "cancelled",
] as const;
export const notificationDeliveryJobCancelReasons = [
  "item-archived",
  "occurrence-completed",
  "occurrence-skipped",
  "schedule-updated",
  "no-active-tokens",
] as const;
export const notificationDeliveryAttemptStatuses = [
  "succeeded",
  "retryable-failed",
  "permanent-failed",
  "token-invalid",
  "skipped",
] as const;

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
export type RecurringItemColorKey = (typeof recurringItemColorKeys)[number];
export type DevicePlatform = (typeof devicePlatforms)[number];
export type PushProvider = (typeof pushProviders)[number];
export type DevicePushTokenPermissionStatus =
  (typeof devicePushTokenPermissionStatuses)[number];
export type DevicePushTokenDeactivationReason =
  (typeof devicePushTokenDeactivationReasons)[number];
export type NotificationKind = (typeof notificationKinds)[number];
export type NotificationDeliveryJobStatus =
  (typeof notificationDeliveryJobStatuses)[number];
export type NotificationDeliveryJobCancelReason =
  (typeof notificationDeliveryJobCancelReasons)[number];
export type NotificationDeliveryAttemptStatus =
  (typeof notificationDeliveryAttemptStatuses)[number];
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
  category?: string | null;
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

export interface DevicePushToken {
  id: string;
  userId: string;
  deviceId: string;
  platform: Extract<DevicePlatform, "android" | "ios">;
  pushProvider: PushProvider;
  pushToken: string;
  isActive: boolean;
  permissionStatus: DevicePushTokenPermissionStatus;
  lastRegisteredAt: string;
  deactivatedAt?: string | null;
  deactivationReason?: DevicePushTokenDeactivationReason | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryJob {
  id: string;
  userId: string;
  itemId: string;
  notificationKind: NotificationKind;
  itemScheduledAtUtc: string;
  deliverAtUtc: string;
  dedupeKey: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  status: NotificationDeliveryJobStatus;
  cancelReason?: NotificationDeliveryJobCancelReason | null;
  retryCount: number;
  targetTokenCount: number;
  successCount: number;
  failureCount: number;
  lastAttemptedAt?: string | null;
  nextRetryAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryAttempt {
  id: string;
  jobId: string;
  userId: string;
  deviceId?: string | null;
  pushTokenId?: string | null;
  platform: Extract<DevicePlatform, "android" | "ios">;
  pushProvider: PushProvider;
  pushToken: string;
  attemptNumber: number;
  status: NotificationDeliveryAttemptStatus;
  providerMessageId?: string | null;
  providerErrorCode?: string | null;
  providerErrorMessage?: string | null;
  responsePayload: Record<string, unknown>;
  attemptedAt: string;
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
