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

const fullLocalDateFormatByLanguage = {
  en: "MMM d, yyyy",
  ko: "yyyy년 M월 d일",
} as const satisfies Record<AppLanguage, string>;

const weekdayLocalDateTitleFormatByLanguage = {
  en: "EEEE, MMM d",
  ko: "M월 d일 EEEE",
} as const satisfies Record<AppLanguage, string>;

const visibleMonthTitleFormatByLanguage = {
  en: "MMMM yyyy",
  ko: "yyyy년 M월",
} as const satisfies Record<AppLanguage, string>;

const completionActionLabelByLanguage = {
  en: {
    completed: "Complete",
    skipped: "Skip",
  },
  ko: {
    completed: "완료",
    skipped: "건너뜀",
  },
} as const satisfies Record<AppLanguage, Record<CompletionAction, string>>;

const recurrenceCopyByLanguage = {
  en: {
    daily: "Daily",
    fallback: "Repeats",
    monthly: "Monthly",
    once: "Once",
    weekly: "Weekly",
  },
  ko: {
    daily: "매일",
    fallback: "반복",
    monthly: "매달",
    once: "한 번",
    weekly: "매주",
  },
} as const satisfies Record<
  AppLanguage,
  Record<"daily" | "fallback" | "monthly" | "once" | "weekly", string>
>;

const intervalLabelFormatters = {
  en: (
    intervalValue: number | null | undefined,
    unit: "day" | "month" | "week"
  ) => getEnglishIntervalLabel(intervalValue, unit),
  ko: (
    intervalValue: number | null | undefined,
    unit: "day" | "month" | "week"
  ) => `${intervalValue ?? 1}${getKoreanIntervalUnitLabel(unit)}마다`,
} as const satisfies Record<
  AppLanguage,
  (
    intervalValue: number | null | undefined,
    unit: "day" | "month" | "week"
  ) => string
>;

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

const weekdayLabelMapByLanguage = {
  en: englishWeekdayLabelByValue,
  ko: weekdayLabelByValue,
} as const satisfies Record<AppLanguage, Map<number, string>>;

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

export function formatFullLocalDate(
  localDate: string,
  language: AppLanguage = "ko"
): string {
  return formatLocalDateWithPattern(
    localDate,
    fullLocalDateFormatByLanguage[language],
    language
  );
}

export function formatWeekdayLocalDateTitle(
  localDate: string,
  language: AppLanguage = "ko"
): string {
  return formatLocalDateWithPattern(
    localDate,
    weekdayLocalDateTitleFormatByLanguage[language],
    language
  );
}

export function formatVisibleMonthTitle(
  visibleMonth: string,
  language: AppLanguage = "ko"
): string {
  return format(
    parse(`${visibleMonth}-01`, "yyyy-MM-dd", new Date()),
    visibleMonthTitleFormatByLanguage[language],
    {
      locale: getDateFnsLocale(language),
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

export function formatUtcDateTitleInTimezone(
  utcDateTime: string,
  timezone: string,
  language: AppLanguage = "ko"
): string {
  return formatInTimeZone(
    utcDateTime,
    timezone,
    localDateTitleFormatByLanguage[language],
    {
      locale: getDateFnsLocale(language),
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

export function getDateFnsLocale(language: AppLanguage = "ko"): Locale {
  return localeByLanguage[language];
}

export function getCompletionActionLabel(
  action: CompletionAction,
  language: AppLanguage = "ko"
): string {
  return completionActionLabelByLanguage[language][action];
}

export function getRecurrenceLabel(
  item: RecurringItem,
  language: AppLanguage = "ko"
): string {
  const currentSchedule = getCurrentScheduleVersion(item);
  const recurrenceType = currentSchedule?.recurrenceType ?? item.recurrenceType;
  const intervalValue = currentSchedule?.intervalValue ?? item.intervalValue;
  const weekdayMask = currentSchedule?.weekdayMask ?? item.weekdayMask;
  const copy = recurrenceCopyByLanguage[language];

  switch (recurrenceType) {
    case "once":
      return copy.once;
    case "daily":
      return copy.daily;
    case "interval_days":
      return intervalLabelFormatters[language](intervalValue, "day");
    case "weekly":
      return getWeeklyLabel(copy.weekly, weekdayMask, language);
    case "interval_weeks":
      return getWeeklyLabel(
        intervalLabelFormatters[language](intervalValue, "week"),
        weekdayMask,
        language
      );
    case "monthly":
      return copy.monthly;
    case "interval_months":
      return intervalLabelFormatters[language](intervalValue, "month");
    default:
      return copy.fallback;
  }
}

function getEnglishIntervalLabel(
  intervalValue: number | null | undefined,
  unit: "day" | "month" | "week"
): string {
  const value = intervalValue ?? 1;

  return value === 1 ? `Every ${unit}` : `Every ${value} ${unit}s`;
}

function getKoreanIntervalUnitLabel(unit: "day" | "month" | "week"): string {
  switch (unit) {
    case "day":
      return "일";
    case "month":
      return "달";
    case "week":
      return "주";
  }
}

function formatLocalDateWithPattern(
  localDate: string,
  pattern: string,
  language: AppLanguage
): string {
  return format(parse(localDate, "yyyy-MM-dd", new Date()), pattern, {
    locale: getDateFnsLocale(language),
  });
}

function getWeeklyLabel(
  baseLabel: string,
  weekdayMask?: number[] | null,
  language: AppLanguage = "ko"
): string {
  if (!weekdayMask || weekdayMask.length === 0) {
    return baseLabel;
  }

  const labelsByValue = weekdayLabelMapByLanguage[language];
  const labels = weekdayMask
    .slice()
    .sort((left, right) => left - right)
    .map((value) => labelsByValue.get(value) ?? "");

  return `${baseLabel} ${labels.join("·")}`;
}
