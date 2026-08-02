import type { AppLanguage } from "~/i18n/language";
import { formatLocal } from "~/schedule/display/date";
import {
  firstDate,
  type RecurrenceType,
  requiresWeekdays,
} from "~/schedule/rules/recurrence";

import {
  type CustomRecurrenceUnit,
  getCustomRecurrenceUnit,
} from "./schedule-form-state";

export type FormErrorTarget = "options" | "recurrence" | "schedule" | "title";
export type RecurringItemFormErrorState = {
  anchor?: string;
  endDate?: string;
  interval?: string;
  reminderTime?: string;
  startDate?: string;
  title?: string;
  weekday?: string;
};
export type RecurrenceSectionState = {
  customUnit: CustomRecurrenceUnit | null;
  isCustomSelected: boolean;
  isOnceSelected: boolean;
  showsStandaloneWeekdaySelector: boolean;
  showsCustomRecurrencePanel: boolean;
  showsWeekdaySelector: boolean;
  showsWeekdaysInsideCustomPanel: boolean;
};

const positiveIntegerPattern = /^[1-9]\d*$/;

const scheduleFormScreenTitleByLanguage = {
  en: {
    create: "Add item",
    edit: "Edit item",
  },
  ko: {
    create: "일정 추가",
    edit: "일정 수정",
  },
} as const satisfies Record<AppLanguage, Record<"create" | "edit", string>>;

const firstReminderHelperFormatters = {
  en: (dateLabel: string) => `First reminder is ${dateLabel}.`,
  ko: (dateLabel: string) => `첫 알림일은 ${dateLabel}입니다.`,
} as const satisfies Record<AppLanguage, (dateLabel: string) => string>;

const completionBasedInfoTextByLanguage = {
  en: "Recalculates the next item from the date you complete it. Disabled for once and weekly settings.",
  ko: "완료한 날짜를 기준으로 다음 일정을 다시 계산합니다. 한 번 설정과 주 단위 설정에서는 비활성화됩니다.",
} as const satisfies Record<AppLanguage, string>;

const weekdayOptionsByLanguage = {
  en: [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
    { label: "Sun", value: 0 },
  ],
  ko: [
    { label: "월", value: 1 },
    { label: "화", value: 2 },
    { label: "수", value: 3 },
    { label: "목", value: 4 },
    { label: "금", value: 5 },
    { label: "토", value: 6 },
    { label: "일", value: 0 },
  ],
} as const satisfies Record<
  AppLanguage,
  readonly { label: string; value: number }[]
>;

const quickRecurrenceOptionsByLanguage: Record<
  AppLanguage,
  {
    label: string;
    value: RecurrenceType;
  }[]
> = {
  en: [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
  ],
  ko: [
    { label: "매일", value: "daily" },
    { label: "매주", value: "weekly" },
    { label: "매달", value: "monthly" },
  ],
};

const customRecurrenceUnitOptionsByLanguage: Record<
  AppLanguage,
  {
    label: string;
    value: CustomRecurrenceUnit;
  }[]
> = {
  en: [
    { label: "days", value: "days" },
    { label: "weeks", value: "weeks" },
    { label: "months", value: "months" },
  ],
  ko: [
    { label: "일", value: "days" },
    { label: "주", value: "weeks" },
    { label: "달", value: "months" },
  ],
};

export function getWeekdayOptions(language: AppLanguage = "ko") {
  return weekdayOptionsByLanguage[language];
}

export function getQuickRecurrenceOptions(language: AppLanguage = "ko") {
  return quickRecurrenceOptionsByLanguage[language];
}

export function getCustomRecurrenceUnitOptions(language: AppLanguage = "ko") {
  return customRecurrenceUnitOptionsByLanguage[language];
}

function formatLocalDateForDisplay(
  localDate: string,
  language: AppLanguage
): string {
  return formatLocal(localDate, "fullDate", language);
}

function formatLocalTimeForDisplay(
  localTime: string,
  language: AppLanguage
): string {
  return formatLocal(localTime, "time", language);
}

export function getScheduleFormScreenTitle(
  isEditMode: boolean,
  language: AppLanguage = "ko"
): string {
  const copy = scheduleFormScreenTitleByLanguage[language];

  return isEditMode ? copy.edit : copy.create;
}

