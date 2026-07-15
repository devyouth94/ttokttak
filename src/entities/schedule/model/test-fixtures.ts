import { fromZonedTime } from "date-fns-tz";

import type {
  CompletionLog,
  RecurringItem,
  RecurringItemScheduleVersion,
} from "./types";

export const recurringTestTimezone = "Asia/Seoul";

type RecurringItemScheduleFixtureOverrides = Partial<
  Pick<
    RecurringItemScheduleVersion,
    | "anchorType"
    | "endDateLocal"
    | "intervalValue"
    | "notificationsEnabled"
    | "recurrenceType"
    | "reminderTimeLocal"
    | "weekdayMask"
  >
>;

export type RecurringItemFixtureOverrides = Partial<
  Omit<RecurringItem, "scheduleVersions">
> &
  RecurringItemScheduleFixtureOverrides & {
    scheduleVersions?: RecurringItemScheduleVersion[];
  };

export function createRecurringItemFixture(
  overrides: RecurringItemFixtureOverrides = {}
): RecurringItem {
  const {
    anchorType = "fixed",
    endDateLocal = null,
    intervalValue = null,
    notificationsEnabled = true,
    recurrenceType = "daily",
    reminderTimeLocal = "09:00",
    scheduleVersions,
    weekdayMask = null,
    ...itemOverrides
  } = overrides;
  const versions = scheduleVersions ?? [
    createScheduleVersionFixture({
      anchorType,
      effectiveFromUtc: fromZonedTime(
        `${overrides.startDateLocal ?? "2026-04-10"}T00:00:00.000`,
        overrides.timezone ?? recurringTestTimezone
      ).toISOString(),
      endDateLocal,
      itemId: overrides.id ?? "item-1",
      intervalValue,
      notificationsEnabled,
      recurrenceType,
      reminderTimeLocal,
      seedStartDateLocal: overrides.startDateLocal ?? "2026-04-10",
      userId: overrides.userId ?? "user-1",
      weekdayMask,
    }),
  ];
  const [firstVersion, ...remainingVersions] = versions;

  if (!firstVersion) {
    throw new Error("테스트 일정에는 schedule version이 필요합니다.");
  }

  return {
    colorKey: "blue",
    createdAt: "2026-04-01T00:00:00.000Z",
    description: null,
    id: "item-1",
    isArchived: false,
    scheduleVersions: [firstVersion, ...remainingVersions],
    startDateLocal: "2026-04-10",
    timezone: recurringTestTimezone,
    title: "테스트 일정",
    updatedAt: "2026-04-01T00:00:00.000Z",
    userId: "user-1",
    ...itemOverrides,
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
