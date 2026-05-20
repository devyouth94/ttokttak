import { format, parse } from "date-fns";
import { z } from "zod/v4";

import {
  hasOccurrenceBetweenLocalDates,
  hasValidWeekdayMask,
  localDatePattern,
  localTimePattern,
  requiresIntervalValue,
  requiresWeekdayMask,
  supportsCompletionBased,
} from "~/entities/schedule";
import {
  type AnchorType,
  anchorTypes,
  defaultRecurringItemColorKey,
  type RecurrenceType,
  recurrenceTypes,
  type RecurringItem,
  recurringItemColorKeys,
  type RecurringItemDraft,
} from "~/entities/schedule";

export type CustomRecurrenceUnit = "days" | "weeks" | "months";
export type DatePickerTarget = "endDate" | "startDate";
export type PickerMode = "date" | "time";

const positiveIntegerPattern = /^[1-9]\d*$/;
const FORM_ERROR_MESSAGES = {
  completionBasedNotAllowed: "완료일 기준은 이 반복 설정에서 사용할 수 없어요.",
  endDateBeforeStartDate: "종료일은 시작일 이후로 선택해 주세요.",
  endDateBeforeToday: "종료일은 오늘 이후로 선택해 주세요.",
  endDateInvalid: "종료일을 다시 선택해 주세요.",
  endDateNotAllowed: "한 번 일정은 종료일을 사용할 수 없어요.",
  endDateWithoutOccurrence: "선택한 기간 안에 알림일이 없어요.",
  intervalInvalid: "반복 간격은 1 이상이어야 해요.",
  intervalMissing: "반복 간격을 입력해 주세요.",
  recurrenceInvalid: "반복 설정을 다시 선택해 주세요.",
  reminderTimeInvalid: "알림 시간을 선택해 주세요.",
  startDateInvalid: "시작일을 다시 선택해 주세요.",
  titleMissing: "제목을 입력해 주세요.",
  weekdayInvalid: "반복할 요일을 다시 선택해 주세요.",
  weekdayMissing: "반복할 요일을 선택해 주세요.",
} as const;

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

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();

  if (!positiveIntegerPattern.test(trimmed)) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
}

export function createRecurringItemFormSchema(params: {
  isEditMode: boolean;
  todayLocalDate: string;
}) {
  return z
    .object({
      anchorType: z.enum(anchorTypes),
      colorKey: z.enum(recurringItemColorKeys),
      description: z.string(),
      endDateLocal: z
        .string()
        .regex(localDatePattern, FORM_ERROR_MESSAGES.endDateInvalid)
        .nullable(),
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
        const parsedIntervalValue = parsePositiveInteger(
          formState.intervalValue
        );

        if (formState.intervalValue.trim().length === 0) {
          context.addIssue({
            code: "custom",
            message: FORM_ERROR_MESSAGES.intervalMissing,
            path: ["intervalValue"],
          });
        } else if (parsedIntervalValue === null) {
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

      if (formState.endDateLocal == null) {
        return;
      }

      if (!localDatePattern.test(formState.endDateLocal)) {
        return;
      }

      if (formState.recurrenceType === "once") {
        context.addIssue({
          code: "custom",
          message: FORM_ERROR_MESSAGES.endDateNotAllowed,
          path: ["endDateLocal"],
        });
        return;
      }

      if (
        localDatePattern.test(formState.startDateLocal) &&
        formState.endDateLocal < formState.startDateLocal
      ) {
        context.addIssue({
          code: "custom",
          message: FORM_ERROR_MESSAGES.endDateBeforeStartDate,
          path: ["endDateLocal"],
        });
        return;
      }

      if (params.isEditMode && formState.endDateLocal < params.todayLocalDate) {
        context.addIssue({
          code: "custom",
          message: FORM_ERROR_MESSAGES.endDateBeforeToday,
          path: ["endDateLocal"],
        });
        return;
      }

      const parsedIntervalValue = requiresIntervalValue(
        formState.recurrenceType
      )
        ? parsePositiveInteger(formState.intervalValue)
        : null;
      const canCheckOccurrence =
        localDatePattern.test(formState.startDateLocal) &&
        (!requiresIntervalValue(formState.recurrenceType) ||
          parsedIntervalValue != null) &&
        (!requiresWeekdayMask(formState.recurrenceType) ||
          hasValidWeekdayMask(formState.weekdayMask));

      if (
        canCheckOccurrence &&
        !hasOccurrenceBetweenLocalDates({
          endDateLocal: formState.endDateLocal,
          intervalValue: parsedIntervalValue,
          recurrenceType: formState.recurrenceType,
          startDateLocal: formState.startDateLocal,
          weekdayMask: formState.weekdayMask,
        })
      ) {
        context.addIssue({
          code: "custom",
          message: FORM_ERROR_MESSAGES.endDateWithoutOccurrence,
          path: ["endDateLocal"],
        });
      }
    });
}

export const recurringItemFormSchema = createRecurringItemFormSchema({
  isEditMode: false,
  todayLocalDate: getTodayLocalDate(),
});

export type RecurringItemFormValues = z.infer<typeof recurringItemFormSchema>;

export function getWeekdayMaskFromDate(dateText: string): number[] {
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
    colorKey: formState.colorKey,
    description: normalizeOptionalText(formState.description),
    endDateLocal: formState.endDateLocal,
    intervalValue: requiresIntervalValue(formState.recurrenceType)
      ? parsePositiveInteger(formState.intervalValue)
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
    colorKey: item.colorKey,
    description: item.description ?? "",
    endDateLocal: item.endDateLocal ?? null,
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
