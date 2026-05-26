import type { Locale } from "date-fns";
import { format, parse } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type { AppLanguage } from "~/shared/i18n";

import type { CompletionAction, RecurringItem } from "../model/types";
import { getCurrentScheduleVersion } from "../model/types";

const localeByLanguage = {
  en: enUS,
  ko,
} as const satisfies Record<AppLanguage, Locale>;

const localDateTitleFormatByLanguage = {
  en: "MMM d",
  ko: "M월 d일",
} as const satisfies Record<AppLanguage, string>;

const localTimeFormatByLanguage = {
  en: "h:mm a",
  ko: "a h:mm",
} as const satisfies Record<AppLanguage, string>;

const weekdayLabelByValue = new Map<number, string>([
  [0, "일"],
  [1, "월"],
  [2, "화"],
  [3, "수"],
  [4, "목"],
  [5, "금"],
  [6, "토"],
]);

const englishWeekdayLabelByValue = new Map<number, string>([
  [0, "Sun"],
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
]);

export function formatLocalDateTitle(
  localDate: string,
  language: AppLanguage = "ko"
): string {
  return format(
    parse(localDate, "yyyy-MM-dd", new Date()),
    localDateTitleFormatByLanguage[language],
    {
      locale: localeByLanguage[language],
    }
  );
}

export function formatLocalTimeLabel(
  localTime: string,
  language: AppLanguage = "ko"
): string {
  return format(
    parse(localTime, "HH:mm", new Date()),
    localTimeFormatByLanguage[language],
    {
      locale: localeByLanguage[language],
    }
  );
}

export function formatUtcTimeInTimezone(
  utcDateTime: string,
  timezone: string,
  language: AppLanguage = "ko"
): string {
  return formatInTimeZone(
    utcDateTime,
    timezone,
    localTimeFormatByLanguage[language],
    {
      locale: localeByLanguage[language],
    }
  );
}

export function getCompletionActionLabel(
  action: CompletionAction,
  language: AppLanguage = "ko"
): string {
  if (language === "en") {
    return action === "completed" ? "Complete" : "Skip";
  }

  return action === "completed" ? "완료" : "건너뜀";
}

export function getRecurrenceLabel(
  item: RecurringItem,
  language: AppLanguage = "ko"
): string {
  const currentSchedule = getCurrentScheduleVersion(item);
  const recurrenceType = currentSchedule?.recurrenceType ?? item.recurrenceType;
  const intervalValue = currentSchedule?.intervalValue ?? item.intervalValue;
  const weekdayMask = currentSchedule?.weekdayMask ?? item.weekdayMask;

  if (language === "en") {
    switch (recurrenceType) {
      case "once":
        return "Once";
      case "daily":
        return "Daily";
      case "interval_days":
        return getEnglishIntervalLabel(intervalValue, "day");
      case "weekly":
        return getWeeklyLabel("Weekly", weekdayMask, language);
      case "interval_weeks":
        return getWeeklyLabel(
          getEnglishIntervalLabel(intervalValue, "week"),
          weekdayMask,
          language
        );
      case "monthly":
        return "Monthly";
      case "interval_months":
        return getEnglishIntervalLabel(intervalValue, "month");
      default:
        return "Repeats";
    }
  }

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

function getEnglishIntervalLabel(
  intervalValue: number | null | undefined,
  unit: "day" | "month" | "week"
): string {
  const value = intervalValue ?? 1;

  return value === 1 ? `Every ${unit}` : `Every ${value} ${unit}s`;
}

function getWeeklyLabel(
  baseLabel: string,
  weekdayMask?: number[] | null,
  language: AppLanguage = "ko"
): string {
  if (!weekdayMask || weekdayMask.length === 0) {
    return baseLabel;
  }

  const labelsByValue =
    language === "en" ? englishWeekdayLabelByValue : weekdayLabelByValue;
  const labels = weekdayMask
    .slice()
    .sort((left, right) => left - right)
    .map((value) => labelsByValue.get(value) ?? "");

  return `${baseLabel} ${labels.join("·")}`;
}
