import { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parse,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { z } from "zod/v4";

import {
  type AnchorType,
  anchorTypes,
  completionBasedRecurrenceTypes,
  defaultRecurringItemColorKey,
  type RecurrenceType,
  recurrenceTypes,
  type RecurringItem,
  type RecurringItemDraft,
} from "~/features/recurring/domain/types";

export type CustomRecurrenceUnit = "days" | "weeks" | "months";
export type PickerMode = "date" | "time";
export type PickerChangeHandler = (
  event: DateTimePickerEvent,
  selectedDate?: Date
) => void;
export type RecurrenceSectionState = {
  customUnit: CustomRecurrenceUnit | null;
  isCustomSelected: boolean;
  isOnceSelected: boolean;
  showsStandaloneWeekdaySelector: boolean;
  showsCustomRecurrencePanel: boolean;
  showsWeekdaySelector: boolean;
  showsWeekdaysInsideCustomPanel: boolean;
};

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_FIRST_REMINDER_LOOKAHEAD_DAYS = 3710;
const FORM_ERROR_MESSAGES = {
  completionBasedNotAllowed: "완료일 기준은 이 반복 설정에서 사용할 수 없어요.",
  intervalInvalid: "반복 간격은 1 이상이어야 해요.",
  intervalMissing: "반복 간격을 입력해 주세요.",
  recurrenceInvalid: "반복 설정을 다시 선택해 주세요.",
  reminderTimeInvalid: "알림 시간을 선택해 주세요.",
  startDateInvalid: "시작일을 다시 선택해 주세요.",
  titleMissing: "제목을 입력해 주세요.",
  weekdayInvalid: "반복할 요일을 다시 선택해 주세요.",
  weekdayMissing: "반복할 요일을 선택해 주세요.",
} as const;

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

export function getTodayLocalDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function parseLocalDateToDate(localDate: string): Date {
  return parse(localDate, "yyyy-MM-dd", new Date());
}

export function formatDateToLocalDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getCurrentLocalTime(): string {
  return format(new Date(), "HH:mm");
}

export function parseLocalTimeToDate(localTime: string): Date {
  return parse(localTime, "HH:mm", new Date());
}

export function formatDateToLocalTime(date: Date): string {
  return format(date, "HH:mm");
}

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
  intervalValue: string;
  reminderTimeLocal: string;
  recurrenceType: RecurrenceType;
  startDateLocal: string;
  weekdayMask: number[];
}): {
  firstReminderHelperText: string | null;
  reminderTimeDisplayValue: string;
  startDateDisplayValue: string;
} {
  return {
    firstReminderHelperText: getFirstReminderHelperText(formState),
    reminderTimeDisplayValue: formatLocalTimeForDisplay(
      formState.reminderTimeLocal
    ),
    startDateDisplayValue: formatLocalDateForDisplay(formState.startDateLocal),
  };
}

