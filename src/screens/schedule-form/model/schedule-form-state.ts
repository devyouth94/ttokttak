import { format, parse } from "date-fns";
import { z } from "zod/v4";

import {
  type AnchorType,
  anchorTypes,
  defaultRecurringItemColorKey,
  getCurrentScheduleVersion,
  type RecurrenceType,
  recurrenceTypes,
  type RecurringItem,
  recurringItemColorKeys,
  type RecurringItemDraft,
  requiresIntervalValue,
  requiresWeekdayMask,
  supportsCompletionBased,
  validateRecurringItemDraft,
  type ValidationIssueCode,
} from "~/entities/schedule";
import type { AppLanguage } from "~/shared/i18n";

export type CustomRecurrenceUnit = "days" | "weeks" | "months";
export type DatePickerTarget = "endDate" | "startDate";
export type PickerMode = "date" | "time";

const decimalIntegerPattern = /^\d+$/;
const recurringItemFormBaseSchema = z.object({
  anchorType: z.enum(anchorTypes),
  colorKey: z.enum(recurringItemColorKeys),
  description: z.string(),
  endDateLocal: z.string().nullable(),
  intervalValue: z.string(),
  notificationsEnabled: z.boolean(),
  recurrenceType: z.enum(recurrenceTypes),
  reminderTimeLocal: z.string(),
  startDateLocal: z.string(),
  title: z.string(),
  weekdayMask: z.array(z.number()),
});

export type RecurringItemFormValues = z.infer<
  typeof recurringItemFormBaseSchema
>;

const FORM_ERROR_MESSAGES = {
  en: {
    anchor_type_not_allowed:
      "Completion-based scheduling is not available for this repeat setting.",
    color_key_invalid: "Choose the item color again.",
    end_date_before_minimum_date: "Choose an end date from today onward.",
    end_date_before_start_date: "Choose an end date after the start date.",
    end_date_invalid: "Choose the end date again.",
    end_date_not_allowed: "Once items cannot use an end date.",
    end_date_without_occurrence:
      "There are no reminder days in the selected period.",
    interval_value_invalid: "Repeat interval must be at least 1.",
    interval_value_missing: "Enter a repeat interval.",
    interval_value_not_allowed: "Choose the repeat setting again.",
    reminder_time_invalid: "Choose a reminder time.",
    reminder_time_missing: "Choose a reminder time.",
    start_date_invalid: "Choose the start date again.",
    timezone_missing: "Check the timezone.",
    title_missing: "Enter a title.",
    weekday_mask_invalid: "Choose repeat weekdays again.",
    weekday_mask_missing: "Choose repeat weekdays.",
    weekday_mask_not_allowed: "Choose the repeat setting again.",
  },
  ko: {
    anchor_type_not_allowed: "완료일 기준은 이 반복 설정에서 사용할 수 없어요.",
    color_key_invalid: "일정 색상을 다시 선택해 주세요.",
    end_date_before_minimum_date: "종료일은 오늘 이후로 선택해 주세요.",
    end_date_before_start_date: "종료일은 시작일 이후로 선택해 주세요.",
    end_date_invalid: "종료일을 다시 선택해 주세요.",
    end_date_not_allowed: "한 번 일정은 종료일을 사용할 수 없어요.",
    end_date_without_occurrence: "선택한 기간 안에 알림일이 없어요.",
    interval_value_invalid: "반복 간격은 1 이상이어야 해요.",
    interval_value_missing: "반복 간격을 입력해 주세요.",
    interval_value_not_allowed: "반복 설정을 다시 선택해 주세요.",
    reminder_time_invalid: "알림 시간을 선택해 주세요.",
    reminder_time_missing: "알림 시간을 선택해 주세요.",
    start_date_invalid: "시작일을 다시 선택해 주세요.",
    timezone_missing: "시간대를 확인해 주세요.",
    title_missing: "제목을 입력해 주세요.",
    weekday_mask_invalid: "반복할 요일을 다시 선택해 주세요.",
    weekday_mask_missing: "반복할 요일을 선택해 주세요.",
    weekday_mask_not_allowed: "반복 설정을 다시 선택해 주세요.",
  },
} as const satisfies Record<AppLanguage, Record<ValidationIssueCode, string>>;

export function getTodayLocalDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function parseLocalDateToDate(localDate: string): Date {
  return parse(localDate, "yyyy-MM-dd", new Date());
}

export function formatDateToLocalDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function getCurrentLocalTime(): string {
  return format(new Date(), "HH:mm");
}

export function parseLocalTimeToDate(localTime: string): Date {
  return parse(localTime, "HH:mm", new Date());
}

export function formatDateToLocalTime(date: Date): string {
  return format(date, "HH:mm");
}

export function createDefaultFormState(): RecurringItemFormValues {
  return {
    anchorType: "fixed",
    colorKey: defaultRecurringItemColorKey,
    description: "",
    endDateLocal: null,
    intervalValue: "",
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: getCurrentLocalTime(),
    startDateLocal: getTodayLocalDate(),
    title: "",
    weekdayMask: [],
  };
}

