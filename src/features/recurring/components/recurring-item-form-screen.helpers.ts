import { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { z } from "zod/v4";

import {
  type AnchorType,
  anchorTypes,
  completionBasedRecurrenceTypes,
  type RecurrenceType,
  recurrenceTypes,
  type RecurringItem,
  type RecurringItemDraft,
} from "~/features/recurring/domain/types";

export type CustomRecurrenceUnit = "days" | "weeks" | "months";
export type PickerMode = "date" | "time";
export type AnchorOption = {
  label: string;
  value: AnchorType;
};
export type PickerChangeHandler = (
  event: DateTimePickerEvent,
  selectedDate?: Date
) => void;
export type RecurrenceSectionState = {
  customRecurrenceDescription: string;
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
  { label: "매년", value: "yearly" },
];

export const customRecurrenceUnitOptions: {
  label: string;
  value: CustomRecurrenceUnit;
}[] = [
  { label: "일", value: "days" },
  { label: "주", value: "weeks" },
  { label: "달", value: "months" },
];

export const anchorOptions: AnchorOption[] = [
  {
    label: "시작일 기준",
    value: "fixed",
  },
  {
    label: "완료일 기준",
    value: "completion_based",
  },
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
  return isEditMode ? "리마인더 수정" : "리마인더 추가";
}

export function getRecurringItemFormDisplayValues(formState: {
  reminderTimeLocal: string;
  startDateLocal: string;
}): {
  reminderTimeDisplayValue: string;
  startDateDisplayValue: string;
} {
  return {
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
    recurrenceType: "once",
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
      .min(1, "알림 시간은 필수입니다.")
      .regex(localTimePattern, "알림 시간은 HH:mm 형식이어야 합니다."),
    startDateLocal: z
      .string()
      .regex(localDatePattern, "시작일은 YYYY-MM-DD 형식이어야 합니다."),
    title: z.string().trim().min(1, "제목은 필수입니다."),
    weekdayMask: z.array(z.number().int().min(0).max(6)),
  })
  .superRefine((formState, context) => {
    if (requiresIntervalValue(formState.recurrenceType)) {
      const parsedIntervalValue = Number.parseInt(formState.intervalValue, 10);

      if (formState.intervalValue.trim().length === 0) {
        context.addIssue({
          code: "custom",
          message: "이 반복 규칙에는 intervalValue가 필요합니다.",
          path: ["intervalValue"],
        });
      } else if (
        !Number.isInteger(parsedIntervalValue) ||
        parsedIntervalValue < 1
      ) {
        context.addIssue({
          code: "custom",
          message: "intervalValue는 1 이상의 정수여야 합니다.",
          path: ["intervalValue"],
        });
      }
    } else if (formState.intervalValue.trim().length > 0) {
      context.addIssue({
        code: "custom",
        message: "이 반복 규칙에는 intervalValue를 넣지 않습니다.",
        path: ["intervalValue"],
      });
    }

    if (requiresWeekdayMask(formState.recurrenceType)) {
      if (formState.weekdayMask.length === 0) {
        context.addIssue({
          code: "custom",
          message: "이 반복 규칙에는 weekdayMask가 필요합니다.",
          path: ["weekdayMask"],
        });
      } else if (!hasValidWeekdayMask(formState.weekdayMask)) {
        context.addIssue({
          code: "custom",
          message: "weekdayMask는 0~6 범위의 중복 없는 요일 목록이어야 합니다.",
          path: ["weekdayMask"],
        });
      }
    } else if (formState.weekdayMask.length > 0) {
      context.addIssue({
        code: "custom",
        message: "이 반복 규칙에는 weekdayMask를 넣지 않습니다.",
        path: ["weekdayMask"],
      });
    }

    if (
      formState.anchorType === "completion_based" &&
      !supportsCompletionBased(formState.recurrenceType)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "completion_based는 once, daily, interval_days, monthly, interval_months, yearly에서만 사용할 수 있습니다.",
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

export function getCompletionBasedEnabled(
  recurrenceType: RecurrenceType
): boolean {
  return supportsCompletionBased(recurrenceType);
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

export function getCustomRecurrenceDescription(
  unit: CustomRecurrenceUnit | null
): string {
  switch (unit) {
    case "weeks":
      return "선택한 요일을 주 단위 간격으로 반복합니다.";
    case "months":
      return "지정한 달 간격으로 반복됩니다.";
    case "days":
    default:
      return "지정한 일 간격으로 반복됩니다.";
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
    customRecurrenceDescription: getCustomRecurrenceDescription(customUnit),
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

export function getAnchorTypeDescription(
  anchorType: "fixed" | "completion_based"
): string {
  if (anchorType === "fixed") {
    return "처음 정한 시작일을 유지하면서 다음 일정을 계산합니다.";
  }

  return "완료한 날짜를 반영해서 다음 일정을 다시 계산합니다.";
}

export function getNotificationStatusText(enabled: boolean): string {
  return enabled ? "사용" : "중지";
}

export function getAdvancedOptionsState(params: {
  anchorType: AnchorType;
  completionBasedEnabled: boolean;
  recurrenceType: RecurrenceType;
}): {
  anchorDescription: string;
  showsAnchorOptions: boolean;
  showsCompletionBasedOption: boolean;
  showsCompletionBasedHelper: boolean;
} {
  const showsAnchorOptions = params.recurrenceType !== "once";
  const showsCompletionBasedOption =
    showsAnchorOptions && supportsCompletionBased(params.recurrenceType);

  return {
    anchorDescription: getAnchorTypeDescription(params.anchorType),
    showsAnchorOptions,
    showsCompletionBasedHelper: false,
    showsCompletionBasedOption,
  };
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