export function getRecurringItemFormDisplayValues(
  formState: {
    endDateLocal: string | null;
    intervalValue: string;
    reminderTimeLocal: string;
    recurrenceType: RecurrenceType;
    startDateLocal: string;
    weekdayMask: number[];
  },
  language: AppLanguage = "ko"
): {
  endDateDisplayValue: string | null;
  firstReminderHelperText: string | null;
  reminderTimeDisplayValue: string;
  startDateDisplayValue: string;
} {
  return {
    endDateDisplayValue:
      formState.endDateLocal == null
        ? null
        : formatLocalDateForDisplay(formState.endDateLocal, language),
    firstReminderHelperText: getFirstReminderHelperText(formState, language),
    reminderTimeDisplayValue: formatLocalTimeForDisplay(
      formState.reminderTimeLocal,
      language
    ),
    startDateDisplayValue: formatLocalDateForDisplay(
      formState.startDateLocal,
      language
    ),
  };
}

export function getRecurringItemFormEndDateControlState(
  params: {
    endDateLocal: string | null;
    recurrenceType: RecurrenceType;
  },
  language: AppLanguage = "ko"
): {
  displayValue: string | null;
  isEnabled: boolean;
  isVisible: boolean;
} {
  const isVisible = params.recurrenceType !== "once";
  const isEnabled = isVisible && params.endDateLocal != null;

  return {
    displayValue:
      params.endDateLocal != null && isEnabled
        ? formatLocalDateForDisplay(params.endDateLocal, language)
        : null,
    isEnabled,
    isVisible,
  };
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();

  if (!positiveIntegerPattern.test(trimmed)) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
}

export function getFirstReminderHelperText(
  formState: {
    intervalValue: string;
    recurrenceType: RecurrenceType;
    startDateLocal: string;
    weekdayMask: number[];
  },
  language: AppLanguage = "ko"
): string | null {
  const firstReminderLocalDate = getFirstWeeklyOccurrenceLocalDate(formState);

  if (
    !firstReminderLocalDate ||
    firstReminderLocalDate === formState.startDateLocal
  ) {
    return null;
  }

  const dateLabel = formatLocal(
    firstReminderLocalDate,
    "weekdayDate",
    language
  );

  return firstReminderHelperFormatters[language](dateLabel);
}

function getFirstWeeklyOccurrenceLocalDate(formState: {
  intervalValue: string;
  recurrenceType: RecurrenceType;
  startDateLocal: string;
  weekdayMask: number[];
}): string | null {
  if (!requiresWeekdays(formState.recurrenceType)) {
    return null;
  }

  if (formState.weekdayMask.length === 0) {
    return null;
  }

  const intervalValue =
    formState.recurrenceType === "interval_weeks"
      ? parsePositiveInteger(formState.intervalValue)
      : 1;
  return firstDate({
    intervalValue,
    recurrenceType: formState.recurrenceType,
    startDateLocal: formState.startDateLocal,
    weekdayMask: formState.weekdayMask,
  });
}

export function getRecurringItemFormFirstErrorTarget(
  errors: RecurringItemFormErrorState
): FormErrorTarget | null {
  if (errors.title) {
    return "title";
  }

  if (errors.interval || errors.weekday) {
    return "recurrence";
  }

  if (errors.startDate || errors.reminderTime || errors.endDate) {
    return "schedule";
  }

  if (errors.anchor) {
    return "options";
  }

  return null;
}

export function getRecurrenceSectionState(
  recurrenceType: RecurrenceType
): RecurrenceSectionState {
  const customUnit = getCustomRecurrenceUnit(recurrenceType);
  const showsWeekdaysInsideCustomPanel = recurrenceType === "interval_weeks";
  const showsWeekdaySelector =
    recurrenceType === "weekly" || showsWeekdaysInsideCustomPanel;

  return {
    customUnit,
    isCustomSelected: customUnit !== null,
    isOnceSelected: recurrenceType === "once",
    showsStandaloneWeekdaySelector:
      showsWeekdaySelector && !showsWeekdaysInsideCustomPanel,
    showsCustomRecurrencePanel: customUnit !== null,
    showsWeekdaySelector,
    showsWeekdaysInsideCustomPanel,
  };
}

export function getCompletionBasedInfoText(
  language: AppLanguage = "ko"
): string {
  return completionBasedInfoTextByLanguage[language];
}