export function getMinimumStartDateLocal(params: {
  initialStartDateLocal?: string;
  isEditMode: boolean;
  todayLocalDate: string;
}): string {
  if (params.isEditMode && params.initialStartDateLocal) {
    return params.initialStartDateLocal;
  }

  return params.todayLocalDate;
}

export function getMinimumEndDateLocal(params: {
  isEditMode: boolean;
  startDateLocal: string;
  todayLocalDate: string;
}): string {
  if (!params.isEditMode) {
    return params.startDateLocal;
  }

  return params.startDateLocal > params.todayLocalDate
    ? params.startDateLocal
    : params.todayLocalDate;
}

export function normalizeStartDateSelection(
  nextValue: string,
  minimumStartDateLocal: string
): string {
  return nextValue < minimumStartDateLocal ? minimumStartDateLocal : nextValue;
}

export function normalizeEndDateSelection(
  nextValue: string,
  params: {
    isEditMode: boolean;
    startDateLocal: string;
    todayLocalDate: string;
  }
): string {
  const minimumEndDateLocal = getMinimumEndDateLocal(params);

  return nextValue < minimumEndDateLocal ? minimumEndDateLocal : nextValue;
}

export function getNextEndDateEnabledFormState(
  current: RecurringItemFormValues,
  params: {
    isEditMode: boolean;
    todayLocalDate: string;
  }
): RecurringItemFormValues {
  return {
    ...current,
    endDateLocal: getMinimumEndDateLocal({
      isEditMode: params.isEditMode,
      startDateLocal: current.startDateLocal,
      todayLocalDate: params.todayLocalDate,
    }),
  };
}

export function getNextEndDateDisabledFormState(
  current: RecurringItemFormValues
): RecurringItemFormValues {
  return {
    ...current,
    endDateLocal: null,
  };
}

export function getNextEndDateSelectionFormState(
  current: RecurringItemFormValues,
  nextValue: string,
  params: {
    isEditMode: boolean;
    todayLocalDate: string;
  }
): RecurringItemFormValues {
  return {
    ...current,
    endDateLocal: normalizeEndDateSelection(nextValue, {
      isEditMode: params.isEditMode,
      startDateLocal: current.startDateLocal,
      todayLocalDate: params.todayLocalDate,
    }),
  };
}

