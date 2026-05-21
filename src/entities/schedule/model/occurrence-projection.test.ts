import {
  createItemOccurrenceProjection,
  createLocalDateUtcRange,
  getItemOccurrenceEntriesInRange,
  getLatestOverdueItemOccurrenceEntries,
  getNextItemOccurrenceEntries,
  getScheduledItemOccurrenceEntriesInRange,
} from "./occurrence-projection";
import {
  createCompletionLogFixture as createLog,
  createRecurringItemFixture as createItem,
  recurringTestTimezone as timezone,
} from "./test-fixtures";

describe("occurrence projection", () => {
  it("local date range를 timezone 기준 UTC range로 바꾼다", () => {
    expect(createLocalDateUtcRange("2026-04-12", timezone)).toEqual({
      endUtc: "2026-04-12T14:59:59.999Z",
      startUtc: "2026-04-11T15:00:00.000Z",
    });
  });

  it("일정 하나 기준 range occurrence와 scheduled occurrence를 고른다", () => {
    const projection = createItemOccurrenceProjection({
      completionLogs: [],
      item: createItem(),
      now: new Date("2026-04-12T03:00:00.000Z"),
      timezone,
    });
    const range = {
      endUtc: createLocalDateUtcRange("2026-04-12", timezone).endUtc,
      startUtc: createLocalDateUtcRange("2026-04-10", timezone).startUtc,
    };

    expect(
      projection
        .getOccurrencesInRange(range)
        .map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-10", "2026-04-11", "2026-04-12"]);
    expect(
      projection
        .getScheduledOccurrencesInRange(range)
        .map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-12"]);
  });

  it("overdue occurrence는 기본 오름차순이고 최신 overdue도 제공한다", () => {
    const projection = createItemOccurrenceProjection({
      completionLogs: [],
      item: createItem(),
      now: new Date("2026-04-12T03:00:00.000Z"),
      timezone,
    });

    expect(
      projection
        .getOverdueOccurrences({ lookbackStartLocalDate: "2026-04-10" })
        .map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-10", "2026-04-11"]);
    expect(
      projection.getLatestOverdueOccurrence({
        lookbackStartLocalDate: "2026-04-10",
      })?.localDate
    ).toBe("2026-04-11");
  });

  it("다음 occurrence와 상세 진입 맥락 occurrence를 고른다", () => {
    const projection = createItemOccurrenceProjection({
      completionLogs: [createLog()],
      item: createItem(),
      now: new Date("2026-04-12T03:00:00.000Z"),
      timezone,
    });

    expect(projection.getNextOccurrence()?.localDate).toBe("2026-04-13");
    expect(
      projection.getBasisOccurrence({
        scheduledAtUtc: "2026-04-11T00:00:00.000Z",
      })
    ).toMatchObject({
      localDate: "2026-04-11",
      status: "completed",
    });
  });

  it("여러 일정의 range occurrence를 item과 함께 고른다", () => {
    const range = {
      endUtc: createLocalDateUtcRange("2026-04-12", timezone).endUtc,
      startUtc: createLocalDateUtcRange("2026-04-12", timezone).startUtc,
    };
    const entries = getItemOccurrenceEntriesInRange({
      completionLogs: [
        createLog({
          itemId: "completed-item",
          scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        }),
      ],
      items: [
        createItem({
          id: "completed-item",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-12",
          title: "완료 일정",
        }),
        createItem({
          id: "scheduled-item",
          reminderTimeLocal: "18:00",
          startDateLocal: "2026-04-12",
          title: "예정 일정",
        }),
      ],
      now: new Date("2026-04-12T03:00:00.000Z"),
      range,
      timezone,
    });

    expect(
      entries.map(({ item, occurrence }) => [
        item.id,
        occurrence.localDate,
        occurrence.status,
      ])
    ).toEqual([
      ["completed-item", "2026-04-12", "completed"],
      ["scheduled-item", "2026-04-12", "scheduled"],
    ]);
  });

  it("여러 일정에서 scheduled range occurrence만 고른다", () => {
    const range = {
      endUtc: createLocalDateUtcRange("2026-04-12", timezone).endUtc,
      startUtc: createLocalDateUtcRange("2026-04-12", timezone).startUtc,
    };
    const entries = getScheduledItemOccurrenceEntriesInRange({
      completionLogs: [
        createLog({
          itemId: "completed-item",
          scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        }),
      ],
      items: [
        createItem({
          id: "completed-item",
          startDateLocal: "2026-04-12",
        }),
        createItem({
          id: "scheduled-item",
          reminderTimeLocal: "18:00",
          startDateLocal: "2026-04-12",
        }),
      ],
      now: new Date("2026-04-12T03:00:00.000Z"),
      range,
      timezone,
    });

    expect(entries.map(({ item }) => item.id)).toEqual(["scheduled-item"]);
  });

  it("여러 일정에서 일정별 최신 overdue와 다음 occurrence를 고른다", () => {
    const items = [
      createItem({
        id: "overdue-item",
        startDateLocal: "2026-04-10",
      }),
      createItem({
        id: "future-once-item",
        recurrenceType: "once",
        startDateLocal: "2026-04-14",
      }),
    ];
    const now = new Date("2026-04-12T03:00:00.000Z");

    expect(
      getLatestOverdueItemOccurrenceEntries({
        completionLogs: [],
        items,
        lookbackStartLocalDate: "2026-04-10",
        now,
        timezone,
      }).map(({ item, occurrence }) => [item.id, occurrence.localDate])
    ).toEqual([["overdue-item", "2026-04-11"]]);
    expect(
      getNextItemOccurrenceEntries({
        completionLogs: [],
        items,
        now,
        timezone,
      }).map(({ item, occurrence }) => [item.id, occurrence?.localDate ?? null])
    ).toEqual([
      ["overdue-item", "2026-04-13"],
      ["future-once-item", "2026-04-14"],
    ]);
  });
});
