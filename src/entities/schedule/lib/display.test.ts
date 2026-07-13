import {
  formatVisibleMonthTitle,
  formatWeekdayLocalDateTitle,
  getCompletionActionLabel,
  getRecurrenceLabel,
} from "./display";
import type { RecurringItem } from "../model/types";
import { createRecurringItemFixture } from "../testing";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return createRecurringItemFixture({
    ...overrides,
  });
}

describe("schedule display labels", () => {
  it("월과 날짜 제목을 언어별 형식으로 만든다", () => {
    expect(formatVisibleMonthTitle("2026-04")).toBe("2026년 4월");
    expect(formatWeekdayLocalDateTitle("2026-04-16")).toBe("4월 16일 목요일");
    expect(formatVisibleMonthTitle("2026-04", "en")).toBe("April 2026");
    expect(formatWeekdayLocalDateTitle("2026-04-16", "en")).toBe(
      "Thursday, Apr 16"
    );
  });

  it("English 완료/건너뛰기 label은 glossary 용어를 따른다", () => {
    expect(getCompletionActionLabel("completed", "en")).toBe("Complete");
    expect(getCompletionActionLabel("skipped", "en")).toBe("Skip");
  });

  it("English interval recurrence label은 단수와 복수를 구분한다", () => {
    expect(
      getRecurrenceLabel(
        createItem({
          intervalValue: 1,
          recurrenceType: "interval_days",
        }),
        "en"
      )
    ).toBe("Every day");
    expect(
      getRecurrenceLabel(
        createItem({
          intervalValue: 2,
          recurrenceType: "interval_days",
        }),
        "en"
      )
    ).toBe("Every 2 days");
  });
});
