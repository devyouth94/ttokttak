import {
  createFormValues,
  getFirstReminderDate,
  getRecurrenceChange,
  getStartDateChange,
} from "./form-values";

describe("일정 폼 값 전이", () => {
  const values = {
    ...createFormValues(new Date(2026, 7, 4, 9)),
    anchorType: "completion_based" as const,
    endDateLocal: "2026-08-10",
  };

  it("반복 방식에 맞지 않는 연관 값을 함께 정리한다", () => {
    expect(getRecurrenceChange(values, "weekly")).toMatchObject({
      anchorType: "fixed",
      endDateLocal: "2026-08-10",
      intervalValue: "",
      recurrenceType: "weekly",
      weekdayMask: [2],
    });

    expect(getRecurrenceChange(values, "once")).toMatchObject({
      anchorType: "fixed",
      endDateLocal: null,
      intervalValue: "",
      recurrenceType: "once",
      weekdayMask: [],
    });

    expect(
      getRecurrenceChange(
        { ...values, intervalValue: "", recurrenceType: "once" },
        "interval_days"
      )
    ).toMatchObject({
      anchorType: "completion_based",
      endDateLocal: null,
      intervalValue: "1",
      recurrenceType: "interval_days",
      weekdayMask: [],
    });
  });

  it("시작일의 최소값과 종료일·기본 요일을 함께 맞춘다", () => {
    expect(
      getStartDateChange(
        {
          endDateLocal: "2026-08-05",
          recurrenceType: "weekly",
          weekdayMask: [],
        },
        "2026-08-03",
        "2026-08-06"
      )
    ).toEqual({
      endDateLocal: "2026-08-06",
      startDateLocal: "2026-08-06",
      weekdayMask: [4],
    });
  });

  it("시작일과 다른 첫 주간 occurrence만 안내한다", () => {
    expect(
      getFirstReminderDate({
        intervalValue: "",
        recurrenceType: "weekly",
        startDateLocal: "2026-08-04",
        weekdayMask: [4],
      })
    ).toBe("2026-08-06");

    expect(
      getFirstReminderDate({
        intervalValue: "",
        recurrenceType: "weekly",
        startDateLocal: "2026-08-04",
        weekdayMask: [2],
      })
    ).toBeNull();
  });
});
