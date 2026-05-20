import { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import {
  getFirstOccurrenceLocalDate,
  type RecurrenceType,
} from "~/entities/schedule";
import {
  requiresWeekdayMask,
  supportsCompletionBased,
} from "~/entities/schedule";

import {
  type CustomRecurrenceUnit,
  type DatePickerTarget,
  getCustomRecurrenceUnit,
  parseLocalDateToDate,
  parseLocalTimeToDate,
  type PickerMode,
} from "./recurring-item-form-state";
export { recurringItemColorOptions } from "~/entities/schedule";

export type FormErrorTarget = "options" | "recurrence" | "schedule" | "title";
export type PickerChangeHandler = (
  event: DateTimePickerEvent,
  selectedDate?: Date
) => void;
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

export const weekdayOptions = [
  { label: "월", value: 1 },
  { label: "화", value: 2 },
  { label: "수", value: 3 },
  { label: "목", value: 4 },
  { label: "금", value: 5 },
  { label: "토", value: 6 },
  { label: "일", value: 0 },
] as const;

export const quickRecurrenceOptions: {
  label: string;
  value: RecurrenceType;
}[] = [
  { label: "매일", value: "daily" },
  { label: "매주", value: "weekly" },
  { label: "매달", value: "monthly" },
];

export const customRecurrenceUnitOptions: {
  label: string;
  value: CustomRecurrenceUnit;
}[] = [
  { label: "일", value: "days" },
  { label: "주", value: "weeks" },
  { label: "달", value: "months" },
];

export function formatLocalDateForDisplay(localDate: string): string {
  return format(parseLocalDateToDate(localDate), "yyyy년 M월 d일", {
    locale: ko,
  });
}

export function formatLocalTimeForDisplay(localTime: string): string {
  return format(parseLocalTimeToDate(localTime), "a h:mm", {
    locale: ko,
  });
}

export function getRecurringItemFormScreenTitle(isEditMode: boolean): string {
  return isEditMode ? "일정 수정" : "일정 추가";
}

export function getRecurringItemFormDisplayValues(formState: {
  endDateLocal: string | null;
  intervalValue: string;
  reminderTimeLocal: string;
  recurrenceType: RecurrenceType;
  startDateLocal: string;
  weekdayMask: number[];
}): {
  endDateDisplayValue: string | null;
  firstReminderHelperText: string | null;
  reminderTimeDisplayValue: string;
  startDateDisplayValue: string;
} {
  return {
    endDateDisplayValue:
      formState.endDateLocal == null
        ? null
        : formatLocalDateForDisplay(formState.endDateLocal),
    firstReminderHelperText: getFirstReminderHelperText(formState),
    reminderTimeDisplayValue: formatLocalTimeForDisplay(
      formState.reminderTimeLocal
    ),
    startDateDisplayValue: formatLocalDateForDisplay(formState.startDateLocal),
  };
}

export function getRecurringItemFormEndDateControlState(params: {
  endDateLocal: string | null;
  recurrenceType: RecurrenceType;
}): {
  displayValue: string | null;
  isEnabled: boolean;
  isVisible: boolean;
} {
  const isVisible = params.recurrenceType !== "once";
  const isEnabled = isVisible && params.endDateLocal != null;

  return {
    displayValue:
      params.endDateLocal != null && isEnabled
        ? formatLocalDateForDisplay(params.endDateLocal)
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

export function getFirstReminderHelperText(formState: {
  intervalValue: string;
  recurrenceType: RecurrenceType;
  startDateLocal: string;
  weekdayMask: number[];
}): string | null {
  const firstReminderLocalDate = getFirstWeeklyOccurrenceLocalDate(formState);

  if (
    !firstReminderLocalDate ||
    firstReminderLocalDate === formState.startDateLocal
  ) {
    return null;
  }

  return `첫 알림일은 ${format(
    parseLocalDateToDate(firstReminderLocalDate),
    "M월 d일 EEEE",
    { locale: ko }
  )}입니다.`;
}

function getFirstWeeklyOccurrenceLocalDate(formState: {
  intervalValue: string;
  recurrenceType: RecurrenceType;
  startDateLocal: string;
  weekdayMask: number[];
}): string | null {
  if (!requiresWeekdayMask(formState.recurrenceType)) {
    return null;
  }

  if (formState.weekdayMask.length === 0) {
    return null;
  }

  const intervalValue =
    formState.recurrenceType === "interval_weeks"
      ? parsePositiveInteger(formState.intervalValue)
      : 1;
  return getFirstOccurrenceLocalDate({
    intervalValue,
    recurrenceType: formState.recurrenceType,
    startDateLocal: formState.startDateLocal,
    weekdayMask: formState.weekdayMask,
  });
}

export function getIosPickerChangeHandler(
  pickerMode: PickerMode | null,
  datePickerTarget: DatePickerTarget | null,
  handlers: {
    onEndDateChange: PickerChangeHandler;
    onStartDateChange: PickerChangeHandler;
    onTimeChange: PickerChangeHandler;
  }
): PickerChangeHandler {
  if (pickerMode === "time") {
    return handlers.onTimeChange;
  }

  return datePickerTarget === "endDate"
    ? handlers.onEndDateChange
    : handlers.onStartDateChange;
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

export function getAdvancedOptionsState(params: {
  recurrenceType: RecurrenceType;
}): {
  isCompletionBasedSwitchEnabled: boolean;
} {
  return {
    isCompletionBasedSwitchEnabled:
      params.recurrenceType !== "once" &&
      supportsCompletionBased(params.recurrenceType),
  };
}

export function getCompletionBasedInfoText(): string {
  return "완료한 날짜를 기준으로 다음 일정을 다시 계산합니다. 한 번 설정과 주 단위 설정에서는 비활성화됩니다.";
}
