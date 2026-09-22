import { format } from "date-fns/format";
import { z } from "zod/v4";

import type { AppLanguage } from "~/i18n/language";
import { colorHexPattern, defaultColorHex } from "~/schedule/display/color";
import {
  anchorTypes,
  recurrenceTypes,
  requiresInterval,
  requiresWeekdays,
  supportsCompletion,
} from "~/schedule/rules/recurrence";
import {
  validateInput,
  type ValidationIssueCode,
} from "~/schedule/rules/validate";
import {
  type CreateScheduleInput,
  currentRule,
  type Schedule,
} from "~/schedule/schedule";

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

const errorMessages = {
  en: {
    anchor_type_not_allowed:
      "Completion-based scheduling is not available for this repeat setting.",
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
    start_date_invalid: "Choose the start date again.",
    title_missing: "Enter a title.",
    weekday_mask_invalid: "Choose repeat weekdays again.",
    weekday_mask_missing: "Choose repeat weekdays.",
    weekday_mask_not_allowed: "Choose the repeat setting again.",
  },
  ko: {
    anchor_type_not_allowed: "완료일 기준은 이 반복 설정에서 사용할 수 없어요.",
    end_date_before_minimum_date: "종료일은 오늘 이후로 선택해 주세요.",
    end_date_before_start_date: "종료일은 시작일 이후로 선택해 주세요.",
    end_date_invalid: "종료일을 다시 선택해 주세요.",
    end_date_not_allowed: "한 번 일정은 종료일을 사용할 수 없어요.",
    end_date_without_occurrence: "선택한 기간 안에 알림일이 없어요.",
    interval_value_invalid: "반복 간격은 1 이상이어야 해요.",
    interval_value_missing: "반복 간격을 입력해 주세요.",
    interval_value_not_allowed: "반복 설정을 다시 선택해 주세요.",
    reminder_time_invalid: "알림 시간을 선택해 주세요.",
    start_date_invalid: "시작일을 다시 선택해 주세요.",
    title_missing: "제목을 입력해 주세요.",
    weekday_mask_invalid: "반복할 요일을 다시 선택해 주세요.",
    weekday_mask_missing: "반복할 요일을 선택해 주세요.",
    weekday_mask_not_allowed: "반복 설정을 다시 선택해 주세요.",
  },
} as const satisfies Record<AppLanguage, Record<ValidationIssueCode, string>>;

export function createFormSchema({
  isEdit,
  language,
  today,
}: {
  isEdit: boolean;
  language: AppLanguage;
  today: string;
}) {
  return formShape.superRefine((values, context) => {
    const issues = validateInput(toScheduleInput(values), {
      minimumEndDateLocal: isEdit ? today : undefined,
    });

    for (const issue of issues) {
      context.addIssue({
        code: "custom",
        message: errorMessages[language][issue.code],
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
