import {
  createCompletionLogFixture as createCompletionLog,
  createRecurringItemFixture as createRecurringItem,
  createScheduleVersionFixture,
  recurringTestTimezone as timezone,
} from "~/entities/schedule/testing";

import { createLocalReminderNotificationProjection } from "./local-reminder-notification-projection";

describe("createLocalReminderNotificationProjection", () => {
  it("복구 불가 일정과 설명을 제외하고 기기 로컬 알림 후보를 만든다", () => {
    const result = createLocalReminderNotificationProjection({
      completionLogs: [],
      items: [
        createRecurringItem({
          description: "이 설명은 알림에 들어가면 안 됩니다",
          id: "item-1",
          recurrenceType: "once",
          reminderTimeLocal: "21:00",
          startDateLocal: "2026-04-21",
          title: "약 먹기",
        }),
        createRecurringItem({
          contentStatus: {
            reason: "decryption-failed",
            status: "unrecoverable",
          },
          id: "unrecoverable-item",
          recurrenceType: "once",
          startDateLocal: "2026-04-21",
          title: "복구 불가",
        }),
      ],
      language: "ko",
      now: new Date("2026-04-21T00:00:00.000Z"),
      timezone,
      userId: "user-1",
    });

    expect(result.notifications).toEqual([
      {
        body: "오후 9:00",
        identifier: "ttokttak:reminder:user-1:item-1:2026-04-21T12:00:00.000Z",
        itemId: "item-1",
        payload: {
          notificationKind: "reminder",
          source: "recurring-item",
        },
        scheduledAtUtc: "2026-04-21T12:00:00.000Z",
        title: "약 먹기",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain(
      "이 설명은 알림에 들어가면 안 됩니다"
    );
    expect(JSON.stringify(result)).not.toContain("복구 불가");
  });

  it("English 표시 언어에서는 제목은 유지하고 본문 시간만 English로 만든다", () => {
    const result = createLocalReminderNotificationProjection({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "item-1",
          recurrenceType: "once",
          reminderTimeLocal: "21:00",
          startDateLocal: "2026-04-21",
          title: "약 먹기",
        }),
      ],
      language: "en",
      now: new Date("2026-04-21T00:00:00.000Z"),
      timezone,
      userId: "user-1",
    });

    expect(result.notifications[0]).toMatchObject({
      body: "9:00 PM",
      title: "약 먹기",
    });
  });

  it("30일 범위 밖이어도 반복 일정의 다음 occurrence 1개를 후보로 만든다", () => {
    const result = createLocalReminderNotificationProjection({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "item-1",
          recurrenceType: "monthly",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-06-01",
          title: "월간 회고",
        }),
      ],
      language: "ko",
      now: new Date("2026-04-21T00:00:00.000Z"),
      timezone,
      userId: "user-1",
    });

    expect(
      result.notifications.map((candidate) => candidate.identifier)
    ).toEqual(["ttokttak:reminder:user-1:item-1:2026-06-01T00:00:00.000Z"]);
  });

  it("완료일 기준 반복은 미완료 occurrence가 있으면 다음 반복 알림 후보를 만들지 않는다", () => {
    const result = createLocalReminderNotificationProjection({
      completionLogs: [],
      items: [
        createRecurringItem({
          anchorType: "completion_based",
          id: "item-1",
          reminderTimeLocal: "21:00",
          startDateLocal: "2026-04-20",
          title: "스트레칭",
        }),
      ],
      language: "ko",
      now: new Date("2026-04-21T00:00:00.000Z"),
      timezone,
      userId: "user-1",
    });

    expect(result.notifications).toEqual([]);
  });

  it("완료일 기준 반복은 건너뜀 뒤 다음 occurrence 알림 후보를 만든다", () => {
    const result = createLocalReminderNotificationProjection({
      completionLogs: [
        createCompletionLog({
          action: "skipped",
          itemId: "item-1",
          scheduledAtUtc: "2026-04-20T12:00:00.000Z",
        }),
      ],
      items: [
        createRecurringItem({
          anchorType: "completion_based",
          id: "item-1",
          reminderTimeLocal: "21:00",
          startDateLocal: "2026-04-20",
          title: "스트레칭",
        }),
      ],
      language: "ko",
      now: new Date("2026-04-21T00:00:00.000Z"),
      timezone,
      userId: "user-1",
    });

    expect(result.notifications[0]?.identifier).toBe(
      "ttokttak:reminder:user-1:item-1:2026-04-21T12:00:00.000Z"
    );
    expect(result.notifications).toHaveLength(30);
  });

  it("종료일 이후 occurrence는 기기 로컬 알림 후보에서 제외한다", () => {
    const result = createLocalReminderNotificationProjection({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "item-1",
          scheduleVersions: [
            createScheduleVersionFixture({
              effectiveFromUtc: "2026-04-20T15:00:00.000Z",
              endDateLocal: "2026-04-22",
              id: "version-1",
              recurrenceType: "daily",
              reminderTimeLocal: "21:00",
              seedStartDateLocal: "2026-04-21",
            }),
          ],
          startDateLocal: "2026-04-21",
          title: "약 먹기",
        }),
      ],
      language: "ko",
      now: new Date("2026-04-21T00:00:00.000Z"),
      timezone,
      userId: "user-1",
    });

    expect(
      result.notifications.map((candidate) => candidate.scheduledAtUtc)
    ).toEqual(["2026-04-21T12:00:00.000Z", "2026-04-22T12:00:00.000Z"]);
  });
});
