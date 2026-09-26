import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import type { TFunction } from "i18next";
import { z } from "zod/v4";

import { colorHexPattern, defaultColorHex } from "~/schedule/color";
import {
  anchorTypes,
  type CreateScheduleInput,
  currentRule,
  type RecurrenceType,
  recurrenceTypes,
  type Schedule,
} from "~/schedule/model";
import {
  firstDate,
  requiresInterval,
  requiresWeekdays,
  supportsCompletion,
} from "~/schedule/rules/recurrence";
import {
  validateInput,
  type ValidationIssueCode,
} from "~/schedule/rules/validate";

const formShape = z.object({
  anchorType: z.enum(anchorTypes),
  colorHex: z.string().regex(colorHexPattern),
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

export type ScheduleFormValues = z.infer<typeof formShape>;

const validationMessageKeys = {
  anchor_type_not_allowed: "scheduleForm.validation.anchorTypeNotAllowed",
  end_date_before_minimum_date:
    "scheduleForm.validation.endDateBeforeMinimumDate",
  end_date_before_start_date: "scheduleForm.validation.endDateBeforeStartDate",
  end_date_invalid: "scheduleForm.validation.endDateInvalid",
  end_date_not_allowed: "scheduleForm.validation.endDateNotAllowed",
  end_date_without_occurrence:
    "scheduleForm.validation.endDateWithoutOccurrence",
  interval_value_invalid: "scheduleForm.validation.intervalValueInvalid",
  interval_value_missing: "scheduleForm.validation.intervalValueMissing",
  interval_value_not_allowed: "scheduleForm.validation.intervalValueNotAllowed",
  reminder_time_invalid: "scheduleForm.validation.reminderTimeInvalid",
  start_date_invalid: "scheduleForm.validation.startDateInvalid",
  title_missing: "scheduleForm.validation.titleMissing",
  weekday_mask_invalid: "scheduleForm.validation.weekdayMaskInvalid",
  weekday_mask_missing: "scheduleForm.validation.weekdayMaskMissing",
  weekday_mask_not_allowed: "scheduleForm.validation.weekdayMaskNotAllowed",
} as const satisfies Record<ValidationIssueCode, string>;

export function createFormSchema({
  isEdit,
  t,
  today,
}: {
  isEdit: boolean;
  t: TFunction;
  today: string;
}) {
  return formShape.superRefine((values, context) => {
    const issues = validateInput(toScheduleInput(values), {
      minimumEndDateLocal: isEdit ? today : undefined,
    });

    for (const issue of issues) {
      context.addIssue({
        code: "custom",
        message: t(validationMessageKeys[issue.code]),
        path: [issue.field],
      });
    }
  });
}

export function createFormValues(openedAt = new Date()): ScheduleFormValues {
  return {
    anchorType: "fixed",
    colorHex: defaultColorHex,
    description: "",
    endDateLocal: null,
    intervalValue: "",
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: format(openedAt, "HH:mm"),
    startDateLocal: format(openedAt, "yyyy-MM-dd"),
    title: "",
    weekdayMask: [],
  };
}

export function getRecurrenceChange(
  values: ScheduleFormValues,
  recurrenceType: RecurrenceType
): Pick<
  ScheduleFormValues,
  | "anchorType"
  | "endDateLocal"
  | "intervalValue"
  | "recurrenceType"
  | "weekdayMask"
> {
  return {
    anchorType: supportsCompletion(recurrenceType)
      ? values.anchorType
      : "fixed",
    endDateLocal:
      recurrenceType === "once" || values.recurrenceType === "once"
        ? null
        : values.endDateLocal,
    intervalValue: requiresInterval(recurrenceType)
      ? values.intervalValue || "1"
      : "",
    recurrenceType,
    weekdayMask: requiresWeekdays(recurrenceType)
      ? values.weekdayMask.length > 0
        ? values.weekdayMask
        : defaultWeekdayMask(values.startDateLocal)
      : [],
  };
}

export function getStartDateChange(
  values: Pick<
    ScheduleFormValues,
    "endDateLocal" | "recurrenceType" | "weekdayMask"
  >,
  selectedDateLocal: string,
  minimumStartDateLocal: string
): Pick<ScheduleFormValues, "endDateLocal" | "startDateLocal" | "weekdayMask"> {
  const startDateLocal =
    selectedDateLocal < minimumStartDateLocal
      ? minimumStartDateLocal
      : selectedDateLocal;

  return {
    endDateLocal:
      values.endDateLocal != null && values.endDateLocal < startDateLocal
        ? startDateLocal
        : values.endDateLocal,
    startDateLocal,
    weekdayMask:
      requiresWeekdays(values.recurrenceType) && values.weekdayMask.length === 0
        ? defaultWeekdayMask(startDateLocal)
        : values.weekdayMask,
  };
}

export function getFirstReminderDate(
  values: Pick<
    ScheduleFormValues,
    "intervalValue" | "recurrenceType" | "startDateLocal" | "weekdayMask"
  >
): string | null {
  if (
    !requiresWeekdays(values.recurrenceType) ||
    values.weekdayMask.length === 0
  ) {
    return null;
  }

  const intervalValue = values.intervalValue.trim();
  const firstReminder = firstDate({
    intervalValue:
      values.recurrenceType !== "interval_weeks"
        ? 1
        : /^[1-9]\d*$/.test(intervalValue)
          ? Number(intervalValue)
          : null,
    recurrenceType: values.recurrenceType,
    startDateLocal: values.startDateLocal,
    weekdayMask: values.weekdayMask,
  });

  return firstReminder === values.startDateLocal ? null : firstReminder;
}

export function toFormValues(item: Schedule): ScheduleFormValues {
  const rule = currentRule(item);

  return {
    anchorType: supportsCompletion(rule.recurrenceType)
      ? rule.anchorType
      : "fixed",
    colorHex: item.colorHex,
    description: item.description ?? "",
    endDateLocal: rule.endDateLocal ?? null,
    intervalValue: rule.intervalValue ? String(rule.intervalValue) : "",
    notificationsEnabled: rule.notificationsEnabled,
    recurrenceType: rule.recurrenceType,
    reminderTimeLocal: rule.reminderTimeLocal,
    startDateLocal: item.startDateLocal,
    title: item.title,
    weekdayMask: rule.weekdayMask ?? [],
  };
}

export function toScheduleInput(
  values: ScheduleFormValues
): CreateScheduleInput {
  const description = values.description.trim();
  const interval = values.intervalValue.trim();

  return {
    anchorType: values.anchorType,
    colorHex: values.colorHex,
    description: description ? description : null,
    endDateLocal: values.endDateLocal,
    intervalValue: requiresInterval(values.recurrenceType)
      ? interval === ""
        ? null
        : Number(interval)
      : null,
    notificationsEnabled: values.notificationsEnabled,
    recurrenceType: values.recurrenceType,
    reminderTimeLocal: values.reminderTimeLocal.trim(),
    startDateLocal: values.startDateLocal.trim(),
    title: values.title.trim(),
    weekdayMask: requiresWeekdays(values.recurrenceType)
      ? [...values.weekdayMask].sort((left, right) => left - right)
      : null,
  };
}

function defaultWeekdayMask(startDateLocal: string): number[] {
  return [parse(startDateLocal, "yyyy-MM-dd", new Date()).getDay()];
}