function parseIntervalValue(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return decimalIntegerPattern.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function createRecurringItemFormSchema(params: {
  isEditMode: boolean;
  language: AppLanguage;
  todayLocalDate: string;
  timezone: string;
}) {
  const messages = FORM_ERROR_MESSAGES[params.language];

  return recurringItemFormBaseSchema.superRefine((formState, context) => {
    const issues = validateRecurringItemDraft(
      toDraft(formState, params.timezone),
      {
        minimumEndDateLocal: params.isEditMode
          ? params.todayLocalDate
          : undefined,
      }
    );

    for (const issue of issues) {
      context.addIssue({
        code: "custom",
        message: messages[issue.code],
        path: issue.field === "timezone" ? [] : [issue.field],
      });
    }
  });
}

function getWeekdayMaskFromDate(dateText: string): number[] {
  const date = parseLocalDateToDate(dateText);

  return [date.getDay()];
}

export function toggleWeekdayMask(
  weekdayMask: number[],
  weekdayValue: number
): number[] {
  const exists = weekdayMask.includes(weekdayValue);

  if (exists) {
    return weekdayMask.filter((value) => value !== weekdayValue);
  }

  return [...weekdayMask, weekdayValue];
}

export function getNextStartDateFormState(
  current: RecurringItemFormValues,
  nextValue: string
): RecurringItemFormValues {
  return {
    ...current,
    endDateLocal:
      current.endDateLocal != null && current.endDateLocal < nextValue
        ? nextValue
        : current.endDateLocal,
    startDateLocal: nextValue,
    weekdayMask:
      requiresWeekdayMask(current.recurrenceType) &&
      current.weekdayMask.length === 0
        ? getWeekdayMaskFromDate(nextValue)
        : current.weekdayMask,
  };
}

export function getNextStartDateSelectionFormState(
  current: RecurringItemFormValues,
  nextValue: string,
  params: {
    isEditMode: boolean;
    minimumStartDateLocal: string;
  }
): RecurringItemFormValues {
  if (params.isEditMode) {
    return current;
  }

  return getNextStartDateFormState(
    current,
    normalizeStartDateSelection(nextValue, params.minimumStartDateLocal)
  );
}

export function getNextRecurrenceFormState(
  current: RecurringItemFormValues,
  nextRecurrenceType: RecurrenceType
): RecurringItemFormValues {
  const nextWeekdayMask = requiresWeekdayMask(nextRecurrenceType)
    ? current.weekdayMask.length > 0
      ? current.weekdayMask
      : getWeekdayMaskFromDate(current.startDateLocal)
    : [];

  return {
    ...current,
    anchorType: getNormalizedAnchorType(current.anchorType, nextRecurrenceType),
    endDateLocal:
      nextRecurrenceType === "once" || current.recurrenceType === "once"
        ? null
        : current.endDateLocal,
    intervalValue: requiresIntervalValue(nextRecurrenceType)
      ? current.intervalValue || "1"
      : "",
    recurrenceType: nextRecurrenceType,
    weekdayMask: nextWeekdayMask,
  };
}

export function getSanitizedIntervalInput(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function getScheduleFormPickerDates(params: {
  endDateLocal: string | null;
  minimumEndDateLocal: string;
  minimumStartDateLocal: string;
  reminderTimeLocal: string;
  startDateLocal: string;
}): {
  minimumEndDate: Date;
  minimumStartDate: Date;
  selectedEndDate: Date;
  selectedReminderTime: Date;
  selectedStartDate: Date;
} {
  const selectedEndDateLocal =
    params.endDateLocal != null &&
    params.endDateLocal >= params.minimumEndDateLocal
      ? params.endDateLocal
      : params.minimumEndDateLocal;
  const selectedStartDateLocal =
    params.startDateLocal < params.minimumStartDateLocal
      ? params.minimumStartDateLocal
      : params.startDateLocal;

  return {
    minimumEndDate: parseLocalDateToDate(params.minimumEndDateLocal),
    minimumStartDate: parseLocalDateToDate(params.minimumStartDateLocal),
    selectedEndDate: parseLocalDateToDate(selectedEndDateLocal),
    selectedReminderTime: parseLocalTimeToDate(params.reminderTimeLocal),
    selectedStartDate: parseLocalDateToDate(selectedStartDateLocal),
  };
}

export function getScheduleFormIosPickerValue(params: {
  datePickerTarget: DatePickerTarget | null;
  endDateLocal: string | null;
  minimumEndDateLocal: string;
  minimumStartDateLocal: string;
  mode: PickerMode;
  reminderTimeLocal: string;
  startDateLocal: string;
}): Date {
  const pickerDates = getScheduleFormPickerDates(params);

  if (params.mode === "time") {
    return pickerDates.selectedReminderTime;
  }

  return params.datePickerTarget === "endDate"
    ? pickerDates.selectedEndDate
    : pickerDates.selectedStartDate;
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function toDraft(
  formState: RecurringItemFormValues,
  timezone: string
): RecurringItemDraft {
  return {
    anchorType: formState.anchorType,
    colorKey: formState.colorKey,
    description: normalizeOptionalText(formState.description),
    endDateLocal: formState.endDateLocal,
    intervalValue: requiresIntervalValue(formState.recurrenceType)
      ? parseIntervalValue(formState.intervalValue)
      : null,
    isArchived: false,
    notificationsEnabled: formState.notificationsEnabled,
    recurrenceType: formState.recurrenceType,
    reminderTimeLocal: formState.reminderTimeLocal.trim(),
    startDateLocal: formState.startDateLocal.trim(),
    timezone,
    title: formState.title.trim(),
    weekdayMask: requiresWeekdayMask(formState.recurrenceType)
      ? [...formState.weekdayMask].sort((left, right) => left - right)
      : null,
  };
}

export function toFormState(item: RecurringItem): RecurringItemFormValues {
  const schedule = getCurrentScheduleVersion(item);

  return {
    anchorType: getNormalizedAnchorType(
      schedule.anchorType,
      schedule.recurrenceType
    ),
    colorKey: item.colorKey,
    description: item.description ?? "",
    endDateLocal: schedule.endDateLocal ?? null,
    intervalValue: schedule.intervalValue ? `${schedule.intervalValue}` : "",
    notificationsEnabled: schedule.notificationsEnabled,
    recurrenceType: schedule.recurrenceType,
    reminderTimeLocal: schedule.reminderTimeLocal,
    startDateLocal: item.startDateLocal,
    title: item.title,
    weekdayMask: schedule.weekdayMask ?? [],
  };
}

export function getCustomRecurrenceUnit(
  recurrenceType: RecurrenceType
): CustomRecurrenceUnit | null {
  switch (recurrenceType) {
    case "interval_days":
      return "days";
    case "interval_weeks":
      return "weeks";
    case "interval_months":
      return "months";
    default:
      return null;
  }
}

export function getCustomRecurrenceType(
  unit: CustomRecurrenceUnit
): RecurrenceType {
  switch (unit) {
    case "days":
      return "interval_days";
    case "weeks":
      return "interval_weeks";
    case "months":
      return "interval_months";
  }
}

function getNormalizedAnchorType(
  anchorType: AnchorType,
  recurrenceType: RecurrenceType
): AnchorType {
  if (recurrenceType === "once") {
    return "fixed";
  }

  if (
    anchorType === "completion_based" &&
    !supportsCompletionBased(recurrenceType)
  ) {
    return "fixed";
  }

  return anchorType;
}
