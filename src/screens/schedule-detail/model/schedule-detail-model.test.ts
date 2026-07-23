import {
  logFixture,
  ruleFixture,
  scheduleFixture,
  type ScheduleOverrides,
  testTimezone as timezone,
} from "~/schedule/fixtures";
import type { OccurrenceLog } from "~/schedule/rules/occurrence";
import type { RuleVersion } from "~/schedule/rules/recurrence";
import type { Schedule } from "~/schedule/schedule";

import {
  buildHistoryPreview,
  buildRecurringItemDetailViewModel,
  buildSummarySettingBadges,
  getRecurringItemDetailDeleteReturnPath,
} from "./schedule-detail-model";

function createItem(overrides: ScheduleOverrides = {}): Schedule {
  return scheduleFixture({
    description: "매일 아침 복용합니다.",
    startDateLocal: "2026-04-08",
    title: "영양제",
    ...overrides,
  });
}

function createLog(overrides: Partial<OccurrenceLog> = {}): OccurrenceLog {
  return logFixture({
    actedAtUtc: "2026-04-10T00:05:00.000Z",
    scheduledAtUtc: "2026-04-10T00:00:00.000Z",
    ...overrides,
  });
}

function createVersion(overrides: Partial<RuleVersion> = {}): RuleVersion {
  return ruleFixture({
    seedStartDateLocal: "2026-04-08",
    ...overrides,
  });
}

