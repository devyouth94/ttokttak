import {
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
});
