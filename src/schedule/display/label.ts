import type { AppLanguage } from "~/i18n/language";

import type { OccurrenceAction } from "../rules/occurrence";
import type { Schedule } from "../schedule";
import { currentRule } from "../schedule";

const actionLabels = {
  en: { completed: "Complete", skipped: "Skip" },
  ko: { completed: "완료", skipped: "건너뜀" },
} as const satisfies Record<AppLanguage, Record<OccurrenceAction, string>>;

const recurrenceLabels = {
  en: { daily: "Daily", monthly: "Monthly", once: "Once", weekly: "Weekly" },
  ko: { daily: "매일", monthly: "매달", once: "한 번", weekly: "매주" },
} as const;

const weekdayLabels = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  ko: ["일", "월", "화", "수", "목", "금", "토"],
} as const satisfies Record<AppLanguage, readonly string[]>;

/** occurrence 처리 상태의 표시 문구를 반환한다. */
export function getActionLabel(
  action: OccurrenceAction,
  language: AppLanguage = "ko"
): string {
  return actionLabels[language][action];
}

/** 일정 반복 규칙의 표시 문구를 반환한다. */
export function getRecurrenceLabel(
  item: Schedule,
  language: AppLanguage = "ko"
): string {
  const { intervalValue, recurrenceType, weekdayMask } = currentRule(item);
  const labels = recurrenceLabels[language];

  switch (recurrenceType) {
    case "once":
      return labels.once;
    case "daily":
      return labels.daily;
    case "interval_days":
      return getIntervalLabel(intervalValue, "day", language);
    case "weekly":
      return getWeeklyLabel(labels.weekly, weekdayMask, language);
    case "interval_weeks":
      return getWeeklyLabel(
        getIntervalLabel(intervalValue, "week", language),
        weekdayMask,
        language
      );
    case "monthly":
      return labels.monthly;
    case "interval_months":
      return getIntervalLabel(intervalValue, "month", language);
  }
}

function getIntervalLabel(
  interval: number | null,
  unit: "day" | "month" | "week",
  language: AppLanguage
): string {
  const value = interval ?? 1;

  if (language === "ko") {
    const units = { day: "일", month: "달", week: "주" } as const;

    return `${value}${units[unit]}마다`;
  }

  return value === 1 ? `Every ${unit}` : `Every ${value} ${unit}s`;
}

function getWeeklyLabel(
  baseLabel: string,
  weekdays: number[] | null,
  language: AppLanguage
): string {
  if (!weekdays || weekdays.length === 0) {
    return baseLabel;
  }

  const labels = weekdays
    .slice()
    .sort((left, right) => left - right)
    .map((weekday) => weekdayLabels[language][weekday]);

  return `${baseLabel} ${labels.join("·")}`;
}
