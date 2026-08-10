import { logFixture, scheduleFixture, testTimezone } from "~/schedule/fixtures";
import { useScheduleDetail } from "~/schedule/query";

import { useDetailQuery } from "./query";

jest.mock("~/schedule/query", () => ({ useScheduleDetail: jest.fn() }));

describe("상세 occurrence 계산", () => {
  it("전체 기록으로 지난 일정을 계산하고 가장 최근 일정을 대표로 삼는다", () => {
    const item = scheduleFixture({ startDateLocal: "2026-04-08" });
    const oldLog = logFixture({
      id: "old-log",
      scheduledAtUtc: "2026-04-08T00:00:00.000Z",
    });
    const recentLog = logFixture();

    jest.mocked(useScheduleDetail).mockReturnValue({
      history: [recentLog],
      item,
      logs: [oldLog, recentLog],
      timezone: testTimezone,
    } as never);

    const result = useDetailQuery({
      itemId: item.id,
      now: new Date("2026-04-12T03:00:00.000Z"),
    });

    expect(result.history).toEqual([recentLog]);
    expect(result.overdueCount).toBe(2);
    expect(result.basisOccurrence?.localDate).toBe("2026-04-10");
  });

  it("지난 일정이 없으면 다음 일정을 대표로 삼는다", () => {
    const item = scheduleFixture();

    jest.mocked(useScheduleDetail).mockReturnValue({
      history: [],
      item,
      logs: [],
      timezone: testTimezone,
    } as never);

    const result = useDetailQuery({
      itemId: item.id,
      now: new Date("2026-04-10T03:00:00.000Z"),
    });

    expect(result.overdueCount).toBe(0);
    expect(result.basisOccurrence?.localDate).toBe("2026-04-11");
  });

  it("진입 시각의 처리 상태를 기본 대표 일정보다 우선한다", () => {
    const item = scheduleFixture();
    const completedLog = logFixture({
      actedAtUtc: "2026-04-10T01:00:00.000Z",
      scheduledAtUtc: "2026-04-10T00:00:00.000Z",
    });

    jest.mocked(useScheduleDetail).mockReturnValue({
      history: [completedLog],
      item,
      logs: [completedLog],
      timezone: testTimezone,
    } as never);

    const result = useDetailQuery({
      itemId: item.id,
      now: new Date("2026-04-12T03:00:00.000Z"),
      scheduledAtUtc: completedLog.scheduledAtUtc,
    });

    expect(result.basisOccurrence).toMatchObject({
      localDate: "2026-04-10",
      status: "completed",
    });
    expect(result.overdueCount).toBe(1);
  });
});
