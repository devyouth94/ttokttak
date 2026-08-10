import { validateInput, type ValidationIssueCode } from "./validate";
import { defaultColorKey } from "../display/color";
import type { CreateScheduleInput } from "../schedule";

function createInput(
  overrides: Partial<CreateScheduleInput> = {}
): CreateScheduleInput {
  return {
    anchorType: "fixed",
    colorKey: defaultColorKey,
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

describe("일정 입력 검증", () => {
  it.each<{
    code: ValidationIssueCode;
    field: keyof CreateScheduleInput;
    input: Partial<CreateScheduleInput>;
    label: string;
  }>([
    {
      code: "title_missing",
      field: "title",
      input: { title: "   " },
      label: "빈 제목",
    },
    {
      code: "start_date_invalid",
      field: "startDateLocal",
      input: { startDateLocal: "2026/05/06" },
      label: "시작일 형식",
    },
    {
      code: "end_date_invalid",
      field: "endDateLocal",
      input: { endDateLocal: "2026/05/10" },
      label: "종료일 형식",
    },
    {
      code: "reminder_time_invalid",
      field: "reminderTimeLocal",
      input: { reminderTimeLocal: "24:00" },
      label: "알림 시각 형식",
    },
    {
      code: "interval_value_missing",
      field: "intervalValue",
      input: { recurrenceType: "interval_days" },
      label: "간격 누락",
    },
    {
      code: "interval_value_not_allowed",
      field: "intervalValue",
      input: { intervalValue: 2 },
      label: "불필요한 간격",
    },
    {
      code: "weekday_mask_missing",
      field: "weekdayMask",
      input: { recurrenceType: "weekly" },
      label: "요일 누락",
    },
    {
      code: "weekday_mask_invalid",
      field: "weekdayMask",
      input: { recurrenceType: "weekly", weekdayMask: [1, 1] },
      label: "중복 요일",
    },
    {
      code: "weekday_mask_invalid",
      field: "weekdayMask",
      input: { recurrenceType: "weekly", weekdayMask: [7] },
      label: "요일 범위",
    },
    {
      code: "weekday_mask_not_allowed",
      field: "weekdayMask",
      input: { weekdayMask: [1] },
      label: "불필요한 요일",
    },
  ])("$label 입력을 거부한다", ({ code, field, input }) => {
    expect(validateInput(createInput(input))).toEqual(
      expect.arrayContaining([expect.objectContaining({ code, field })])
    );
  });

  it("한 번 일정은 종료일을 가질 수 없다", () => {
    expect(
      validateInput(
        createInput({
          endDateLocal: "2026-05-10",
          recurrenceType: "once",
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "end_date_not_allowed",
          field: "endDateLocal",
        }),
      ])
    );
  });

  it("종료일은 시작일보다 빠를 수 없다", () => {
    expect(
      validateInput(
        createInput({
          endDateLocal: "2026-05-05",
          startDateLocal: "2026-05-06",
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "end_date_before_start_date",
          field: "endDateLocal",
        }),
      ])
    );
  });

  it("종료일이 있으면 기간 안에 occurrence가 있어야 한다", () => {
    expect(
      validateInput(
        createInput({
          endDateLocal: "2026-05-07",
          recurrenceType: "weekly",
          weekdayMask: [5],
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "end_date_without_occurrence",
          field: "endDateLocal",
        }),
      ])
    );
  });

  it("간격이 잘못되면 간격 오류만 반환한다", () => {
    const issues = validateInput(
      createInput({
        endDateLocal: "2026-05-07",
        intervalValue: 0,
        recurrenceType: "interval_weeks",
        weekdayMask: [5],
      })
    );

    expect(issues.map(({ code }) => code)).toContain("interval_value_invalid");
    expect(issues.map(({ code }) => code)).not.toContain(
      "end_date_without_occurrence"
    );
  });

  it("긴 주 단위 간격도 종료일 안에 occurrence가 있으면 허용한다", () => {
    expect(
      validateInput(
        createInput({
          endDateLocal: "2029-11-05",
          intervalValue: 200,
          recurrenceType: "interval_weeks",
          startDateLocal: "2026-01-07",
          weekdayMask: [1],
        })
      )
    ).toEqual([]);
  });

  it("한 번 일정은 완료일 기준을 사용할 수 없다", () => {
    expect(
      validateInput(
        createInput({
          anchorType: "completion_based",
          recurrenceType: "once",
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "anchor_type_not_allowed",
          field: "anchorType",
        }),
      ])
    );
  });
});
