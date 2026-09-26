import type {
  AnchorType,
  RecurrenceType,
  RuleVersion,
} from "./rules/recurrence";

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

/** 일정에 현재 적용되는 최신 규칙 버전을 반환한다. */
export function currentRule(schedule: Schedule): RuleVersion {
  return schedule.versions.at(-1)!;
}

/** 복구할 수 없는 암호문 대신 현재 언어의 대체 제목을 반환한다. */
export function getScheduleDisplayTitle(
  schedule: Pick<Schedule, "contentStatus" | "title">,
  unavailableTitle: string
): string {
  return schedule.contentStatus === "unrecoverable"
    ? unavailableTitle
    : schedule.title;
}
