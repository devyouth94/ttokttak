import {
  firstDate,
  requiresInterval,
  requiresWeekdays,
  supportsCompletion,
} from "./recurrence";
import type { CreateScheduleInput } from "../schedule";

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type ValidationIssueCode =
  | "anchor_type_not_allowed"
  | "end_date_before_minimum_date"
  | "end_date_before_start_date"
  | "end_date_invalid"
  | "end_date_not_allowed"
  | "end_date_without_occurrence"
  | "interval_value_missing"
  | "interval_value_not_allowed"
  | "interval_value_invalid"
  | "reminder_time_invalid"
  | "start_date_invalid"
  | "title_missing"
  | "weekday_mask_invalid"
  | "weekday_mask_missing"
  | "weekday_mask_not_allowed";

type ValidationIssue = {
  code: ValidationIssueCode;
  field: keyof CreateScheduleInput;
  message: string;
};

type ValidationOptions = {
  minimumEndDateLocal?: string;
};

/** 일정 입력이 반복 규칙과 날짜 제약을 만족하는지 확인한다. */
export function validateInput(
  input: CreateScheduleInput,
  options: ValidationOptions = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (input.title.trim().length === 0) {
    issues.push({
      code: "title_missing",
      field: "title",
      message: "제목은 필수입니다.",
    });
  }

  if (!localDatePattern.test(input.startDateLocal)) {
    issues.push({
      code: "start_date_invalid",
      field: "startDateLocal",
      message: "시작일은 YYYY-MM-DD 형식이어야 합니다.",
    });
  }

  if (input.endDateLocal != null) {
    if (!localDatePattern.test(input.endDateLocal)) {
      issues.push({
        code: "end_date_invalid",
        field: "endDateLocal",
        message: "종료일은 YYYY-MM-DD 형식이어야 합니다.",
      });
    } else if (input.recurrenceType === "once") {
      issues.push({
        code: "end_date_not_allowed",
        field: "endDateLocal",
        message: "한 번 일정은 종료일을 가질 수 없습니다.",
      });
    } else if (
      localDatePattern.test(input.startDateLocal) &&
      input.endDateLocal < input.startDateLocal
    ) {
      issues.push({
        code: "end_date_before_start_date",
        field: "endDateLocal",
        message: "종료일은 시작일보다 빠를 수 없습니다.",
      });
    } else if (
      options.minimumEndDateLocal != null &&
      localDatePattern.test(options.minimumEndDateLocal) &&
      input.endDateLocal < options.minimumEndDateLocal
    ) {
      issues.push({
        code: "end_date_before_minimum_date",
        field: "endDateLocal",
        message: "종료일은 수정하는 날보다 빠를 수 없습니다.",
      });
    }
  }

  if (!localTimePattern.test(input.reminderTimeLocal)) {
    issues.push({
      code: "reminder_time_invalid",
      field: "reminderTimeLocal",
      message: "알림 시간은 HH:mm 형식이어야 합니다.",
    });
  }

  if (requiresInterval(input.recurrenceType)) {
    if (input.intervalValue == null) {
      issues.push({
        code: "interval_value_missing",
        field: "intervalValue",
        message: "이 반복 규칙에는 intervalValue가 필요합니다.",
      });
    } else if (!hasValidInterval(input.intervalValue)) {
      issues.push({
        code: "interval_value_invalid",
        field: "intervalValue",
        message: "intervalValue는 1 이상의 정수여야 합니다.",
      });
    }
  } else if (input.intervalValue != null) {
    issues.push({
      code: "interval_value_not_allowed",
      field: "intervalValue",
      message: "이 반복 규칙에는 intervalValue를 넣지 않습니다.",
    });
  }

  if (requiresWeekdays(input.recurrenceType)) {
    if (!input.weekdayMask || input.weekdayMask.length === 0) {
      issues.push({
        code: "weekday_mask_missing",
        field: "weekdayMask",
        message: "이 반복 규칙에는 weekdayMask가 필요합니다.",
      });
    } else if (!hasValidWeekdays(input.weekdayMask)) {
      issues.push({
        code: "weekday_mask_invalid",
        field: "weekdayMask",
        message: "weekdayMask는 0~6 범위의 중복 없는 요일 목록이어야 합니다.",
      });
    }
  } else if (input.weekdayMask != null && input.weekdayMask.length > 0) {
    issues.push({
      code: "weekday_mask_not_allowed",
      field: "weekdayMask",
      message: "이 반복 규칙에는 weekdayMask를 넣지 않습니다.",
    });
  }

  if (
    input.anchorType === "completion_based" &&
    !supportsCompletion(input.recurrenceType)
  ) {
    issues.push({
      code: "anchor_type_not_allowed",
      field: "anchorType",
      message:
        "completion_based는 daily, interval_days, monthly, interval_months에서만 사용할 수 있습니다.",
    });
  }

  const firstOccurrenceLocalDate =
    input.endDateLocal != null &&
    localDatePattern.test(input.startDateLocal) &&
    localDatePattern.test(input.endDateLocal) &&
    input.recurrenceType !== "once" &&
    (!requiresInterval(input.recurrenceType) ||
      hasValidInterval(input.intervalValue)) &&
    (!requiresWeekdays(input.recurrenceType) ||
      hasValidWeekdays(input.weekdayMask))
      ? firstDate({
          endDateLocal: input.endDateLocal,
          intervalValue: input.intervalValue,
          recurrenceType: input.recurrenceType,
          startDateLocal: input.startDateLocal,
          weekdayMask: input.weekdayMask,
        })
      : null;

  if (
    input.endDateLocal != null &&
    firstOccurrenceLocalDate != null &&
    firstOccurrenceLocalDate > input.endDateLocal
  ) {
    issues.push({
      code: "end_date_without_occurrence",
      field: "endDateLocal",
      message: "시작일과 종료일 사이에 occurrence가 없습니다.",
    });
  }

  return issues;
}

/** 잘못된 일정 입력이면 검증 메시지를 모아 오류로 던진다. */
export function assertInput(
  input: CreateScheduleInput,
  options: ValidationOptions = {}
): void {
  const issues = validateInput(input, options);

  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.message).join(" "));
  }
}

function hasValidWeekdays(weekdays: number[] | null): boolean {
  if (!weekdays || weekdays.length === 0) {
    return false;
  }

  return (
    new Set(weekdays).size === weekdays.length &&
    weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

function hasValidInterval(interval: number | null): boolean {
  return Number.isInteger(interval) && interval != null && interval >= 1;
}
