import { colorByKey, type ColorKey } from "~/schedule/color";
import { scheduleFixture } from "~/schedule/fixtures";
import type { OccurrenceEntry, OccurrenceStatus } from "~/schedule/model";

import {
  buildCalendarDayEntries,
  buildCalendarDaySummaries,
  syncSelectedDateToTimezone,
} from "./calendar";

function createEntry({
  colorKey = "blue",
  id,
  localDate = "2026-04-12",
  scheduledAtUtc,
  status = "scheduled",
  title = id,
}: {
  colorKey?: ColorKey;
  id: string;
  localDate?: string;
  scheduledAtUtc: string;
  status?: OccurrenceStatus;
  title?: string;
}): OccurrenceEntry {
  return {
    occurrence: { localDate, scheduledAtUtc, status },
    schedule: scheduleFixture({
      colorHex: colorByKey[colorKey].swatchColor,
      id,
      title,
    }),
  };
}

it("시간대가 바뀌면 오늘을 보고 있을 때만 선택 날짜를 맞춘다", () => {
  const now = new Date("2026-05-01T06:30:00.000Z");

  expect(
    syncSelectedDateToTimezone({
      now,
      previousDate: "2026-05-01",
      previousTimezone: "Asia/Seoul",
      timezone: "America/Los_Angeles",
    })
  ).toBe("2026-04-30");
  expect(
    syncSelectedDateToTimezone({
      now,
      previousDate: "2026-04-20",
      previousTimezone: "Asia/Seoul",
      timezone: "America/Los_Angeles",
    })
  ).toBe("2026-04-20");
});

it("날짜 marker는 시간순으로 5개까지 표시하고 초과 개수를 계산한다", () => {
  const summaries = buildCalendarDaySummaries([
    createEntry({
      colorKey: "red",
      id: "sixth",
      scheduledAtUtc: "2026-04-12T05:00:00.000Z",
    }),
    createEntry({
      colorKey: "orange",
      id: "second",
      scheduledAtUtc: "2026-04-12T01:00:00.000Z",
    }),
    createEntry({
      colorKey: "yellow",
      id: "third",
      scheduledAtUtc: "2026-04-12T02:00:00.000Z",
    }),
    createEntry({
      colorKey: "green",
      id: "fourth",
      scheduledAtUtc: "2026-04-12T03:00:00.000Z",
    }),
    createEntry({
      colorKey: "blue",
      id: "first",
      scheduledAtUtc: "2026-04-12T00:00:00.000Z",
    }),
    createEntry({
      colorKey: "purple",
      id: "fifth",
      scheduledAtUtc: "2026-04-12T04:00:00.000Z",
    }),
  ]);

  expect(summaries["2026-04-12"]).toEqual({
    markerColors: ["#9DB7F5", "#F4BE8A", "#E8D86A", "#9FD4A5", "#D4A8EA"],
    overflowCount: 1,
  });
});

it("선택 날짜 일정은 시간과 제목 순으로 정렬하고 표시 값을 만든다", () => {
  const entries = buildCalendarDayEntries({
    entries: [
      createEntry({
        id: "late",
        scheduledAtUtc: "2026-04-12T01:00:00.000Z",
        status: "skipped",
        title: "나 일정",
      }),
      createEntry({
        colorKey: "purple",
        id: "early-b",
        scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        status: "completed",
        title: "나 일정",
      }),
      createEntry({
        id: "early-a",
        scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        status: "overdue",
        title: "가 일정",
      }),
      createEntry({
        id: "other-date",
        localDate: "2026-04-13",
        scheduledAtUtc: "2026-04-13T00:00:00.000Z",
      }),
    ],
    language: "ko",
    selectedDate: "2026-04-12",
    timezone: "Asia/Seoul",
    unavailableTitle: "일정 내용을 복구할 수 없어요",
  });

  expect(entries.map(({ itemId }) => itemId)).toEqual([
    "early-a",
    "early-b",
    "late",
  ]);
  expect(entries[1]).toEqual(
    expect.objectContaining({
      colorHex: "#D4A8EA",
      status: "completed",
      timeLabel: "오전 9:00",
      title: "나 일정",
    })
  );
});

it("복구할 수 없는 일정은 현재 언어의 대체 제목을 사용한다", () => {
  const [entry] = buildCalendarDayEntries({
    entries: [
      createEntry({
        id: "unrecoverable",
        scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        title: "",
      }),
    ].map((value) => ({
      ...value,
      schedule: { ...value.schedule, contentStatus: "unrecoverable" as const },
    })),
    language: "en",
    selectedDate: "2026-04-12",
    timezone: "Asia/Seoul",
    unavailableTitle: "Content unavailable",
  });

  expect(entry?.title).toBe("Content unavailable");
});