describe("recurring item detail helpers", () => {
  it("상세 삭제 뒤 목록 진입 경로로 돌아간다", () => {
    expect(getRecurringItemDetailDeleteReturnPath("/schedule")).toBe(
      "/schedule"
    );
  });

  it("상세 삭제 returnTo가 허용 경로가 아니면 홈으로 돌아간다", () => {
    expect(getRecurringItemDetailDeleteReturnPath("/items/item-1")).toBe("/");
    expect(getRecurringItemDetailDeleteReturnPath()).toBe("/");
  });

  it("overdue가 있으면 대표 상태로 overdue를 선택한다", () => {
    const item = createItem();

    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs: [],
      item,
      language: "ko",
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.primaryOccurrence?.status).toBe("overdue");
    expect(
      viewModel.overdueOccurrences.map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-09", "2026-04-08"]);
    expect(viewModel.statusCard.title).toBe("지난 일정");
    expect(viewModel.statusCard.metaLabel).toBe("지난 일정 2건");
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
      language: "ko",
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
      language: "ko",
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

  it("상세 요약은 일정 색상 key를 함께 제공한다", () => {
    const viewModel = buildRecurringItemDetailViewModel({
      language: "ko",
      completionLogs: [],
      item: createItem({
        colorKey: "green",
      }),
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.summary.colorKey).toBe("green");
  });

  it("복구할 수 없는 일정은 상세에서 복구 실패 상태를 제공한다", () => {
    const viewModel = buildRecurringItemDetailViewModel({
      language: "ko",
      completionLogs: [],
      item: createItem({
        contentStatus: "unrecoverable",
        description: null,
        title: "일정 내용을 복구할 수 없어요",
      }),
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.contentRecovery).toEqual({
      description:
        "암호화 키 또는 저장된 내용에 문제가 있어 내용을 열 수 없어요. 필요하면 이 일정을 삭제할 수 있어요.",
      title: "일정 내용을 복구하지 못했어요",
    });
    expect(viewModel.summary.title).toBe("일정 내용을 복구할 수 없어요");
  });

  it("최근 히스토리 5건만 최신 예정 시각 순으로 만든다", () => {
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
        createLog({
          id: "log-5",
          scheduledAtUtc: "2026-04-06T00:00:00.000Z",
        }),
        createLog({
          id: "log-6",
          scheduledAtUtc: "2026-04-05T00:00:00.000Z",
        }),
      ],
      timezone
    );

    expect(entries.map((entry) => entry.id)).toEqual([
      "log-2",
      "log-3",
      "log-1",
      "log-4",
      "log-5",
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

  it("종료일이 있는 일정은 요약 설정에 종료일을 표시한다", () => {
    const entries = buildSummarySettingBadges(
      createItem({
        endDateLocal: "2026-05-10",
      })
    );

    expect(entries).toContainEqual({
      id: "end-date",
      label: "종료",
      value: "2026년 5월 10일",
    });
  });

  it("종료일이 없는 일정은 요약 설정에 종료일을 표시하지 않는다", () => {
    const entries = buildSummarySettingBadges(createItem());

    expect(entries.some((entry) => entry.id === "end-date")).toBe(false);
  });

  it("최신 규칙 버전에서 종료일이 제거되면 이전 version 종료일을 표시하지 않는다", () => {
    const entries = buildSummarySettingBadges(
      createItem({
        versions: [
          createVersion({
            effectiveFromUtc: "2026-04-01T00:00:00.000Z",
            endDateLocal: "2026-05-10",
          }),
          createVersion({
            effectiveFromUtc: "2026-04-15T00:00:00.000Z",
            endDateLocal: null,
          }),
        ],
      })
    );

    expect(entries.some((entry) => entry.id === "end-date")).toBe(false);
  });

  it("종료일이 지나 다음 occurrence가 없어도 상세 요약과 다음 일정 없음 상태를 함께 제공한다", () => {
    const viewModel = buildRecurringItemDetailViewModel({
      language: "ko",
      completionLogs: [
        createLog({
          id: "log-1",
          scheduledAtUtc: "2026-04-08T00:00:00.000Z",
        }),
        createLog({
          id: "log-2",
          scheduledAtUtc: "2026-04-09T00:00:00.000Z",
        }),
        createLog({
          id: "log-3",
          scheduledAtUtc: "2026-04-10T00:00:00.000Z",
        }),
      ],
      item: createItem({
        endDateLocal: "2026-04-10",
      }),
      now: new Date("2026-04-11T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.nextOccurrence).toBeNull();
    expect(viewModel.statusCard.title).toBe("다음 일정 없음");
    expect(viewModel.summary.settingBadges).toContainEqual({
      id: "end-date",
      label: "종료",
      value: "2026년 4월 10일",
    });
  });

  it("시작일 기준 일정은 계산 뱃지를 숨긴다", () => {
    const entries = buildSummarySettingBadges(
      createItem({
        anchorType: "fixed",
      })
    );

    expect(entries.map((entry) => entry.id)).toEqual(["start-date"]);
  });

  it("상세 화면도 최신 규칙 버전 기준 현재 규칙과 다음 일정을 보여준다", () => {
    const item = createItem({
      versions: [
        createVersion({
          endDateLocal: "2026-04-20",
          intervalValue: 3,
          recurrenceType: "interval_days",
          seedStartDateLocal: "2026-04-08",
        }),
        createVersion({
          endDateLocal: "2026-05-01",
          effectiveFromUtc: "2026-04-14T01:00:00.000Z",
          intervalValue: 4,
          recurrenceType: "interval_days",
          reminderTimeLocal: "21:30",
          seedStartDateLocal: "2026-04-16",
        }),
      ],
    });

    const viewModel = buildRecurringItemDetailViewModel({
      language: "ko",
      completionLogs: [],
      item,
      now: new Date("2026-04-14T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.nextOccurrence?.localDate).toBe("2026-04-16");
    expect(viewModel.nextOccurrence?.scheduledAtUtc).toBe(
      "2026-04-16T12:30:00.000Z"
    );
    expect(viewModel.summary.notificationLabel).toBe("오후 9:30");
    expect(viewModel.summary.recurrenceLabel).toBe("4일마다");
    expect(viewModel.summary.notificationsEnabled).toBe(true);
    expect(viewModel.summary.settingBadges).toContainEqual({
      id: "end-date",
      label: "종료",
      value: "2026년 5월 1일",
    });
  });

  it("English 모드에서는 상세 상태, 설정, 히스토리 라벨을 English 용어로 만든다", () => {
    const item = createItem({
      anchorType: "completion_based",
      endDateLocal: "2026-05-10",
      recurrenceType: "interval_days",
      intervalValue: 2,
      title: "영양제",
    });
    const viewModel = buildRecurringItemDetailViewModel({
      completionLogs: [
        createLog({
          action: "skipped",
          id: "log-1",
          scheduledAtUtc: "2026-04-09T00:00:00.000Z",
        }),
      ],
      item,
      language: "en",
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(viewModel.statusCard).toMatchObject({
      dateLabel: "Apr 8",
      metaLabel: "2 days overdue",
      timeLabel: "9:00 AM",
      title: "Overdue",
    });
    expect(viewModel.summary.title).toBe("영양제");
    expect(viewModel.summary.notificationLabel).toBe("9:00 AM");
    expect(viewModel.summary.recurrenceLabel).toBe("Every 2 days");
    expect(viewModel.summary.settingBadges).toEqual([
      { id: "start-date", label: "Start", value: "Apr 8, 2026" },
      { id: "end-date", label: "End date", value: "May 10, 2026" },
      {
        id: "anchor-type",
        label: "Schedule",
        value: "Completion-based",
      },
    ]);
    expect(viewModel.historyPreview[0]).toMatchObject({
      statusLabel: "Skip",
      timeLabel: "Apr 9 9:00 AM",
    });
  });
});
