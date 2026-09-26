import { validateInput, type ValidationIssueCode } from "./validate";
import { defaultColorHex } from "../color";
import type { CreateScheduleInput } from "../model";

function input(
  overrides: Partial<CreateScheduleInput> = {}
): CreateScheduleInput {
  return {
    anchorType: "fixed",
    colorHex: defaultColorHex,
    description: null,
    endDateLocal: null,
    intervalValue: null,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-05-06",
    title: "물 마시기",
    weekdayMask: null,
    ...overrides,
  };
}

describe("일정 규칙 입력 검증", () => {
  it.each<{
    code: ValidationIssueCode;
    field: keyof CreateScheduleInput;
    value: Partial<CreateScheduleInput>;
  }>([
    {
      code: "interval_value_invalid",
      field: "intervalValue",
      value: { intervalValue: 0, recurrenceType: "interval_days" },
    },
    {
      code: "interval_value_invalid",
      field: "intervalValue",
      value: { intervalValue: 1.5, recurrenceType: "interval_months" },
    },
    {
      code: "weekday_mask_missing",
      field: "weekdayMask",
      value: { recurrenceType: "weekly" },
    },
    {
      code: "anchor_type_not_allowed",
      field: "anchorType",
      value: {
        anchorType: "completion_based",
        recurrenceType: "weekly",
        weekdayMask: [1],
      },
    },
    {
      code: "end_date_before_start_date",
      field: "endDateLocal",
      value: { endDateLocal: "2026-05-05" },
    },
    {
      code: "end_date_without_occurrence",
      field: "endDateLocal",
      value: {
        endDateLocal: "2026-05-07",
        recurrenceType: "weekly",
        weekdayMask: [5],
      },
    },
  ])("$code 조합을 저장 전에 거절한다", ({ code, field, value }) => {
    expect(validateInput(input(value))).toEqual(
      expect.arrayContaining([expect.objectContaining({ code, field })])
    );
  });
});
