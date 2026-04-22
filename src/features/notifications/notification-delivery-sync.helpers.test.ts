import { createNotificationDeliveryPlan } from "~/features/notifications/notification-delivery-sync.helpers";

describe("notification delivery sync helpers", () => {
  it("같은 occurrence의 변경 없는 job은 유지하고 나머지만 취소 또는 upsert 한다", () => {
    const plan = createNotificationDeliveryPlan({
      desired: [
        {
          body: "아침 약 복용 시간입니다.",
          dedupeKey: "reminder:user-1:item-1:2026-04-16T00:00:00.000Z",
          deliverAtUtc: "2026-04-16T00:00:00.000Z",
          itemId: "item-1",
          itemScheduledAtUtc: "2026-04-16T00:00:00.000Z",
          notificationKind: "reminder",
          payload: {
            itemId: "item-1",
            scheduledAtUtc: "2026-04-16T00:00:00.000Z",
            source: "recurring-item",
          },
          title: "약 먹기",
        },
        {
          body: "아침 약 복용 시간입니다.",
          dedupeKey: "reminder:user-1:item-1:2026-04-17T00:00:00.000Z",
          deliverAtUtc: "2026-04-17T00:00:00.000Z",
          itemId: "item-1",
          itemScheduledAtUtc: "2026-04-17T00:00:00.000Z",
          notificationKind: "reminder",
          payload: {
            itemId: "item-1",
            scheduledAtUtc: "2026-04-17T00:00:00.000Z",
            source: "recurring-item",
          },
          title: "약 먹기",
        },
      ],
      existing: [
        {
          body: "아침 약 복용 시간입니다.",
          dedupeKey: "reminder:user-1:item-1:2026-04-16T00:00:00.000Z",
          id: "job-1",
          itemId: "item-1",
          itemScheduledAtUtc: "2026-04-16T00:00:00.000Z",
          notificationKind: "reminder",
          payload: {
            itemId: "item-1",
            scheduledAtUtc: "2026-04-16T00:00:00.000Z",
            source: "recurring-item",
          },
          title: "약 먹기",
        },
        {
          body: "이전 본문",
          dedupeKey: "reminder:user-1:item-1:2026-04-18T00:00:00.000Z",
          id: "job-2",
          itemId: "item-1",
          itemScheduledAtUtc: "2026-04-18T00:00:00.000Z",
          notificationKind: "reminder",
          payload: {
            itemId: "item-1",
            scheduledAtUtc: "2026-04-18T00:00:00.000Z",
            source: "recurring-item",
          },
          title: "약 먹기",
        },
      ],
      scope: {
        effectiveFromUtc: "2026-04-16T00:00:00.000Z",
        itemId: "item-1",
        type: "item",
      },
    });

    expect(plan.jobsToKeep.map((entry) => entry.id)).toEqual(["job-1"]);
    expect(plan.jobsToCancel.map((entry) => entry.id)).toEqual(["job-2"]);
    expect(plan.jobsToUpsert.map((entry) => entry.itemScheduledAtUtc)).toEqual([
      "2026-04-17T00:00:00.000Z",
    ]);
  });
});
