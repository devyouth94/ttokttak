import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type { CompletionAction, RecurringItem } from "../model/types";
import { getCurrentScheduleVersion } from "../model/types";

const weekdayLabelByValue = new Map<number, string>([
  [0, "일"],
  [1, "월"],
  [2, "화"],
  [3, "수"],
  [4, "목"],
  [5, "금"],
  [6, "토"],
]);

export function formatLocalDateTitle(localDate: string): string {
  return format(parse(localDate, "yyyy-MM-dd", new Date()), "M월 d일", {
    locale: ko,
  });
}

export function formatLocalTimeLabel(localTime: string): string {
  return format(parse(localTime, "HH:mm", new Date()), "a h:mm", {
    locale: ko,
  });
}

export function formatUtcTimeInTimezone(
  utcDateTime: string,
  timezone: string
): string {
  return formatInTimeZone(utcDateTime, timezone, "a h:mm", {
    locale: ko,
  });
}

export function getCompletionActionLabel(action: CompletionAction): string {
  return action === "completed" ? "완료" : "건너뜀";
}

export function getRecurrenceLabel(item: RecurringItem): string {
  const currentSchedule = getCurrentScheduleVersion(item);
  const recurrenceType = currentSchedule?.recurrenceType ?? item.recurrenceType;
  const intervalValue = currentSchedule?.intervalValue ?? item.intervalValue;
  const weekdayMask = currentSchedule?.weekdayMask ?? item.weekdayMask;

  switch (recurrenceType) {
    case "once":
      return "한 번";
    case "daily":
      return "매일";
    case "interval_days":
      return `${intervalValue ?? 1}일마다`;
    case "weekly":
      return getWeeklyLabel("매주", weekdayMask);
    case "interval_weeks":
      return getWeeklyLabel(`${intervalValue ?? 1}주마다`, weekdayMask);
    case "monthly":
      return "매달";
    case "interval_months":
      return `${intervalValue ?? 1}달마다`;
    default:
      return "반복";
  }
}

function getWeeklyLabel(
  baseLabel: string,
  weekdayMask?: number[] | null
): string {
  if (!weekdayMask || weekdayMask.length === 0) {
    return baseLabel;
  }

  const labels = weekdayMask
    .slice()
    .sort((left, right) => left - right)
    .map((value) => weekdayLabelByValue.get(value) ?? "");

  return `${baseLabel} ${labels.join("·")}`;
}
