import {
  completionBasedRecurrenceTypes,
  type RecurrenceType,
  recurrenceTypes,
  type RecurringItemDraft,
} from "~/features/recurring/domain/types";

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

type ValidationIssueCode =
  | "anchor_type_not_allowed"
  | "interval_value_missing"
  | "interval_value_not_allowed"
  | "interval_value_invalid"
  | "reminder_time_invalid"
  | "reminder_time_missing"
  | "start_date_invalid"
  | "timezone_missing"
  | "title_missing"
  | "weekday_mask_invalid"
  | "weekday_mask_missing"
  | "weekday_mask_not_allowed";

export type ValidationIssue = {
  code: ValidationIssueCode;
  field: keyof RecurringItemDraft;
  message: string;
};

function requiresIntervalValue(recurrenceType: RecurrenceType): boolean {
  return (
    recurrenceType === "interval_days" ||
    recurrenceType === "interval_weeks" ||
    recurrenceType === "interval_months"
  );
}

function requiresWeekdayMask(recurrenceType: RecurrenceType): boolean {
  return recurrenceType === "weekly" || recurrenceType === "interval_weeks";
}

function supportsCompletionBased(recurrenceType: RecurrenceType): boolean {
  return completionBasedRecurrenceTypes.includes(
    recurrenceType as (typeof completionBasedRecurrenceTypes)[number]
  );
}

function hasValidWeekdayMask(
  weekdayMask: number[] | null | undefined
): boolean {
  if (!weekdayMask || weekdayMask.length === 0) {
    return false;
  }

  const uniqueDays = new Set(weekdayMask);

  return (
    uniqueDays.size === weekdayMask.length &&
    weekdayMask.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

export function validateRecurringItemDraft(
  draft: RecurringItemDraft
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (draft.title.trim().length === 0) {
    issues.push({
      code: "title_missing",
      field: "title",
      message: "제목은 필수입니다.",
    });
  }

  if (!localDatePattern.test(draft.startDateLocal)) {
    issues.push({
      code: "start_date_invalid",
      field: "startDateLocal",
      message: "시작일은 YYYY-MM-DD 형식이어야 합니다.",
    });
  }

  if (draft.reminderTimeLocal.trim().length === 0) {
    issues.push({
      code: "reminder_time_missing",
      field: "reminderTimeLocal",
      message: "알림 시간은 필수입니다.",
    });
  } else if (!localTimePattern.test(draft.reminderTimeLocal)) {
    issues.push({
      code: "reminder_time_invalid",
      field: "reminderTimeLocal",
      message: "알림 시간은 HH:mm 형식이어야 합니다.",
    });
  }

  if (draft.timezone.trim().length === 0) {
    issues.push({
      code: "timezone_missing",
      field: "timezone",
      message: "시간대는 필수입니다.",
    });
  }

  if (!recurrenceTypes.includes(draft.recurrenceType)) {
    issues.push({
      code: "interval_value_not_allowed",
      field: "recurrenceType",
      message: "지원하지 않는 반복 규칙입니다.",
    });

    return issues;
  }

  if (requiresIntervalValue(draft.recurrenceType)) {
    if (draft.intervalValue == null) {
      issues.push({
        code: "interval_value_missing",
        field: "intervalValue",
        message: "이 반복 규칙에는 intervalValue가 필요합니다.",
      });
    } else if (
      !Number.isInteger(draft.intervalValue) ||
      draft.intervalValue < 1
    ) {
      issues.push({
        code: "interval_value_invalid",
        field: "intervalValue",
        message: "intervalValue는 1 이상의 정수여야 합니다.",
      });
    }
  } else if (draft.intervalValue != null) {
    issues.push({
      code: "interval_value_not_allowed",
      field: "intervalValue",
      message: "이 반복 규칙에는 intervalValue를 넣지 않습니다.",
    });
  }

  if (requiresWeekdayMask(draft.recurrenceType)) {
    if (!draft.weekdayMask || draft.weekdayMask.length === 0) {
      issues.push({
        code: "weekday_mask_missing",
        field: "weekdayMask",
        message: "이 반복 규칙에는 weekdayMask가 필요합니다.",
      });
    } else if (!hasValidWeekdayMask(draft.weekdayMask)) {
      issues.push({
        code: "weekday_mask_invalid",
        field: "weekdayMask",
        message: "weekdayMask는 0~6 범위의 중복 없는 요일 목록이어야 합니다.",
      });
    }
  } else if (draft.weekdayMask != null && draft.weekdayMask.length > 0) {
    issues.push({
      code: "weekday_mask_not_allowed",
      field: "weekdayMask",
      message: "이 반복 규칙에는 weekdayMask를 넣지 않습니다.",
    });
  }

  if (
    draft.anchorType === "completion_based" &&
    !supportsCompletionBased(draft.recurrenceType)
  ) {
    issues.push({
      code: "anchor_type_not_allowed",
      field: "anchorType",
      message:
        "completion_based는 once, daily, interval_days, monthly, interval_months, yearly에서만 사용할 수 있습니다.",
    });
  }

  return issues;
}

export function isRecurringItemDraftValid(draft: RecurringItemDraft): boolean {
  return validateRecurringItemDraft(draft).length === 0;
}
