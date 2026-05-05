import {
  defaultRecurringItemColorKey,
  type RecurringItemDraft,
} from "~/features/recurring/domain/types";
import { validateRecurringItemDraft } from "~/features/recurring/domain/validation";

function createDraft(
  overrides: Partial<RecurringItemDraft> = {}
): RecurringItemDraft {
  return {
    anchorType: "fixed",
    category: null,
    colorKey: defaultRecurringItemColorKey,
    description: null,
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-05-06",
    timezone: "Asia/Seoul",
    title: "물 마시기",
    weekdayMask: null,
    ...overrides,
  };
}

describe("validateRecurringItemDraft", () => {
  it("일정 색상 key는 허용된 팔레트 값만 통과한다", () => {
    expect(
      validateRecurringItemDraft(createDraft({ colorKey: "purple" }))
    ).toEqual([]);

    const invalidIssues = validateRecurringItemDraft(
      createDraft({ colorKey: "pink" as RecurringItemDraft["colorKey"] })
    );

    expect(invalidIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "color_key_invalid",
          field: "colorKey",
        }),
      ])
    );
  });
});
