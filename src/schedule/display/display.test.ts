import { scheduleFixture } from "~/schedule/fixtures";

import { getColorLabel, getColorOptions } from "./color";
import { formatLocal, formatTimestamp } from "./date";
import { getActionLabel, getRecurrenceLabel } from "./label";

describe("schedule display", () => {
  it("local 날짜와 시간을 언어별 형식으로 만든다", () => {
    expect(formatLocal("2026-04", "month")).toBe("2026년 4월");
    expect(formatLocal("2026-04-16", "weekdayDate")).toBe("4월 16일 목요일");
    expect(formatLocal("2026-04", "month", "en")).toBe("April 2026");
    expect(formatLocal("09:00", "time", "en")).toBe("9:00 AM");
  });

  it("UTC timestamp를 지정한 timezone의 날짜와 시간으로 만든다", () => {
    expect(
      formatTimestamp("2026-04-15T15:00:00.000Z", "Asia/Seoul", "date")
    ).toBe("4월 16일");
    expect(
      formatTimestamp("2026-04-16T00:00:00.000Z", "Asia/Seoul", "time", "en")
    ).toBe("9:00 AM");
  });

  it("처리 상태와 반복 규칙 문구를 만든다", () => {
    expect(getActionLabel("completed", "en")).toBe("Complete");
    expect(getActionLabel("skipped", "en")).toBe("Skip");
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

  it("색상 이름과 선택지를 언어별로 만든다", () => {
    expect(getColorLabel("red")).toBe("빨강");
    expect(getColorOptions("en")[0]).toMatchObject({
      label: "Red",
      value: "red",
    });
  });
});
