import { getHomeFeedOccurrenceProjectionRequirement } from "~/features/home/domain/home-feed-occurrence-projection";
import type {
  RecurringItem,
  RecurringItemScheduleVersion,
} from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    anchorType: "fixed",
    colorKey: "blue",
    createdAt: "2026-04-01T00:00:00.000Z",
    description: null,
    id: "item-1",
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-04-10",
    timezone,
    title: "테스트 일정",
    updatedAt: "2026-04-01T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<RecurringItemScheduleVersion> = {}
): RecurringItemScheduleVersion {
  return {
    anchorType: "fixed",
    createdAt: "2026-04-01T00:00:00.000Z",
    effectiveFromUtc: "2026-04-01T00:00:00.000Z",
    id: "version-1",
    intervalValue: null,
    itemId: "item-1",
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    seedStartDateLocal: "2026-04-10",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}

describe("home feed occurrence projection", () => {
  it("오늘 선택 시 홈 피드에 필요한 completion log 범위와 anchor 대상을 함께 정한다", () => {
    const requirement = getHomeFeedOccurrenceProjectionRequirement({
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
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-10",
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

  it("오늘이 아닌 날짜 선택 시 해당 날짜 하루만 조회 요구사항으로 정한다", () => {
    const requirement = getHomeFeedOccurrenceProjectionRequirement({
      items: [createItem()],
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-13",
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
});
