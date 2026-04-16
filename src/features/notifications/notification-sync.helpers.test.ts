import {
  createNotificationSyncPlan,
  type DesiredScheduledNotification,
  type ExistingScheduledNotification,
} from "~/features/notifications/notification-sync.helpers";

const existingNotifications: ExistingScheduledNotification[] = [
  {
    body: "기존 본문",
    identifier: "old-1",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-14T08:00:00.000Z",
    title: "기존 제목",
  },
  {
    body: "기존 본문",
    identifier: "old-2",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-16T08:00:00.000Z",
    title: "기존 제목",
  },
];

describe("createNotificationSyncPlan", () => {
  it("item scope 수정 시 effectiveFromUtc 이전 예약은 유지한다", () => {
    const desired: DesiredScheduledNotification[] = [
      {
        body: "수정된 본문",
        itemId: "item-1",
        scheduledAtUtc: "2026-04-16T08:00:00.000Z",
        title: "수정된 제목",
      },
      {
        body: "새 본문",
        itemId: "item-1",
        scheduledAtUtc: "2026-04-18T08:00:00.000Z",
        title: "새 제목",
      },
    ];

    const plan = createNotificationSyncPlan({
      desired,
      existing: existingNotifications,
      scope: {
        effectiveFromUtc: "2026-04-15T00:00:00.000Z",
        itemId: "item-1",
        type: "item",
      },
    });

    expect(plan.notificationsToKeep.map((entry) => entry.identifier)).toEqual([
      "old-1",
    ]);
    expect(plan.notificationsToCancel.map((entry) => entry.identifier)).toEqual(
      ["old-2"]
    );
    expect(
      plan.notificationsToSchedule.map((entry) => entry.scheduledAtUtc)
    ).toEqual(["2026-04-16T08:00:00.000Z", "2026-04-18T08:00:00.000Z"]);
  });

  it("같은 occurrence와 같은 내용이면 다시 예약하지 않는다", () => {
    const desired: DesiredScheduledNotification[] = [
      {
        body: "기존 본문",
        itemId: "item-1",
        scheduledAtUtc: "2026-04-16T08:00:00.000Z",
        title: "기존 제목",
      },
    ];

    const plan = createNotificationSyncPlan({
      desired,
      existing: existingNotifications,
      scope: {
        effectiveFromUtc: "2026-04-15T00:00:00.000Z",
        itemId: "item-1",
        type: "item",
      },
    });

    expect(plan.notificationsToCancel).toHaveLength(0);
    expect(plan.notificationsToSchedule).toHaveLength(0);
  });
});
