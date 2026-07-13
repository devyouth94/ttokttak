import { getRecurringItemColorOptions } from "~/entities/schedule";

import {
  getCompletionBasedInfoText,
  getCustomRecurrenceUnitOptions,
  getFirstReminderHelperText,
  getQuickRecurrenceOptions,
  getRecurringItemFormDisplayValues,
  getRecurringItemFormEndDateControlState,
  getRecurringItemFormFirstErrorTarget,
  getScheduleFormScreenTitle,
  getWeekdayOptions,
} from "./schedule-form-screen-model";

describe("recurring item form first reminder helper", () => {
  it("weekly 시작일과 첫 알림일이 다르면 보조 문구를 만든다", () => {
    expect(
      getFirstReminderHelperText({
        intervalValue: "",
        recurrenceType: "weekly",
        startDateLocal: "2026-04-22",
        weekdayMask: [5],
      })
    ).toBe("첫 알림일은 4월 24일 금요일입니다.");
  });

  it("weekly 시작일과 첫 알림일이 같으면 보조 문구를 숨긴다", () => {
    expect(
      getFirstReminderHelperText({
        intervalValue: "",
        recurrenceType: "weekly",
        startDateLocal: "2026-04-24",
        weekdayMask: [5],
      })
    ).toBeNull();
  });

  it("주 단위가 아니면 첫 알림일 보조 문구를 숨긴다", () => {
    expect(
      getFirstReminderHelperText({
        intervalValue: "3",
        recurrenceType: "interval_days",
        startDateLocal: "2026-04-22",
        weekdayMask: [],
      })
    ).toBeNull();
  });

  it("interval_weeks도 주차 간격을 반영해서 보조 문구를 만든다", () => {
    expect(
      getFirstReminderHelperText({
        intervalValue: "2",
        recurrenceType: "interval_weeks",
        startDateLocal: "2026-04-25",
        weekdayMask: [1],
      })
    ).toBe("첫 알림일은 5월 4일 월요일입니다.");
  });

  it("English 모드에서는 첫 알림일 보조 문구와 날짜/시간 표시를 English로 만든다", () => {
    expect(
      getFirstReminderHelperText(
        {
          intervalValue: "",
          recurrenceType: "weekly",
          startDateLocal: "2026-04-22",
          weekdayMask: [5],
        },
        "en"
      )
    ).toBe("First reminder is Friday, Apr 24.");

    expect(
      getRecurringItemFormDisplayValues(
        {
          endDateLocal: "2026-05-10",
          intervalValue: "",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          weekdayMask: [],
        },
        "en"
      )
    ).toMatchObject({
      endDateDisplayValue: "May 10, 2026",
      reminderTimeDisplayValue: "9:00 AM",
      startDateDisplayValue: "Apr 22, 2026",
    });
  });
});

describe("recurring item form color options", () => {
  it("English 모드에서는 대표 선택지 라벨을 English로 제공한다", () => {
    expect(getRecurringItemColorOptions("en")[0]).toMatchObject({
      label: "Red",
      value: "red",
    });
    expect(
      getQuickRecurrenceOptions("en").map((option) => option.label)
    ).toEqual(["Daily", "Weekly", "Monthly"]);
    expect(getCustomRecurrenceUnitOptions("en")[0]).toMatchObject({
      label: "days",
      value: "days",
    });
    expect(getWeekdayOptions("en")[0]).toMatchObject({
      label: "Mon",
      value: 1,
    });
  });
});

describe("recurring item form end date display", () => {
  it("한 번 일정에서는 종료일 control을 숨긴다", () => {
    expect(
      getRecurringItemFormEndDateControlState({
        endDateLocal: "2026-05-10",
        recurrenceType: "once",
      })
    ).toEqual({
      displayValue: null,
      isEnabled: false,
      isVisible: false,
    });
  });

  it("반복 일정에서 종료일이 없으면 switch만 보이고 날짜 값은 숨긴다", () => {
    expect(
      getRecurringItemFormEndDateControlState({
        endDateLocal: null,
        recurrenceType: "daily",
      })
    ).toEqual({
      displayValue: null,
      isEnabled: false,
      isVisible: true,
    });
  });

  it("반복 일정에서 종료일이 있으면 switch와 날짜 값을 함께 보여준다", () => {
    expect(
      getRecurringItemFormEndDateControlState({
        endDateLocal: "2026-05-10",
        recurrenceType: "daily",
      })
    ).toEqual({
      displayValue: "2026년 5월 10일",
      isEnabled: true,
      isVisible: true,
    });
  });

  it("English 모드에서는 종료일 control 날짜 값을 English로 보여준다", () => {
    expect(
      getRecurringItemFormEndDateControlState(
        {
          endDateLocal: "2026-05-10",
          recurrenceType: "daily",
        },
        "en"
      )
    ).toEqual({
      displayValue: "May 10, 2026",
      isEnabled: true,
      isVisible: true,
    });
  });
});

describe("recurring item form screen copy", () => {
  it("English 모드에서는 화면 제목과 완료일 기준 설명을 English로 제공한다", () => {
    expect(getScheduleFormScreenTitle(false, "en")).toBe("Add item");
    expect(getScheduleFormScreenTitle(true, "en")).toBe("Edit item");
    expect(getCompletionBasedInfoText("en")).toBe(
      "Recalculates the next item from the date you complete it. Disabled for once and weekly settings."
    );
  });
});

describe("recurring item form error target", () => {
  it("종료일 오류는 schedule 섹션으로 이동한다", () => {
    expect(
      getRecurringItemFormFirstErrorTarget({
        endDate: "종료일을 확인해 주세요.",
      })
    ).toBe("schedule");
  });
});
