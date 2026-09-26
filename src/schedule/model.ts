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

export type RecurrenceType = (typeof recurrenceTypes)[number];
export type AnchorType = (typeof anchorTypes)[number];

export type RuleVersion = {
  anchorType: AnchorType;
  effectiveFromUtc: string;
  endDateLocal: string | null;
  intervalValue: number | null;
  notificationsEnabled: boolean;
  recurrenceType: RecurrenceType;
  reminderTimeLocal: string;
  seedStartDateLocal: string;
  weekdayMask: number[] | null;
};

export type Schedule = {
  id: string;
  title: string;
  description: string | null;
  contentStatus?: "unrecoverable";
  colorHex: string;
  startDateLocal: string;
  isArchived: boolean;
  createdAt: string;
  versions: [RuleVersion, ...RuleVersion[]];
};

/** 일정 생성과 수정에서 입력받는 정규화된 값. */
export type CreateScheduleInput = {
  anchorType: AnchorType;
  colorHex: string;
  description: string | null;
  endDateLocal: string | null;
  intervalValue: number | null;
  notificationsEnabled: boolean;
  recurrenceType: RecurrenceType;
  reminderTimeLocal: string;
  startDateLocal: string;
  title: string;
  weekdayMask: number[] | null;
};

export type OccurrenceStatus =
  | "completed"
  | "overdue"
  | "scheduled"
  | "skipped";
export type OccurrenceAction = "completed" | "skipped";

export type OccurrenceLog = {
  id: string;
  itemId: string;
  scheduledAtUtc: string;
  action: OccurrenceAction;
  actedAtUtc: string;
};

export type Occurrence = {
  localDate: string;
  scheduledAtUtc: string;
  status: OccurrenceStatus;
};

export type OccurrenceEntry = {
  occurrence: Occurrence;
  schedule: Schedule;
};

/** 일정에 현재 적용되는 최신 규칙 버전을 반환한다. */
export function currentRule(schedule: Schedule): RuleVersion {
  return schedule.versions.at(-1)!;
}
