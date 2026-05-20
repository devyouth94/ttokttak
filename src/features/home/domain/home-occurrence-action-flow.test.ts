import type { RecurringItem } from "~/entities/schedule";
import {
  createItemOccurrenceProjection,
  createLocalDateUtcRange,
} from "~/entities/schedule";
import {
  createCompletionLogFixture,
  createRecurringItemFixture,
  recurringTestTimezone as timezone,
} from "~/entities/schedule/testing";

import {
  type HomeFeedOccurrenceLogInput,
  processHomeFeedOccurrenceAction,
} from "./home-occurrence-action-flow";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return createRecurringItemFixture({
    recurrenceType: "once",
    reminderTimeLocal: "18:00",
    ...overrides,
  });
}

function createLog(
  overrides: Parameters<typeof createCompletionLogFixture>[0] = {}
) {
  return createCompletionLogFixture({
    actedAtUtc: "2026-04-10T09:05:00.000Z",
    createdAt: "2026-04-10T09:05:00.000Z",
    scheduledAtUtc: "2026-04-10T09:00:00.000Z",
    ...overrides,
  });
}

function getTodayOccurrence(item: RecurringItem) {
  const now = new Date("2026-04-10T03:00:00.000Z");

  return createItemOccurrenceProjection({
    completionLogs: [],
    item,
    now,
    timezone,
  }).getScheduledOccurrencesInRange(
    createLocalDateUtcRange("2026-04-10", timezone)
  )[0]!;
}

