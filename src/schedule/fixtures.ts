import { fromZonedTime } from "date-fns-tz";

import type { OccurrenceLog, RuleVersion, Schedule } from "./model";

export const testTimezone = "Asia/Seoul";

type RuleOverrides = Partial<
  Omit<RuleVersion, "effectiveFromUtc" | "seedStartDateLocal">
>;

export type ScheduleOverrides = Partial<Omit<Schedule, "versions">> &
  RuleOverrides & {
    timezone?: string;
    versions?: RuleVersion[];
  };

export function scheduleFixture(overrides: ScheduleOverrides = {}): Schedule {
  const {
    anchorType = "fixed",
    colorHex = "#9DB7F5",
    endDateLocal = null,
    intervalValue = null,
    notificationsEnabled = true,
    recurrenceType = "daily",
    reminderTimeLocal = "09:00",
    timezone = testTimezone,
    versions: providedVersions,
    weekdayMask = null,
    ...scheduleOverrides
  } = overrides;
  const versions = providedVersions ?? [
    ruleFixture({
      anchorType,
      effectiveFromUtc: fromZonedTime(
        `${overrides.startDateLocal ?? "2026-04-10"}T00:00:00.000`,
        timezone
      ).toISOString(),
      endDateLocal,
      intervalValue,
      notificationsEnabled,
      recurrenceType,
      reminderTimeLocal,
      seedStartDateLocal: overrides.startDateLocal ?? "2026-04-10",
      weekdayMask,
    }),
  ];
  const [firstVersion, ...remainingVersions] = versions;

  if (!firstVersion) {
    throw new Error("테스트 일정에는 규칙 버전이 필요합니다.");
  }

  return {
    colorHex,
    createdAt: "2026-04-01T00:00:00.000Z",
    description: null,
    id: "item-1",
    isArchived: false,
    startDateLocal: "2026-04-10",
    title: "테스트 일정",
    versions: [firstVersion, ...remainingVersions],
    ...scheduleOverrides,
  };
}

export function logFixture(
  overrides: Partial<OccurrenceLog> = {}
): OccurrenceLog {
  return {
    actedAtUtc: "2026-04-11T00:05:00.000Z",
    action: "completed",
    id: "log-1",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-11T00:00:00.000Z",
    ...overrides,
  };
}

export function ruleFixture(overrides: Partial<RuleVersion> = {}): RuleVersion {
  return {
    anchorType: "fixed",
    effectiveFromUtc: "2026-04-01T00:00:00.000Z",
    endDateLocal: null,
    intervalValue: null,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    seedStartDateLocal: "2026-04-10",
    weekdayMask: null,
    ...overrides,
  };
}
