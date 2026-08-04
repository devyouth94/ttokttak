import type { AppLanguage } from "~/i18n/language";
import { formatLocal } from "~/schedule/display/date";
import {
  firstDate,
  type RecurrenceType,
  requiresInterval,
  requiresWeekdays,
} from "~/schedule/rules/recurrence";

export type ErrorTarget = "options" | "recurrence" | "schedule" | "title";
export type FormErrors = {
  anchor?: string;
  endDate?: string;
  interval?: string;
  reminderTime?: string;
  startDate?: string;
  title?: string;
  weekday?: string;
};

export function getDisplayValues(
  values: {
    endDateLocal: string | null;
    intervalValue: string;
    recurrenceType: RecurrenceType;
    reminderTimeLocal: string;
    startDateLocal: string;
    weekdayMask: number[];
  },
  language: AppLanguage
) {
  return {
    endDate: values.endDateLocal
      ? formatLocal(values.endDateLocal, "fullDate", language)
      : null,
    firstReminder: firstReminderText(values, language),
    reminderTime: formatLocal(values.reminderTimeLocal, "time", language),
    startDate: formatLocal(values.startDateLocal, "fullDate", language),
  };
}

export function getEndDateControl(values: {
  endDateLocal: string | null;
  recurrenceType: RecurrenceType;
}) {
  const isVisible = values.recurrenceType !== "once";

  return {
    isEnabled: isVisible && values.endDateLocal != null,
    isVisible,
  };
}

export function getFirstErrorTarget(errors: FormErrors): ErrorTarget | null {
  if (errors.title) {
    return "title";
  }

  if (errors.interval || errors.weekday) {
    return "recurrence";
  }

  if (errors.startDate || errors.reminderTime || errors.endDate) {
    return "schedule";
  }

  return errors.anchor ? "options" : null;
}

export function getRecurrenceView(recurrenceType: RecurrenceType) {
  const isCustom = requiresInterval(recurrenceType);
  const weekdaysInsideCustom = recurrenceType === "interval_weeks";
  const showsWeekdays = recurrenceType === "weekly" || weekdaysInsideCustom;

  return {
    isCustom,
    isOnce: recurrenceType === "once",
    showsStandaloneWeekdays: showsWeekdays && !weekdaysInsideCustom,
    showsWeekdays,
    weekdaysInsideCustom,
  };
}

function firstReminderText(
  values: {
    intervalValue: string;
    recurrenceType: RecurrenceType;
    startDateLocal: string;
    weekdayMask: number[];
  },
  language: AppLanguage
): string | null {
  if (
    !requiresWeekdays(values.recurrenceType) ||
    values.weekdayMask.length === 0
  ) {
    return null;
  }

  const intervalValue =
    values.recurrenceType === "interval_weeks"
      ? positiveInteger(values.intervalValue)
      : 1;
  const firstReminder = firstDate({
    intervalValue,
    recurrenceType: values.recurrenceType,
    startDateLocal: values.startDateLocal,
    weekdayMask: values.weekdayMask,
  });

  if (!firstReminder || firstReminder === values.startDateLocal) {
    return null;
  }

  const date = formatLocal(firstReminder, "weekdayDate", language);

  return language === "ko"
    ? `첫 알림일은 ${date}입니다.`
    : `First reminder is ${date}.`;
}

function positiveInteger(value: string): number | null {
  return /^[1-9]\d*$/.test(value.trim()) ? Number(value) : null;
}
