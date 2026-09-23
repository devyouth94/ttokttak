import type { NotificationRequest } from "expo-notifications";

import {
  logFixture,
  scheduleFixture as createItem,
  testTimezone as timezone,
} from "~/schedule/fixtures";

import { planNotifications } from "./plan";

const now = new Date("2026-04-21T00:00:00.000Z");

describe("알림 계획", () => {
  it("앱을 다시 열지 않아도 각 예약 시각의 처리 필요 수를 배지로 전달한다", () => {
    const items = [
      createItem({
        id: "past",
        recurrenceType: "once",
        startDateLocal: "2026-04-20",
        notificationsEnabled: false,
      }),
      createItem({
        id: "morning",
        recurrenceType: "once",
        startDateLocal: "2026-04-21",
        reminderTimeLocal: "10:00",
      }),
      createItem({
        id: "evening",
        recurrenceType: "once",
        startDateLocal: "2026-04-21",
        reminderTimeLocal: "18:00",
      }),
    ];
    const result = plan({ items });
    expect(result.badgeCount).toBe(1);
    expect(result.wanted.map(({ badgeCount }) => badgeCount)).toEqual([2, 3]);
  });

  it("배지의 730일 경계·자정·같은 시각 예약을 처리한다", () => {
    const items = [
      createItem({
        id: "boundary",
        recurrenceType: "once",
        startDateLocal: "2024-04-21",
        notificationsEnabled: false,
      }),
      createItem({
        id: "expired",
        recurrenceType: "once",
        startDateLocal: "2024-04-20",
        notificationsEnabled: false,
      }),
      ...["a", "b"].map((id) =>
        createItem({
          id,
          recurrenceType: "once",
          startDateLocal: "2026-04-22",
          reminderTimeLocal: "00:00",
        })
      ),
    ];
    const result = plan({ items, now: new Date("2026-04-21T14:59:00.000Z") });
    expect(result.badgeCount).toBe(1);
    expect(result.wanted.map(({ badgeCount }) => badgeCount)).toEqual([2, 2]);
  });

  it("다른 예약을 보존하고 남은 슬롯만 가까운 순서로 사용한다", () => {
    const requests = Array.from({ length: 59 }, (_, index) =>
      request(`other:${index}`)
    );
    const items = [createItem({ startDateLocal: "2026-04-21" })];
    const result = plan({ items, requests });
    expect(result.toCancel).toEqual([]);
    expect(result.wanted).toHaveLength(1);
    expect(result.wanted[0]?.scheduledAtUtc).toBe(now.toISOString());
    expect(
      plan({ items, requests: [...requests, request("other:last")] }).wanted
    ).toEqual([]);
  });

  it("일치하는 예약은 유지하고 제목·언어·배지가 달라진 예약만 교체한다", () => {
    const items = [
      createItem({ recurrenceType: "once", startDateLocal: "2026-04-21" }),
    ];
    const first = plan({ items }).wanted[0]!;
    const requests = [
      request(first.identifier, {
        title: first.title,
        body: first.body,
        badge: first.badgeCount,
      }),
    ];
    expect(plan({ items, requests })).toMatchObject({
      toCancel: [],
      toSchedule: [],
    });
    for (const result of [
      plan({ items: [{ ...items[0]!, title: "새 제목" }], requests }),
      plan({ items, requests, language: "en" }),
      plan({
        items,
        requests: [
          request(first.identifier, {
            title: first.title,
            body: first.body,
            badge: 99,
          }),
        ],
      }),
    ]) {
      expect(result.toCancel).toHaveLength(1);
      expect(result.toSchedule).toHaveLength(1);
    }
  });

  it("30일 경계 occurrence는 중복하지 않고 종료일 이후 예약은 만들지 않는다", () => {
    const result = plan({
      items: [
        createItem({
          startDateLocal: "2026-04-21",
          endDateLocal: "2026-05-21",
        }),
      ],
    });
    expect(result.wanted).toHaveLength(31);
    expect(result.wanted.at(-1)?.scheduledAtUtc).toBe(
      "2026-05-21T00:00:00.000Z"
    );
    expect(
      new Set(result.wanted.map(({ identifier }) => identifier)).size
    ).toBe(31);
  });
  it("지난 일정은 일정별 하나로 접고 알림 시각이 지난 오늘 occurrence를 센다", () => {
    const times = [
      new Date("2026-04-20T23:00:00.000Z"),
      new Date("2026-04-21T03:00:00.000Z"),
      new Date("2026-04-22T03:00:00.000Z"),
    ];
    const badges = times.map(
      (time) =>
        plan({
          completionLogs: [
            logFixture({
              action: "skipped",
              itemId: "skipped",
              scheduledAtUtc: "2026-04-20T00:00:00.000Z",
            }),
          ],
          items: [
            createItem({
              id: "daily",
              startDateLocal: "2026-04-19",
            }),
            createItem({
              id: "disabled",
              notificationsEnabled: false,
              recurrenceType: "once",
              reminderTimeLocal: "10:00",
              startDateLocal: "2026-04-21",
            }),
            createItem({
              id: "future",
              recurrenceType: "once",
              reminderTimeLocal: "18:00",
              startDateLocal: "2026-04-21",
            }),
            createItem({
              id: "skipped",
              recurrenceType: "once",
              startDateLocal: "2026-04-20",
            }),
          ],
          now: time,
        }).badgeCount
    );

    expect(badges).toEqual([1, 3, 4]);
  });

  it("30일 범위와 그 이후 첫 알림의 표시 내용을 만든다", () => {
    const { wanted: candidates } = plan({
      completionLogs: [],
      items: [
        createItem({
          description: "복용 설명",
          id: "item-1",
          reminderTimeLocal: "21:00",
          startDateLocal: "2026-04-21",
          title: "약 먹기",
        }),
        createItem({
          id: "item-2",
          recurrenceType: "monthly",
          startDateLocal: "2026-06-01",
          title: "월간 점검",
        }),
      ],
      language: "ko",
      now,
      timezone,
    });

    expect(candidates).toHaveLength(32);
    expect(
      candidates.filter(({ itemId }) => itemId === "item-1").at(-1)
        ?.scheduledAtUtc
    ).toBe("2026-05-21T12:00:00.000Z");
    expect(candidates[0]).toMatchObject({
      body: "오후 9:00",
      itemId: "item-1",
      scheduledAtUtc: "2026-04-21T12:00:00.000Z",
      title: "약 먹기",
    });
    expect(candidates.at(-1)).toMatchObject({
      body: "오전 9:00",
      itemId: "item-2",
      scheduledAtUtc: "2026-06-01T00:00:00.000Z",
      title: "월간 점검",
    });
  });

  it("예약할 수 없거나 완료를 기다리는 일정은 제외한다", () => {
    const { wanted: candidates } = plan({
      completionLogs: [],
      items: [
        createItem({ id: "archived", isArchived: true }),
        createItem({ id: "disabled", notificationsEnabled: false }),
        createItem({
          contentStatus: "unrecoverable",
          id: "unrecoverable",
        }),
        createItem({
          anchorType: "completion_based",
          id: "waiting",
          reminderTimeLocal: "21:00",
          startDateLocal: "2026-04-20",
        }),
      ],
      language: "ko",
      now,
      timezone,
    });

    expect(candidates).toEqual([]);
  });
});

function plan(input: Partial<Parameters<typeof planNotifications>[0]> = {}) {
  return planNotifications({
    items: [],
    completionLogs: [],
    language: "ko",
    now,
    timezone,
    userId: "user-1",
    requests: [],
    ...input,
  });
}

function request(
  identifier: string,
  content: { title?: string; body?: string; badge?: number } = {}
): NotificationRequest {
  return {
    identifier,
    trigger: null,
    content: {
      title: null,
      body: null,
      subtitle: null,
      categoryIdentifier: null,
      data: {},
      sound: null,
      ...content,
    },
  };
}
