import {
  logFixture,
  scheduleFixture as createItem,
  testTimezone as timezone,
} from "~/schedule/fixtures";

import { getBadgeCounts, getCandidates } from "./candidates";

const now = new Date("2026-04-21T00:00:00.000Z");

describe("알림 후보", () => {
  it("지난 일정은 일정별 하나로 접고 알림 시각이 지난 오늘 occurrence를 센다", () => {
    const times = [
      new Date("2026-04-20T23:00:00.000Z"),
      new Date("2026-04-21T03:00:00.000Z"),
      new Date("2026-04-22T03:00:00.000Z"),
    ];
    const badgeCounts = getBadgeCounts({
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
      times,
      timezone,
    });

    expect(badgeCounts).toEqual(
      new Map([
        [times[0]!.toISOString(), 1],
        [times[1]!.toISOString(), 3],
        [times[2]!.toISOString(), 4],
      ])
    );
  });

  it("30일 범위와 그 이후 첫 알림의 표시 내용을 만든다", () => {
    const candidates = getCandidates({
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

    expect(candidates).toHaveLength(31);
    expect(candidates[0]).toEqual({
      body: "오후 9:00",
      itemId: "item-1",
      scheduledAtUtc: "2026-04-21T12:00:00.000Z",
      title: "약 먹기",
    });
    expect(candidates.at(-1)).toEqual({
      body: "오전 9:00",
      itemId: "item-2",
      scheduledAtUtc: "2026-06-01T00:00:00.000Z",
      title: "월간 점검",
    });
  });

  it("예약할 수 없거나 완료를 기다리는 일정은 제외한다", () => {
    const candidates = getCandidates({
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
