import { createRecurringItemFixture } from "~/features/recurring/domain/recurring-test-fixtures";
import type { RecurringItem } from "~/features/recurring/domain/types";

import {
  buildReminderListEntries,
  formatReminderListNextOccurrenceTimeLabel,
} from "./reminder-list.helpers";

describe("reminder-list helpers", () => {
  it("내일 반복 일정의 다음 예정 시간만 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceTimeLabel(
        "2026-04-23T00:00:00.000Z",
        "Asia/Seoul"
      )
    ).toBe("오전 9:00");
  });

  it("오늘이고 아직 미래인 반복 예정일도 시간만 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceTimeLabel(
        "2026-04-22T00:00:00.000Z",
        "Asia/Seoul"
      )
    ).toBe("오전 9:00");
  });

  it("14일 이내 반복 예정일도 시간만 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceTimeLabel(
        "2026-04-25T00:00:00.000Z",
        "Asia/Seoul"
      )
    ).toBe("오전 9:00");
  });

  it("15일 이후 반복 예정일도 시간만 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceTimeLabel(
        "2026-05-11T23:00:00.000Z",
        "Asia/Seoul"
      )
    ).toBe("오전 8:00");
  });

  it("한 번 일정도 시간만 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceTimeLabel(
        "2026-05-11T23:00:00.000Z",
        "Asia/Seoul"
      )
    ).toBe("오전 8:00");
  });

  it("오늘 시간이 지난 반복 일정은 다음 발생을 표시한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "daily",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "매일 일정",
        }),
      ],
      now: new Date("2026-04-22T03:00:00.000Z"),
      timezone: "Asia/Seoul",
    });

    expect(entries[0]?.nextOccurrenceTimeLabel).toBe("오전 9:00");
  });

  it("다음 예정이 없는 일정은 예정 없음으로 표시한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "past-once",
          recurrenceType: "once",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "지난 한 번",
        }),
        createRecurringItem({
          id: "daily",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "매일 일정",
        }),
      ],
      now: new Date("2026-04-22T03:00:00.000Z"),
      sortMode: "titleAsc",
      timezone: "Asia/Seoul",
    });

    expect(
      entries.find((entry) => entry.id === "past-once")?.nextOccurrenceTimeLabel
    ).toBe("예정 없음");
  });

  it("종료일이 지나 다음 예정이 없는 반복 일정도 목록 row에서는 예정 없음으로 표시한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          endDateLocal: "2026-04-21",
          id: "ended-daily",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-20",
          title: "종료된 매일 일정",
        }),
      ],
      now: new Date("2026-04-22T03:00:00.000Z"),
      timezone: "Asia/Seoul",
    });

    expect(entries[0]?.nextOccurrenceTimeLabel).toBe("예정 없음");
    expect(entries[0]?.recurrenceLabel).toBe("매일");
  });

  it("일정 목록 entry는 일정 색상 key를 함께 제공한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          colorKey: "purple",
          id: "vitamin",
          title: "영양제",
        }),
      ],
      now: new Date("2026-04-22T00:00:00.000Z"),
      timezone: "Asia/Seoul",
    });

    expect(entries[0]?.colorKey).toBe("purple");
  });

  it("기본 정렬은 제목순이다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          createdAt: "2026-04-20T00:00:00.000Z",
          id: "beta",
          reminderTimeLocal: "12:00",
          title: "나중 제목",
        }),
        createRecurringItem({
          createdAt: "2026-04-21T00:00:00.000Z",
          id: "alpha",
          reminderTimeLocal: "10:00",
          title: "가장 앞 제목",
        }),
      ],
      now: new Date("2026-04-22T00:00:00.000Z"),
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["alpha", "beta"]);
  });

  it("생성순에서는 다음 예정이 없어도 생성일 기준으로 정렬한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          createdAt: "2026-04-20T00:00:00.000Z",
          id: "daily",
          title: "먼저 만든 일정",
        }),
        createRecurringItem({
          createdAt: "2026-04-21T00:00:00.000Z",
          id: "past-once",
          recurrenceType: "once",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-21",
          title: "나중에 만든 일정",
        }),
      ],
      now: new Date("2026-04-22T00:00:00.000Z"),
      sortMode: "createdDesc",
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["past-once", "daily"]);
  });

  it("제목순으로 정렬한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "beta",
          title: "청소",
        }),
        createRecurringItem({
          id: "alpha",
          title: "물 마시기",
        }),
      ],
      now: new Date("2026-04-22T00:00:00.000Z"),
      sortMode: "titleAsc",
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["alpha", "beta"]);
  });

  it("제목순에서는 다음 예정이 없어도 제목 기준으로 정렬한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "past-once",
          recurrenceType: "once",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "가장 앞 제목",
        }),
        createRecurringItem({
          id: "daily",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "하루 일정",
        }),
      ],
      now: new Date("2026-04-22T03:00:00.000Z"),
      sortMode: "titleAsc",
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["past-once", "daily"]);
  });
});

function createRecurringItem(
  overrides: Partial<RecurringItem> & Pick<RecurringItem, "id" | "title">
): RecurringItem {
  return createRecurringItemFixture({
    createdAt: "2026-04-20T00:00:00.000Z",
    startDateLocal: "2026-04-22",
    updatedAt: "2026-04-20T00:00:00.000Z",
    ...overrides,
  });
}
