import {
  getFirstReminderHelperText,
  getMinimumStartDateLocal,
  normalizeStartDateSelection,
} from "~/features/recurring/components/recurring-item-form-screen.helpers";

describe("recurring item form start date rules", () => {
  it("생성 화면의 시작일 하한선은 오늘이다", () => {
    expect(
      getMinimumStartDateLocal({
        isEditMode: false,
        todayLocalDate: "2026-04-13",
      })
    ).toBe("2026-04-13");
  });

  it("수정 화면의 시작일 하한선은 최초 시작일이다", () => {
    expect(
      getMinimumStartDateLocal({
        initialStartDateLocal: "2026-04-06",
        isEditMode: true,
        todayLocalDate: "2026-04-13",
      })
    ).toBe("2026-04-06");
  });

  it("하한선보다 과거 날짜를 고르면 하한선으로 보정한다", () => {
    expect(normalizeStartDateSelection("2026-04-01", "2026-04-06")).toBe(
      "2026-04-06"
    );
  });

  it("하한선 이후 날짜는 그대로 유지한다", () => {
    expect(normalizeStartDateSelection("2026-04-20", "2026-04-06")).toBe(
      "2026-04-20"
    );
  });

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
});
