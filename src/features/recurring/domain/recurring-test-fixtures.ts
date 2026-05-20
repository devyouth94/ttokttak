import type {
  CompletionLog,
  RecurringItem,
  RecurringItemScheduleVersion,
} from "~/features/recurring/domain/types";

export const recurringTestTimezone = "Asia/Seoul";

export function createRecurringItemFixture(
  overrides: Partial<RecurringItem> = {}
): RecurringItem {
  return {
    anchorType: "fixed",
    colorKey: "blue",
    createdAt: "2026-04-01T00:00:00.000Z",
    description: null,
    id: "item-1",
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-04-10",
    timezone: recurringTestTimezone,
    title: "테스트 일정",
    updatedAt: "2026-04-01T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}

export function createCompletionLogFixture(
  overrides: Partial<CompletionLog> = {}
): CompletionLog {
  return {
    actedAtUtc: "2026-04-11T00:05:00.000Z",
    action: "completed",
    createdAt: "2026-04-11T00:05:00.000Z",
    id: "log-1",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-11T00:00:00.000Z",
    userId: "user-1",
    ...overrides,
  };
}

export function createScheduleVersionFixture(
  overrides: Partial<RecurringItemScheduleVersion> = {}
): RecurringItemScheduleVersion {
  return {
    anchorType: "fixed",
    createdAt: "2026-04-01T00:00:00.000Z",
    effectiveFromUtc: "2026-04-01T00:00:00.000Z",
    id: "version-1",
    intervalValue: null,
    itemId: "item-1",
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    seedStartDateLocal: "2026-04-10",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}