describe("processHomeFeedOccurrenceAction", () => {
  it("scheduled occurrence를 완료하면 completion log 생성 후 알림과 홈 피드를 새로 맞춘다", async () => {
    const item = createItem({ id: "scheduled-item" });
    const occurrence = getTodayOccurrence(item);
    const now = new Date("2026-04-10T03:00:00.000Z");
    const createCompletionLog = jest.fn(async () =>
      createLog({ itemId: item.id, scheduledAtUtc: occurrence.scheduledAtUtc })
    );
    const syncAfterMutation = jest.fn(async () => undefined);
    const invalidateRecurringUserQueries = jest.fn(async () => undefined);
    const refetchFeed = jest.fn(async () => undefined);

    await processHomeFeedOccurrenceAction({
      action: "completed",
      completionLogs: [],
      createCompletionLog,
      invalidateRecurringUserQueries,
      now,
      refetchFeed,
      syncAfterMutation,
      target: { item, occurrence },
      timezone,
      userId: "user-1",
    });

    expect(createCompletionLog).toHaveBeenCalledWith({
      action: "completed",
      itemId: "scheduled-item",
      scheduledAtUtc: "2026-04-10T09:00:00.000Z",
      userId: "user-1",
    });
    expect(syncAfterMutation).toHaveBeenCalledWith({
      reason: "occurrence-completed",
      scope: {
        effectiveFromUtc: "2026-04-10T03:00:00.000Z",
        itemId: "scheduled-item",
        type: "item",
      },
    });
    expect(invalidateRecurringUserQueries).toHaveBeenCalledWith("user-1");
    expect(refetchFeed).toHaveBeenCalledTimes(1);
  });

  it("지난 일정 occurrence를 처리하면 그 이전 unresolved 지난 일정도 함께 처리한다", async () => {
    const item = createItem({
      id: "overdue-item",
      intervalValue: 3,
      recurrenceType: "interval_days",
      reminderTimeLocal: "09:00",
      startDateLocal: "2026-04-04",
    });
    const now = new Date("2026-04-10T03:00:00.000Z");
    const occurrence = createItemOccurrenceProjection({
      completionLogs: [],
      item,
      now,
      timezone,
    }).getLatestOverdueOccurrence({
      lookbackStartLocalDate: item.startDateLocal,
    });
    const createdScheduledAtUtcValues: string[] = [];
    const createCompletionLog = jest.fn(
      async (input: HomeFeedOccurrenceLogInput) => {
        createdScheduledAtUtcValues.push(input.scheduledAtUtc);

        return createLog();
      }
    );

    expect(occurrence).toBeDefined();

    await processHomeFeedOccurrenceAction({
      action: "completed",
      completionLogs: [],
      createCompletionLog,
      invalidateRecurringUserQueries: jest.fn(async () => undefined),
      now,
      refetchFeed: jest.fn(async () => undefined),
      syncAfterMutation: jest.fn(async () => undefined),
      target: { item, occurrence: occurrence! },
      timezone,
      userId: "user-1",
    });

    expect(createdScheduledAtUtcValues).toEqual([
      "2026-04-04T00:00:00.000Z",
      "2026-04-07T00:00:00.000Z",
    ]);
  });

  it("이미 처리된 occurrence에는 completion log를 다시 만들지 않는다", async () => {
    const item = createItem({
      id: "overdue-item",
      intervalValue: 3,
      recurrenceType: "interval_days",
      reminderTimeLocal: "09:00",
      startDateLocal: "2026-04-04",
    });
    const completionLogs = [
      createLog({
        id: "previous-log",
        itemId: item.id,
        scheduledAtUtc: "2026-04-04T00:00:00.000Z",
      }),
    ];
    const now = new Date("2026-04-10T03:00:00.000Z");
    const occurrence = createItemOccurrenceProjection({
      completionLogs,
      item,
      now,
      timezone,
    }).getLatestOverdueOccurrence({
      lookbackStartLocalDate: item.startDateLocal,
    });
    const createCompletionLog = jest.fn(async () => createLog());

    expect(occurrence).toBeDefined();

    await processHomeFeedOccurrenceAction({
      action: "completed",
      completionLogs,
      createCompletionLog,
      invalidateRecurringUserQueries: jest.fn(async () => undefined),
      now,
      refetchFeed: jest.fn(async () => undefined),
      syncAfterMutation: jest.fn(async () => undefined),
      target: { item, occurrence: occurrence! },
      timezone,
      userId: "user-1",
    });

    expect(createCompletionLog).toHaveBeenCalledTimes(1);
    expect(createCompletionLog).toHaveBeenCalledWith({
      action: "completed",
      itemId: item.id,
      scheduledAtUtc: "2026-04-07T00:00:00.000Z",
      userId: "user-1",
    });
  });

  it("userId가 없으면 occurrence 처리 side effect를 실행하지 않는다", async () => {
    const item = createItem({ id: "scheduled-item" });
    const occurrence = getTodayOccurrence(item);
    const createCompletionLog = jest.fn(async () => createLog());
    const syncAfterMutation = jest.fn(async () => undefined);
    const invalidateRecurringUserQueries = jest.fn(async () => undefined);
    const refetchFeed = jest.fn(async () => undefined);

    await processHomeFeedOccurrenceAction({
      action: "completed",
      completionLogs: [],
      createCompletionLog,
      invalidateRecurringUserQueries,
      now: new Date("2026-04-10T03:00:00.000Z"),
      refetchFeed,
      syncAfterMutation,
      target: { item, occurrence },
      timezone,
      userId: null,
    });

    expect(createCompletionLog).not.toHaveBeenCalled();
    expect(syncAfterMutation).not.toHaveBeenCalled();
    expect(invalidateRecurringUserQueries).not.toHaveBeenCalled();
    expect(refetchFeed).not.toHaveBeenCalled();
  });

  it("건너뛰기 처리는 skipped log와 skipped sync reason을 사용한다", async () => {
    const item = createItem({ id: "scheduled-item" });
    const occurrence = getTodayOccurrence(item);
    const now = new Date("2026-04-10T03:00:00.000Z");
    const createCompletionLog = jest.fn(async () =>
      createLog({
        action: "skipped",
        itemId: item.id,
        scheduledAtUtc: occurrence.scheduledAtUtc,
      })
    );
    const syncAfterMutation = jest.fn(async () => undefined);

    await processHomeFeedOccurrenceAction({
      action: "skipped",
      completionLogs: [],
      createCompletionLog,
      invalidateRecurringUserQueries: jest.fn(async () => undefined),
      now,
      refetchFeed: jest.fn(async () => undefined),
      syncAfterMutation,
      target: { item, occurrence },
      timezone,
      userId: "user-1",
    });

    expect(createCompletionLog).toHaveBeenCalledWith({
      action: "skipped",
      itemId: item.id,
      scheduledAtUtc: "2026-04-10T09:00:00.000Z",
      userId: "user-1",
    });
    expect(syncAfterMutation).toHaveBeenCalledWith({
      reason: "occurrence-skipped",
      scope: {
        effectiveFromUtc: "2026-04-10T03:00:00.000Z",
        itemId: item.id,
        type: "item",
      },
    });
  });

  it("알림 동기화 실패는 기록하고 홈 피드 재조회는 계속한다", async () => {
    const item = createItem({ id: "scheduled-item" });
    const occurrence = getTodayOccurrence(item);
    const syncError = new Error("notification sync failed");
    const events: string[] = [];
    const createCompletionLog = jest.fn(async () => {
      events.push("create-log");

      return createLog({
        itemId: item.id,
        scheduledAtUtc: occurrence.scheduledAtUtc,
      });
    });
    const syncAfterMutation = jest.fn(async () => {
      events.push("sync");
      throw syncError;
    });
    const invalidateRecurringUserQueries = jest.fn(async () => {
      events.push("invalidate");
    });
    const refetchFeed = jest.fn(async () => {
      events.push("refetch");
    });
    const captureException = jest.fn();

    await expect(
      processHomeFeedOccurrenceAction({
        action: "completed",
        captureException,
        completionLogs: [],
        createCompletionLog,
        invalidateRecurringUserQueries,
        now: new Date("2026-04-10T03:00:00.000Z"),
        refetchFeed,
        syncAfterMutation,
        target: { item, occurrence },
        timezone,
        userId: "user-1",
      })
    ).resolves.toBeUndefined();

    expect(captureException).toHaveBeenCalledWith(syncError, {
      tags: {
        feature: "recurring-mutation-notification-sync",
        reason: "occurrence-completed",
      },
    });
    expect(events).toEqual(["create-log", "sync", "invalidate", "refetch"]);
  });
});
