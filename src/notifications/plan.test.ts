import type { NotificationRequest } from "expo-notifications";

import {
  logFixture,
  scheduleFixture,
  testTimezone as timezone,
} from "~/schedule/fixtures";

import { planNotifications } from "./plan";

const now = new Date("2026-04-21T00:00:00.000Z");

it("같은 예약은 유지하고 제목·시각·처리 상태가 달라진 자기 예약만 바꾼다", () => {
  const oldItems = [
    scheduleFixture({
      id: "same",
      recurrenceType: "once",
      reminderTimeLocal: "10:00",
      startDateLocal: "2026-04-21",
    }),
    scheduleFixture({
      id: "renamed",
      recurrenceType: "once",
      startDateLocal: "2026-04-22",
      title: "이전 제목",
    }),
    scheduleFixture({
      id: "retimed",
      recurrenceType: "once",
      reminderTimeLocal: "09:00",
      startDateLocal: "2026-04-22",
    }),
    scheduleFixture({
      id: "handled",
      recurrenceType: "once",
      startDateLocal: "2026-04-22",
    }),
  ];
  const oldPlan = plan({ items: oldItems });
  const requests = [
    ...oldPlan.wanted.map(toRequest),
    request("other-app:keep"),
  ];
  const handled = oldPlan.wanted.find(({ itemId }) => itemId === "handled")!;
  const result = plan({
    completionLogs: [
      logFixture({
        itemId: "handled",
        scheduledAtUtc: handled.scheduledAtUtc,
      }),
    ],
    items: oldItems.map((item) => {
      if (item.id === "renamed") return { ...item, title: "새 제목" };
      if (item.id === "retimed") {
        return scheduleFixture({
          id: item.id,
          recurrenceType: "once",
          reminderTimeLocal: "10:00",
          startDateLocal: "2026-04-22",
        });
      }
      return item;
    }),
    requests,
  });

  expect(result.toCancel.map(({ identifier }) => identifier)).toEqual(
    oldPlan.wanted
      .filter(({ itemId }) =>
        ["renamed", "retimed", "handled"].includes(itemId)
      )
      .map(({ identifier }) => identifier)
  );
  expect(result.toSchedule.map(({ itemId }) => itemId)).toEqual([
    "renamed",
    "retimed",
  ]);
  expect(result.toCancel.map(({ identifier }) => identifier)).not.toContain(
    "other-app:keep"
  );
});

it("제외 조건을 한 번 적용하고 30일 범위 뒤 첫 occurrence까지 포함한다", () => {
  const result = plan({
    items: [
      scheduleFixture({ id: "archived", isArchived: true }),
      scheduleFixture({ id: "disabled", notificationsEnabled: false }),
      scheduleFixture({ contentStatus: "unrecoverable", id: "unrecoverable" }),
      scheduleFixture({
        endDateLocal: "2026-04-20",
        id: "ended",
        startDateLocal: "2026-04-19",
      }),
      scheduleFixture({
        anchorType: "completion_based",
        id: "waiting",
        startDateLocal: "2026-04-20",
      }),
      scheduleFixture({
        id: "inside",
        recurrenceType: "once",
        startDateLocal: "2026-04-22",
      }),
      scheduleFixture({
        id: "first-after-range",
        recurrenceType: "once",
        startDateLocal: "2026-06-01",
      }),
    ],
  });

  expect(result.wanted.map(({ itemId }) => itemId)).toEqual([
    "inside",
    "first-after-range",
  ]);
  expect(result.wanted[1]?.scheduledAtUtc).toBe("2026-06-01T00:00:00.000Z");
});

it("다른 예약 두 개를 보존하고 가까운 똑딱 후보 58개만 고른다", () => {
  const result = plan({
    items: [
      scheduleFixture({ id: "daily-a", startDateLocal: "2026-04-21" }),
      scheduleFixture({ id: "daily-b", startDateLocal: "2026-04-21" }),
    ],
    requests: [request("other-app:1"), request("other-app:2")],
  });
  const times = result.wanted.map(({ scheduledAtUtc }) => scheduledAtUtc);

  expect(result.wanted).toHaveLength(58);
  expect(times).toEqual([...times].sort());
  expect(result.toCancel).toEqual([]);
});

function plan(input: Partial<Parameters<typeof planNotifications>[0]> = {}) {
  return planNotifications({
    completionLogs: [],
    items: [],
    language: "ko",
    now,
    requests: [],
    timezone,
    userId: "user-1",
    ...input,
  });
}

function request(identifier: string): NotificationRequest {
  return {
    content: {
      body: null,
      categoryIdentifier: null,
      data: {},
      sound: null,
      subtitle: null,
      title: null,
    },
    identifier,
    trigger: null,
  };
}

function toRequest(
  reminder: ReturnType<typeof planNotifications>["wanted"][number]
): NotificationRequest {
  return {
    ...request(reminder.identifier),
    content: {
      ...request(reminder.identifier).content,
      badge: reminder.badgeCount,
      body: reminder.body,
      title: reminder.title,
    },
  };
}
