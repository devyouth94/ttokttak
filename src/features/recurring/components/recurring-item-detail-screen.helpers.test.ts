import {
  buildHistoryPreview,
  buildRecurringItemDetailViewModel,
  buildSummarySettingBadges,
  getItemDetailBasisOccurrence,
  shouldShowOccurrenceActions,
} from "~/features/recurring/components/recurring-item-detail-screen.helpers";
import type {
  CompletionLog,
  RecurringItem,
  RecurringItemScheduleVersion,
} from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    anchorType: "fixed",
    category: "건강",
    createdAt: "2026-04-01T00:00:00.000Z",
    description: "매일 아침 복용합니다.",
    id: "item-1",
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-04-08",
    timezone,
    title: "영양제",
    updatedAt: "2026-04-01T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}

function createLog(overrides: Partial<CompletionLog> = {}): CompletionLog {
  return {
    actedAtUtc: "2026-04-10T00:05:00.000Z",
    action: "completed",
    createdAt: "2026-04-10T00:05:00.000Z",
    deviceId: null,
    id: "log-1",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-10T00:00:00.000Z",
    userId: "user-1",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<RecurringItemScheduleVersion> = {}
): RecurringItemScheduleVersion {
  return {
    id: "version-1",
    itemId: "item-1",
    userId: "user-1",
    effectiveFromUtc: "2026-04-01T00:00:00.000Z",
    recurrenceType: "daily",
    intervalValue: null,
    weekdayMask: null,
    reminderTimeLocal: "09:00",
    anchorType: "fixed",
    seedStartDateLocal: "2026-04-08",
    notificationsEnabled: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("recurring item detail helpers", () => {
  it("overdue가 있으면 대표 상태로 overdue를 선택한다", () => {
    const item = createItem();

    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs: [],
      item,
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.primaryOccurrence?.status).toBe("overdue");
    expect(
      viewModel.overdueOccurrences.map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-09", "2026-04-08"]);
    expect(viewModel.statusCard.title).toBe("놓친 일정");
    expect(viewModel.statusCard.metaLabel).toBe("2건 밀림");
    expect(viewModel.statusCard.timeLabel).toBe("오전 9:00");
  });

  it("overdue가 없으면 가장 가까운 scheduled occurrence를 다음 일정으로 사용한다", () => {
    const item = createItem({
      recurrenceType: "interval_days",
      intervalValue: 3,
      startDateLocal: "2026-04-10",
    });
    const completionLogs = [
      createLog({
        scheduledAtUtc: "2026-04-10T00:00:00.000Z",
      }),
    ];

    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs,
      item,
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.overdueOccurrences).toHaveLength(0);
    expect(viewModel.primaryOccurrence?.status).toBe("scheduled");
    expect(viewModel.nextOccurrence?.localDate).toBe("2026-04-13");
    expect(viewModel.statusCard.title).toBe("다음 일정");
    expect(viewModel.statusCard.metaLabel).toBe("3일 후");
    expect(viewModel.statusCard.timeLabel).toBe("오전 9:00");
  });

  it("one-time 완료 후 후속 일정이 없으면 다음 일정 없음 상태를 만든다", () => {
    const item = createItem({
      recurrenceType: "once",
      startDateLocal: "2026-04-10",
    });
    const completionLogs = [
      createLog({
        scheduledAtUtc: "2026-04-10T00:00:00.000Z",
      }),
    ];

    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs,
      item,
      now: new Date("2026-04-11T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.primaryOccurrence).toBeNull();
    expect(viewModel.nextOccurrence).toBeNull();
    expect(viewModel.statusCard.title).toBe("다음 일정 없음");
    expect(viewModel.statusCard.dateLabel).toBe("없음");
  });

  it("최근 히스토리 3건만 최신 예정 시각 순으로 만든다", () => {
    const entries = buildHistoryPreview(
      [
        createLog({
          id: "log-1",
          scheduledAtUtc: "2026-04-08T00:00:00.000Z",
        }),
        createLog({
          action: "skipped",
          id: "log-2",
          scheduledAtUtc: "2026-04-10T00:00:00.000Z",
        }),
        createLog({
          id: "log-3",
          scheduledAtUtc: "2026-04-09T00:00:00.000Z",
        }),
        createLog({
          id: "log-4",
          scheduledAtUtc: "2026-04-07T00:00:00.000Z",
        }),
      ],
      timezone
    );

    expect(entries.map((entry) => entry.id)).toEqual([
      "log-2",
      "log-3",
      "log-1",
    ]);
    expect(entries[0]?.statusLabel).toBe("건너뜀");
  });

  it("요약 설정 뱃지를 상세 화면 기준으로 만든다", () => {
    const entries = buildSummarySettingBadges(
      createItem({
        anchorType: "completion_based",
        createdAt: "2026-04-01T00:00:00.000Z",
        notificationsEnabled: false,
        recurrenceType: "weekly",
        weekdayMask: [1, 4],
      })
    );

    expect(entries).toEqual([
      { id: "start-date", label: "시작", value: "2026년 4월 8일" },
      {
        id: "anchor-type",
        label: "계산",
        value: "완료일 기준",
      },
    ]);
  });

  it("시작일 기준 일정은 계산 뱃지를 숨긴다", () => {
    const entries = buildSummarySettingBadges(
      createItem({
        anchorType: "fixed",
      })
    );

    expect(entries.map((entry) => entry.id)).toEqual(["start-date"]);
  });

  it("대표 상태가 overdue면 액션 버튼을 노출한다", () => {
    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs: [],
      item: createItem(),
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(
      shouldShowOccurrenceActions({
        occurrence: viewModel.primaryOccurrence,
        now: new Date("2026-04-10T03:00:00.000Z"),
        timezone,
      })
    ).toBe(true);
  });

  it("대표 상태가 오늘 scheduled면 액션 버튼을 노출한다", () => {
    expect(
      shouldShowOccurrenceActions({
        occurrence: {
          itemId: "item-1",
          localDate: "2026-04-10",
          localTime: "09:00",
          scheduledAtLocal: "2026-04-10T09:00:00",
          scheduledAtUtc: "2026-04-10T00:00:00.000Z",
          status: "scheduled",
        },
        now: new Date("2026-04-10T03:00:00.000Z"),
        timezone,
      })
    ).toBe(true);
  });

  it("미래 일정만 남아 있으면 액션 버튼을 숨긴다", () => {
    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs: [
        createLog({
          scheduledAtUtc: "2026-04-10T00:00:00.000Z",
        }),
      ],
      item: createItem({
        recurrenceType: "interval_days",
        intervalValue: 3,
        startDateLocal: "2026-04-10",
      }),
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.primaryOccurrence?.status).toBe("scheduled");
    expect(viewModel.primaryOccurrence?.localDate).toBe("2026-04-13");
    expect(
      shouldShowOccurrenceActions({
        occurrence: viewModel.primaryOccurrence,
        now: new Date("2026-04-10T03:00:00.000Z"),
        timezone,
      })
    ).toBe(false);
  });

  it("대표 상태가 completed면 액션 버튼을 숨긴다", () => {
    expect(
      shouldShowOccurrenceActions({
        occurrence: {
          itemId: "item-1",
          localDate: "2026-04-10",
          localTime: "09:00",
          scheduledAtLocal: "2026-04-10T09:00:00",
          scheduledAtUtc: "2026-04-10T00:00:00.000Z",
          status: "completed",
        },
        now: new Date("2026-04-10T03:00:00.000Z"),
        timezone,
      })
    ).toBe(false);
  });

  it("대표 상태가 skipped면 액션 버튼을 숨긴다", () => {
    expect(
      shouldShowOccurrenceActions({
        occurrence: {
          itemId: "item-1",
          localDate: "2026-04-10",
          localTime: "09:00",
          scheduledAtLocal: "2026-04-10T09:00:00",
          scheduledAtUtc: "2026-04-10T00:00:00.000Z",
          status: "skipped",
        },
        now: new Date("2026-04-10T03:00:00.000Z"),
        timezone,
      })
    ).toBe(false);
  });

  it("대표 occurrence가 없으면 액션 버튼을 숨긴다", () => {
    expect(
      shouldShowOccurrenceActions({
        occurrence: null,
        now: new Date("2026-04-10T03:00:00.000Z"),
        timezone,
      })
    ).toBe(false);
  });

  it("선택된 completion log occurrence를 기준 occurrence로 사용한다", () => {
    const item = createItem();
    const completionLogs = [
      createLog({
        action: "completed",
        scheduledAtUtc: "2026-04-13T00:00:00.000Z",
      }),
    ];
    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs,
      item,
      now: new Date("2026-04-14T03:00:00.000Z"),
      timezone,
    });

    const basisOccurrence = getItemDetailBasisOccurrence({
      completionLogs,
      item,
      now: new Date("2026-04-14T03:00:00.000Z"),
      primaryOccurrence: viewModel.primaryOccurrence,
      scheduledAtUtc: "2026-04-13T00:00:00.000Z",
      timezone,
    });

    expect(basisOccurrence?.status).toBe("completed");
    expect(basisOccurrence?.localDate).toBe("2026-04-13");
    expect(
      shouldShowOccurrenceActions({
        occurrence: basisOccurrence ?? null,
        now: new Date("2026-04-14T03:00:00.000Z"),
        timezone,
      })
    ).toBe(false);
  });

  it("상세 화면도 latest schedule version 기준 현재 규칙과 다음 일정을 보여준다", () => {
    const item = createItem({
      intervalValue: 3,
      recurrenceType: "interval_days",
      reminderTimeLocal: "09:00",
      scheduleVersions: [
        createVersion({
          id: "version-1",
          intervalValue: 3,
          recurrenceType: "interval_days",
          seedStartDateLocal: "2026-04-08",
        }),
        createVersion({
          effectiveFromUtc: "2026-04-14T01:00:00.000Z",
          id: "version-2",
          intervalValue: 4,
          recurrenceType: "interval_days",
          reminderTimeLocal: "21:30",
          seedStartDateLocal: "2026-04-16",
        }),
      ],
    });

    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs: [],
      item,
      now: new Date("2026-04-14T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.nextOccurrence?.localDate).toBe("2026-04-16");
    expect(viewModel.nextOccurrence?.localTime).toBe("21:30");
    expect(viewModel.summary.notificationLabel).toBe("오후 9:30");
    expect(viewModel.summary.recurrenceLabel).toBe("4일마다");
    expect(viewModel.summary.notificationsEnabled).toBe(true);
  });
});
