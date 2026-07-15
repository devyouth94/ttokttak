import type {
  DerivedOccurrence,
  ItemNextOccurrenceProjectionEntry,
  RecurringItem,
} from "~/entities/schedule";
import {
  createRecurringItemFixture,
  type RecurringItemFixtureOverrides,
} from "~/entities/schedule/testing";

import { buildScheduleListEntries } from "./schedule-list-entries";

describe("schedule-list entries", () => {
  it("English 모드에서는 다음 예정 시간, 반복, 예정 없음 라벨을 English로 표시한다", () => {
    const entries = buildScheduleListEntries({
      language: "en",
      nextOccurrenceEntries: [
        createEntry({
          item: createRecurringItem({
            id: "weekly",
            recurrenceType: "weekly",
            title: "한국어 제목",
            weekdayMask: [1, 3],
          }),
          occurrence: createOccurrence({ itemId: "weekly" }),
        }),
        createEntry({
          item: createRecurringItem({
            id: "past-once",
            recurrenceType: "once",
            title: "지난 한 번",
          }),
        }),
      ],
      timezone: "Asia/Seoul",
    });

    expect(entries.find((entry) => entry.id === "weekly")).toMatchObject({
      nextOccurrenceTimeLabel: "9:00 AM",
      recurrenceLabel: "Weekly Mon·Wed",
      title: "한국어 제목",
    });
    expect(
      entries.find((entry) => entry.id === "past-once")?.nextOccurrenceTimeLabel
    ).toBe("No upcoming time");
  });

  it("한국어 모드에서는 다음 예정 없음과 일정 색상 key를 제공한다", () => {
    const entries = buildScheduleListEntries({
      language: "ko",
      nextOccurrenceEntries: [
        createEntry({
          item: createRecurringItem({
            colorKey: "purple",
            id: "vitamin",
            title: "영양제",
          }),
        }),
      ],
      timezone: "Asia/Seoul",
    });

    expect(entries[0]).toMatchObject({
      colorKey: "purple",
      nextOccurrenceTimeLabel: "예정 없음",
      nextScheduledAtUtc: null,
      title: "영양제",
    });
  });

  it("기본 정렬은 제목순이고 생성순 정렬을 선택할 수 있다", () => {
    const nextOccurrenceEntries = [
      createEntry({
        item: createRecurringItem({
          createdAt: "2026-04-20T00:00:00.000Z",
          id: "alpha",
          title: "가장 앞 제목",
        }),
      }),
      createEntry({
        item: createRecurringItem({
          createdAt: "2026-04-21T00:00:00.000Z",
          id: "beta",
          title: "나중 제목",
        }),
      }),
    ];

    expect(
      buildScheduleListEntries({
        language: "ko",
        nextOccurrenceEntries,
        timezone: "Asia/Seoul",
      }).map((entry) => entry.id)
    ).toEqual(["alpha", "beta"]);
    expect(
      buildScheduleListEntries({
        language: "ko",
        nextOccurrenceEntries,
        sortMode: "createdDesc",
        timezone: "Asia/Seoul",
      }).map((entry) => entry.id)
    ).toEqual(["beta", "alpha"]);
  });
});

function createRecurringItem(
  overrides: RecurringItemFixtureOverrides & Pick<RecurringItem, "id" | "title">
): RecurringItem {
  return createRecurringItemFixture({
    createdAt: "2026-04-20T00:00:00.000Z",
    startDateLocal: "2026-04-22",
    updatedAt: "2026-04-20T00:00:00.000Z",
    ...overrides,
  });
}

function createOccurrence(
  overrides: Partial<DerivedOccurrence> & Pick<DerivedOccurrence, "itemId">
): DerivedOccurrence {
  return {
    localDate: "2026-04-22",
    localTime: "09:00",
    scheduledAtLocal: "2026-04-22T09:00:00+09:00",
    scheduledAtUtc: "2026-04-22T00:00:00.000Z",
    status: "scheduled",
    ...overrides,
  };
}

function createEntry({
  item,
  occurrence = null,
}: {
  item: RecurringItem;
  occurrence?: DerivedOccurrence | null;
}): ItemNextOccurrenceProjectionEntry {
  return {
    item,
    occurrence,
  };
}
