import { getOccurrenceProjectionRequirement } from "./occurrence-projection-requirement";
import {
  createRecurringItemFixture as createItem,
  createScheduleVersionFixture as createVersion,
  recurringTestTimezone as timezone,
} from "./test-fixtures";

describe("occurrence projection requirement", () => {
  it("홈 피드 오늘 선택 시 projection과 completion log 조회 조건을 함께 정한다", () => {
    const requirement = getOccurrenceProjectionRequirement({
      items: [
        createItem({ id: "fixed-item" }),
        createItem({
          anchorType: "completion_based",
          id: "completion-based-item",
          recurrenceType: "interval_days",
        }),
        createItem({
          id: "current-version-completion-based-item",
          scheduleVersions: [
            createVersion({ itemId: "current-version-completion-based-item" }),
            createVersion({
              anchorType: "completion_based",
              effectiveFromUtc: "2026-04-05T00:00:00.000Z",
              id: "version-2",
              itemId: "current-version-completion-based-item",
              recurrenceType: "monthly",
            }),
          ],
        }),
      ],
      purpose: {
        now: new Date("2026-04-10T03:00:00.000Z"),
        selectedDateId: "2026-04-10",
        type: "homeFeed",
      },
      timezone,
    });

    expect(requirement.completionLogQuery).toEqual({
      anchorItemIds: [
        "completion-based-item",
        "current-version-completion-based-item",
      ],
      rangeEndUtc: "2026-04-24T14:59:59.999Z",
      rangeStartUtc: "2024-04-09T15:00:00.000Z",
    });
    expect(requirement.projection.selectedDateRange).toEqual({
      endUtc: "2026-04-10T14:59:59.999Z",
      startUtc: "2026-04-09T15:00:00.000Z",
    });
    expect(requirement.projection.overdueLookbackStartLocalDate).toBe(
      "2024-04-10"
    );
    expect(requirement.projection.upcomingRange).toEqual({
      endUtc: "2026-04-24T14:59:59.999Z",
      startUtc: "2026-04-10T15:00:00.000Z",
    });
  });

  it("홈 피드에서 오늘이 아닌 날짜 선택 시 해당 날짜 하루만 조회 조건으로 정한다", () => {
    const requirement = getOccurrenceProjectionRequirement({
      items: [createItem()],
      purpose: {
        now: new Date("2026-04-10T03:00:00.000Z"),
        selectedDateId: "2026-04-13",
        type: "homeFeed",
      },
      timezone,
    });

    expect(requirement.completionLogQuery).toEqual({
      anchorItemIds: [],
      rangeEndUtc: "2026-04-13T14:59:59.999Z",
      rangeStartUtc: "2026-04-12T15:00:00.000Z",
    });
    expect(requirement.projection.selectedDateRange).toEqual({
      endUtc: "2026-04-13T14:59:59.999Z",
      startUtc: "2026-04-12T15:00:00.000Z",
    });
    expect(requirement.projection.upcomingRange).toBeNull();
  });

  it("일정 목록은 오늘까지의 조회 범위와 완료일 기준 anchor 대상을 정한다", () => {
    const requirement = getOccurrenceProjectionRequirement({
      items: [
        createItem({ id: "fixed-item" }),
        createItem({
          anchorType: "completion_based",
          id: "completion-based-item",
          recurrenceType: "interval_months",
        }),
      ],
      purpose: {
        now: new Date("2026-04-10T03:00:00.000Z"),
        type: "scheduleList",
      },
      timezone,
    });

    expect(requirement.completionLogQuery).toEqual({
      anchorItemIds: ["completion-based-item"],
      rangeEndUtc: "2026-04-10T14:59:59.999Z",
      rangeStartUtc: "2024-04-09T15:00:00.000Z",
    });
    expect(requirement.projection.todayLocalDate).toBe("2026-04-10");
  });

  it("캘린더는 보이는 월 범위를 조회 조건으로 정한다", () => {
    const requirement = getOccurrenceProjectionRequirement({
      items: [
        createItem({
          anchorType: "completion_based",
          id: "completion-based-item",
          recurrenceType: "daily",
        }),
      ],
      purpose: {
        type: "calendarMonth",
        visibleMonth: "2026-04",
      },
      timezone,
    });

    expect(requirement.completionLogQuery).toEqual({
      anchorItemIds: ["completion-based-item"],
      rangeEndUtc: "2026-04-30T14:59:59.999Z",
      rangeStartUtc: "2026-03-31T15:00:00.000Z",
    });
    expect(requirement.projection.selectedMonthRange).toEqual({
      endUtc: "2026-04-30T14:59:59.999Z",
      startUtc: "2026-03-31T15:00:00.000Z",
    });
  });
});
