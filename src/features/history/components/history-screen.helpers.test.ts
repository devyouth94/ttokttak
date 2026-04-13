import { buildHistorySections } from "~/features/history/components/history-screen.helpers";
import type {
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    anchorType: "fixed",
    category: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    description: null,
    id: "item-1",
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "once",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-04-10",
    timezone,
    title: "테스트 항목",
    updatedAt: "2026-04-01T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}

function createLog(overrides: Partial<CompletionLog> = {}): CompletionLog {
  return {
    actedAtUtc: "2026-04-12T01:05:00.000Z",
    action: "completed",
    createdAt: "2026-04-12T01:05:00.000Z",
    deviceId: null,
    id: "log-1",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-12T00:00:00.000Z",
    userId: "user-1",
    ...overrides,
  };
}

describe("buildHistorySections", () => {
  it("예정 시각 기준 역순으로 날짜 섹션과 카드 순서를 만든다", () => {
    const sections = buildHistorySections({
      completionLogs: [
        createLog({
          action: "skipped",
          id: "log-older",
          scheduledAtUtc: "2026-04-11T09:00:00.000Z",
        }),
        createLog({
          action: "completed",
          id: "log-latest",
          scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        }),
      ],
      items: [createItem()],
      timezone,
    });

    expect(sections.map((section) => section.id)).toEqual([
      "2026-04-12",
      "2026-04-11",
    ]);
    expect(sections[0]?.items[0]).toMatchObject({
      action: "completed",
      id: "log-latest",
      statusLabel: "완료",
      timeLabel: "오전 9:00",
    });
    expect(sections[1]?.items[0]).toMatchObject({
      action: "skipped",
      statusLabel: "건너뜀",
      timeLabel: "오후 6:00",
    });
  });

  it("timezone 기준 local 날짜가 바뀌면 해당 날짜 섹션으로 묶는다", () => {
    const sections = buildHistorySections({
      completionLogs: [
        createLog({
          id: "log-boundary",
          scheduledAtUtc: "2026-04-11T15:30:00.000Z",
        }),
      ],
      items: [createItem()],
      timezone,
    });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.id).toBe("2026-04-12");
    expect(sections[0]?.items[0]?.timeLabel).toBe("오전 12:30");
  });

  it("활성 item과 연결되지 않은 로그는 제외한다", () => {
    const sections = buildHistorySections({
      completionLogs: [
        createLog({
          id: "log-hidden",
          itemId: "missing-item",
        }),
      ],
      items: [createItem()],
      timezone,
    });

    expect(sections).toEqual([]);
  });

  it("로그가 없으면 빈 섹션 목록을 반환한다", () => {
    const sections = buildHistorySections({
      completionLogs: [],
      items: [createItem()],
      timezone,
    });

    expect(sections).toEqual([]);
  });
});