export function createDefaultFormState(): RecurringItemFormValues {
  return {
    anchorType: "fixed",
    category: "",
    description: "",
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

export function normalizeStartDateSelection(
  nextValue: string,
  minimumStartDateLocal: string
): string {
  return nextValue < minimumStartDateLocal ? minimumStartDateLocal : nextValue;
}

function hasValidWeekdayMask(weekdayMask: number[]): boolean {
  if (weekdayMask.length === 0) {
    return false;
  }

  const uniqueDays = new Set(weekdayMask);

  return (
    uniqueDays.size === weekdayMask.length &&
    weekdayMask.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

export const recurringItemFormSchema = z
  .object({
    anchorType: z.enum(anchorTypes),
    category: z.string(),
    description: z.string(),
    intervalValue: z.string(),
    notificationsEnabled: z.boolean(),
    recurrenceType: z.enum(recurrenceTypes),
    reminderTimeLocal: z
      .string()
      .trim()
      .regex(localTimePattern, FORM_ERROR_MESSAGES.reminderTimeInvalid),
    startDateLocal: z
      .string()
      .regex(localDatePattern, FORM_ERROR_MESSAGES.startDateInvalid),
    title: z.string().trim().min(1, FORM_ERROR_MESSAGES.titleMissing),
    weekdayMask: z.array(z.number()),
  })
  .superRefine((formState, context) => {
    if (requiresIntervalValue(formState.recurrenceType)) {
      const parsedIntervalValue = Number.parseInt(formState.intervalValue, 10);

      if (formState.intervalValue.trim().length === 0) {
        context.addIssue({
          code: "custom",
          message: FORM_ERROR_MESSAGES.intervalMissing,
          path: ["intervalValue"],
        });
      } else if (
        !Number.isInteger(parsedIntervalValue) ||
        parsedIntervalValue < 1
      ) {
        context.addIssue({
          code: "custom",
          message: FORM_ERROR_MESSAGES.intervalInvalid,
          path: ["intervalValue"],
        });
      }
    } else if (formState.intervalValue.trim().length > 0) {
      context.addIssue({
        code: "custom",
        message: FORM_ERROR_MESSAGES.recurrenceInvalid,
        path: ["intervalValue"],
      });
    }

    if (requiresWeekdayMask(formState.recurrenceType)) {
      if (formState.weekdayMask.length === 0) {
        context.addIssue({
          code: "custom",
          message: FORM_ERROR_MESSAGES.weekdayMissing,
          path: ["weekdayMask"],
        });
      } else if (!hasValidWeekdayMask(formState.weekdayMask)) {
        context.addIssue({
          code: "custom",
          message: FORM_ERROR_MESSAGES.weekdayInvalid,
          path: ["weekdayMask"],
        });
      }
    } else if (formState.weekdayMask.length > 0) {
      context.addIssue({
        code: "custom",
        message: FORM_ERROR_MESSAGES.recurrenceInvalid,
        path: ["weekdayMask"],
      });
    }

    if (
      formState.anchorType === "completion_based" &&
      !supportsCompletionBased(formState.recurrenceType)
    ) {
      context.addIssue({
        code: "custom",
        message: FORM_ERROR_MESSAGES.completionBasedNotAllowed,
        path: ["anchorType"],
      });
    }
  });

export type RecurringItemFormValues = z.infer<typeof recurringItemFormSchema>;

export function requiresIntervalValue(recurrenceType: RecurrenceType): boolean {
  return (
    recurrenceType === "interval_days" ||
    recurrenceType === "interval_weeks" ||
    recurrenceType === "interval_months"
  );
}

export function requiresWeekdayMask(recurrenceType: RecurrenceType): boolean {
  return recurrenceType === "weekly" || recurrenceType === "interval_weeks";
}

export function supportsCompletionBased(
  recurrenceType: RecurrenceType
): boolean {
  return completionBasedRecurrenceTypes.includes(
    recurrenceType as (typeof completionBasedRecurrenceTypes)[number]
  );
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
      ? Number.parseInt(formState.intervalValue, 10)
      : 1;
  const weekInterval =
    Number.isInteger(intervalValue) && intervalValue > 0 ? intervalValue : 1;
  const selectedWeekdaySet = new Set(formState.weekdayMask);
  const startDate = parseLocalDateToDate(formState.startDateLocal);
  const startWeek = startOfWeek(startDate, { weekStartsOn: 0 });
  let cursor = startDate;
  let dayOffset = 0;

  while (dayOffset <= MAX_FIRST_REMINDER_LOOKAHEAD_DAYS) {
    const cursorWeek = startOfWeek(cursor, { weekStartsOn: 0 });
    const weeksFromStart = differenceInCalendarDays(cursorWeek, startWeek) / 7;
    const matchesWeekInterval =
      formState.recurrenceType === "weekly" ||
      weeksFromStart % weekInterval === 0;

    if (selectedWeekdaySet.has(cursor.getDay()) && matchesWeekInterval) {
      return formatDateToLocalDate(cursor);
    }

    cursor = addDays(cursor, 1);
    dayOffset += 1;
  }

  return null;
}

export function getIosPickerChangeHandler(
  pickerMode: PickerMode | null,
  handlers: {
    onDateChange: PickerChangeHandler;
    onTimeChange: PickerChangeHandler;
  }
): PickerChangeHandler {
  return pickerMode === "date" ? handlers.onDateChange : handlers.onTimeChange;
}

export function getWeekdayMaskFromDate(dateText: string): number[] {
  const date = new Date(`${dateText}T00:00:00`);

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
    startDateLocal: nextValue,
    weekdayMask:
      requiresWeekdayMask(current.recurrenceType) &&
      current.weekdayMask.length === 0
        ? getWeekdayMaskFromDate(nextValue)
        : current.weekdayMask,
  };
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
    intervalValue: requiresIntervalValue(nextRecurrenceType)
      ? current.intervalValue || "1"
      : "",
    recurrenceType: nextRecurrenceType,
    weekdayMask: nextWeekdayMask,
  };
}

export function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function toDraft(
  formState: RecurringItemFormValues,
  timezone: string
): RecurringItemDraft {
  return {
    anchorType: getNormalizedAnchorType(
      formState.anchorType,
      formState.recurrenceType
    ),
    category: normalizeOptionalText(formState.category),
    colorKey: defaultRecurringItemColorKey,
    description: normalizeOptionalText(formState.description),
    intervalValue: requiresIntervalValue(formState.recurrenceType)
      ? Number.parseInt(formState.intervalValue, 10)
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
  return {
    anchorType: getNormalizedAnchorType(item.anchorType, item.recurrenceType),
    category: item.category ?? "",
    description: item.description ?? "",
    intervalValue: item.intervalValue ? `${item.intervalValue}` : "",
    notificationsEnabled: item.notificationsEnabled,
    recurrenceType: item.recurrenceType,
    reminderTimeLocal: item.reminderTimeLocal,
    startDateLocal: item.startDateLocal,
    title: item.title,
    weekdayMask: item.weekdayMask ?? [],
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

export function isCustomRecurrenceType(
  recurrenceType: RecurrenceType
): boolean {
  return getCustomRecurrenceUnit(recurrenceType) !== null;
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
