import { resolveRecurringItemEditPolicy } from "~/features/recurring/domain/recurring-item-edit-policy";
import type { RecurringItem } from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";
const now = new Date("2026-05-07T03:00:00.000Z");

describe("resolveRecurringItemEditPolicy", () => {
  it("규칙이 바뀌면 저장 전 확정한 시각과 새 규칙의 첫 future occurrence local date를 정한다", () => {
    const policy = resolveRecurringItemEditPolicy({
      completionLogs: [],
      item: createItem(),
      now: () => now,
      patch: {
        reminderTimeLocal: "21:00",
      },
      timezone,
    });

    expect(policy).toEqual(
      expect.objectContaining({
        effectiveFromUtc: now.toISOString(),
        hasAnyChanges: true,
        metaChanged: false,
        ruleChanged: true,
        seedStartDateLocal: "2026-05-07",
      })
    );
    expect(policy.mergedDraft.reminderTimeLocal).toBe("21:00");
  });

  it("메타만 바뀌면 새 schedule version 기준 값을 만들지 않는다", () => {
    const policy = resolveRecurringItemEditPolicy({
      completionLogs: [],
      item: createItem(),
      now: () => now,
      patch: {
        title: "아침 물 마시기",
      },
      timezone,
    });

    expect(policy).toEqual(
      expect.objectContaining({
        effectiveFromUtc: null,
        hasAnyChanges: true,
        metaChanged: true,
        ruleChanged: false,
        seedStartDateLocal: null,
      })
    );
    expect(policy.mergedDraft.title).toBe("아침 물 마시기");
  });
});

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    anchorType: "fixed",
    colorKey: "blue",
    createdAt: "2026-05-01T00:00:00.000Z",
    description: null,
    id: "item-1",
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    scheduleVersions: [
      {
        anchorType: "fixed",
        createdAt: "2026-05-01T00:00:00.000Z",
        effectiveFromUtc: "2026-04-30T15:00:00.000Z",
        id: "version-1",
        intervalValue: null,
        itemId: "item-1",
        notificationsEnabled: true,
        recurrenceType: "daily",
        reminderTimeLocal: "09:00",
        seedStartDateLocal: "2026-05-01",
        userId: "user-1",
        weekdayMask: null,
      },
    ],
    startDateLocal: "2026-05-01",
    timezone,
    title: "물 마시기",
    updatedAt: "2026-05-01T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}
