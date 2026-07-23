import { validateInput } from "./validate";
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

describe("validateInput", () => {
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
