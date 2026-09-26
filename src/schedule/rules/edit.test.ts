import { resolveEdit } from "./edit";
import { createOccurrences } from "./occurrence";
import {
  logFixture,
  scheduleFixture,
  testTimezone as timezone,
} from "../fixtures";
import { toUtcRange } from "../local-date";
import type { Schedule } from "../model";

describe("resolveEdit", () => {
  const now = new Date("2026-05-07T03:00:00.000Z");

  it("동일 입력은 결과가 없고 메타 변경은 규칙 버전을 만들지 않는다", () => {
    const item = scheduleFixture({ startDateLocal: "2026-05-01" });

    expect(
      resolveEdit({ completionLogs: [], input: {}, item, now, timezone })
    ).toBeNull();
    expect(
      resolveEdit({
        completionLogs: [],
        input: {
          colorHex: "#123456",
          description: "설명",
          title: "새 제목",
        },
        item,
        now,
        timezone,
      })
    ).toEqual({
      item: {
        colorHex: "#123456",
        description: "설명",
        title: "새 제목",
      },
      version: null,
    });
  });

  it.each([
    ["알림 사용 여부", { notificationsEnabled: false }],
    ["종료일", { endDateLocal: "2026-05-20" }],
  ] as const)("%s 변경은 새 규칙 버전을 만든다", (_label, input) => {
    expect(
      resolveEdit({
        completionLogs: [],
        input,
        item: scheduleFixture({ startDateLocal: "2026-05-01" }),
        now,
        timezone,
      })?.version
    ).not.toBeNull();
  });

  it("알림 시각 변경 전 occurrence와 기록은 보존하고 이후에 새 규칙을 적용한다", () => {
    const item = scheduleFixture({
      reminderTimeLocal: "09:00",
      startDateLocal: "2026-05-05",
    });
    const completionLogs = [
      logFixture({
        actedAtUtc: "2026-05-06T01:00:00.000Z",
        scheduledAtUtc: "2026-05-06T00:00:00.000Z",
      }),
    ];
    const edit = resolveEdit({
      completionLogs,
      input: { reminderTimeLocal: "21:00" },
      item,
      now,
      timezone,
    });

    expect(edit?.version).not.toBeNull();
    const edited: Schedule = {
      ...item,
      versions: [item.versions[0], ...item.versions.slice(1), edit!.version!],
    };
    const occurrences = createOccurrences({
      logs: completionLogs,
      now,
      schedules: [edited],
      timezone,
    }).range({
      endUtc: toUtcRange("2026-05-08", timezone).endUtc,
      startUtc: toUtcRange("2026-05-05", timezone).startUtc,
    });

    expect(
      occurrences.map(({ occurrence }) => [
        occurrence.scheduledAtUtc,
        occurrence.status,
      ])
    ).toEqual([
      ["2026-05-05T00:00:00.000Z", "overdue"],
      ["2026-05-06T00:00:00.000Z", "completed"],
      ["2026-05-07T00:00:00.000Z", "scheduled"],
      ["2026-05-07T12:00:00.000Z", "scheduled"],
      ["2026-05-08T12:00:00.000Z", "scheduled"],
    ]);
  });

  it("적용 시각과 같은 occurrence는 새 버전에 한 번만 포함한다", () => {
    const effectiveAtOccurrence = new Date("2026-05-07T00:00:00.000Z");
    const item = scheduleFixture({ startDateLocal: "2026-05-05" });
    const edit = resolveEdit({
      completionLogs: [],
      input: { notificationsEnabled: false },
      item,
      now: effectiveAtOccurrence,
      timezone,
    });
    const edited: Schedule = {
      ...item,
      versions: [item.versions[0], ...item.versions.slice(1), edit!.version!],
    };

    expect(
      createOccurrences({
        logs: [],
        now: effectiveAtOccurrence,
        schedules: [edited],
        timezone,
      })
        .range(toUtcRange("2026-05-07", timezone))
        .map(({ occurrence }) => occurrence.scheduledAtUtc)
    ).toEqual(["2026-05-07T00:00:00.000Z"]);
  });

  it("새 종료일을 오늘 이전으로 설정하면 저장 전에 거절한다", () => {
    expect(() =>
      resolveEdit({
        completionLogs: [],
        input: { endDateLocal: "2026-05-06" },
        item: scheduleFixture({ startDateLocal: "2026-05-01" }),
        now,
        timezone,
      })
    ).toThrow();
  });
});
