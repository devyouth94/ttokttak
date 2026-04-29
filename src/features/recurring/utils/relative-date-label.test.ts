import {
  formatRelativeDateLabel,
  formatRelativeDateLabelFromUtc,
} from "./relative-date-label";

describe("relative date label", () => {
  it("오늘, 내일, 14일 이내 미래는 상대 날짜로 표시한다", () => {
    expect(
      formatRelativeDateLabel({
        baseLocalDate: "2026-04-10",
        targetLocalDate: "2026-04-10",
      })
    ).toBe("오늘");
    expect(
      formatRelativeDateLabel({
        baseLocalDate: "2026-04-10",
        targetLocalDate: "2026-04-11",
      })
    ).toBe("내일");
    expect(
      formatRelativeDateLabel({
        baseLocalDate: "2026-04-10",
        targetLocalDate: "2026-04-24",
      })
    ).toBe("14일 후");
  });

  it("15일 이후 미래는 날짜로 표시한다", () => {
    expect(
      formatRelativeDateLabel({
        baseLocalDate: "2026-04-10",
        targetLocalDate: "2026-04-25",
      })
    ).toBe("4월 25일");
  });

  it("UTC 예정 시각을 타임존 기준 날짜로 변환한다", () => {
    expect(
      formatRelativeDateLabelFromUtc({
        now: new Date("2026-04-10T03:00:00.000Z"),
        scheduledAtUtc: "2026-04-11T00:00:00.000Z",
        timezone: "Asia/Seoul",
      })
    ).toBe("내일");
  });
});
