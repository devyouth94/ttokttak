import { formatTimestamp } from "./date";
import { getRecurrenceLabel } from "./label";
import { scheduleFixture } from "../fixtures";

describe("schedule display", () => {
  it("UTC timestamp를 지정한 timezone의 날짜와 시간으로 만든다", () => {
    expect(
      formatTimestamp("2026-04-15T15:00:00.000Z", "Asia/Seoul", "date")
    ).toBe("4월 16일");
    expect(
      formatTimestamp("2026-04-16T00:00:00.000Z", "Asia/Seoul", "time", "en")
    ).toBe("9:00 AM");
  });

  it("반복 간격 1과 복수 간격을 구분해 표시한다", () => {
    expect(
      getRecurrenceLabel(
        scheduleFixture({
          intervalValue: 1,
          recurrenceType: "interval_days",
        }),
        "en"
      )
    ).toBe("Every day");
    expect(
      getRecurrenceLabel(
        scheduleFixture({
          intervalValue: 2,
          recurrenceType: "interval_days",
        }),
        "en"
      )
    ).toBe("Every 2 days");
  });
});
