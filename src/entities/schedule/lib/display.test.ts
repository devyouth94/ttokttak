import { getCompletionActionLabel, getRecurrenceLabel } from "./display";
import type { RecurringItem } from "../model/types";
import { createRecurringItemFixture } from "../testing";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return createRecurringItemFixture({
    ...overrides,
  });
}

describe("schedule display labels", () => {
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
