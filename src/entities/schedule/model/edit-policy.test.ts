import { resolveRecurringItemEditPolicy } from "./edit-policy";
import {
  createRecurringItemFixture,
  createScheduleVersionFixture,
  recurringTestTimezone as timezone,
} from "./test-fixtures";
import type { RecurringItem } from "./types";

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
        hasAnyChanges: true,
        metaChanged: false,
        ruleChanged: true,
      })
    );
    expect(policy.mergedDraft.reminderTimeLocal).toBe("21:00");
    expect(policy.scheduleVersionCommand).toEqual({
      anchorType: "fixed",
      effectiveFromUtc: now.toISOString(),
      endDateLocal: null,
      intervalValue: null,
      notificationsEnabled: true,
      recurrenceType: "daily",
      reminderTimeLocal: "21:00",
      seedStartDateLocal: "2026-05-07",
      weekdayMask: null,
    });
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
        hasAnyChanges: true,
        metaChanged: true,
        ruleChanged: false,
      })
    );
    expect(policy.mergedDraft.title).toBe("아침 물 마시기");
    expect(policy.itemPatch).toEqual({
      colorKey: "blue",
      description: null,
      isArchived: false,
      title: "아침 물 마시기",
    });
    expect(policy.scheduleVersionCommand).toBeNull();
  });

  it("이미 종료일이 지난 일정도 메타만 수정할 수 있다", () => {
    const policy = resolveRecurringItemEditPolicy({
      completionLogs: [],
      item: createItem({
        endDateLocal: "2026-05-06",
      }),
      now: () => now,
      patch: {
        title: "종료된 물 마시기",
      },
      timezone,
    });

    expect(policy).toEqual(
      expect.objectContaining({
        hasAnyChanges: true,
        metaChanged: true,
        ruleChanged: false,
      })
    );
    expect(policy.mergedDraft.endDateLocal).toBe("2026-05-06");
    expect(policy.scheduleVersionCommand).toBeNull();
  });

  it("수정 시 종료일은 수정하는 날보다 빠를 수 없다", () => {
    expect(() =>
      resolveRecurringItemEditPolicy({
        completionLogs: [],
        item: createItem(),
        now: () => now,
        patch: {
          endDateLocal: "2026-05-06",
        },
        timezone,
      })
    ).toThrow("종료일은 수정하는 날보다 빠를 수 없습니다.");
  });

  it("과거 종료일을 제거하는 수정은 허용한다", () => {
    const policy = resolveRecurringItemEditPolicy({
      completionLogs: [],
      item: createItem({
        endDateLocal: "2026-05-06",
      }),
      now: () => now,
      patch: {
        endDateLocal: null,
      },
      timezone,
    });

    expect(policy).toEqual(
      expect.objectContaining({
        hasAnyChanges: true,
        metaChanged: false,
        ruleChanged: true,
      })
    );
    expect(policy.mergedDraft.endDateLocal).toBeNull();
    expect(policy.scheduleVersionCommand).toEqual(
      expect.objectContaining({
        endDateLocal: null,
        recurrenceType: "daily",
        seedStartDateLocal: "2026-05-08",
      })
    );
  });

  it("종료일 수정은 새 schedule version 저장 명령에 종료일을 포함한다", () => {
    const policy = resolveRecurringItemEditPolicy({
      completionLogs: [],
      item: createItem(),
      now: () => now,
      patch: {
        endDateLocal: "2026-05-19",
      },
      timezone,
    });

    expect(policy.scheduleVersionCommand).toEqual(
      expect.objectContaining({
        effectiveFromUtc: now.toISOString(),
        endDateLocal: "2026-05-19",
        seedStartDateLocal: "2026-05-08",
      })
    );
  });

  it("종료일을 오늘로 줄이면 새 schedule version seed를 종료일 이후로 만들지 않는다", () => {
    const policy = resolveRecurringItemEditPolicy({
      completionLogs: [],
      item: createItem(),
      now: () => now,
      patch: {
        endDateLocal: "2026-05-07",
      },
      timezone,
    });

    expect(policy.scheduleVersionCommand).toEqual(
      expect.objectContaining({
        endDateLocal: "2026-05-07",
        seedStartDateLocal: "2026-05-01",
      })
    );
  });

  it("한 번 일정으로 바꾸면 새 schedule version 저장 명령에서 종료일을 제거한다", () => {
    const policy = resolveRecurringItemEditPolicy({
      completionLogs: [],
      item: createItem({
        endDateLocal: "2026-05-19",
      }),
      now: () => now,
      patch: {
        recurrenceType: "once",
      },
      timezone,
    });

    expect(policy.scheduleVersionCommand).toEqual(
      expect.objectContaining({
        endDateLocal: null,
        recurrenceType: "once",
      })
    );
  });
});

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return createRecurringItemFixture({
    createdAt: "2026-05-01T00:00:00.000Z",
    scheduleVersions: [
      createScheduleVersionFixture({
        createdAt: "2026-05-01T00:00:00.000Z",
        effectiveFromUtc: "2026-04-30T15:00:00.000Z",
        seedStartDateLocal: "2026-05-01",
      }),
    ],
    startDateLocal: "2026-05-01",
    title: "물 마시기",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  });
}
