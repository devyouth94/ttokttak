import {
  createCompletionLogFixture,
  createRecurringItemFixture,
  recurringTestTimezone,
} from "~/entities/schedule/testing";

import {
  useScheduleCompletionLogsForItemProjectionQuery,
  useScheduleCompletionLogsQuery,
} from "./use-schedule-completion-logs-query";
import { useScheduleByIdQuery } from "./use-schedule-items-query";
import { useScheduleDetailReadModelQuery } from "./use-schedule-projection-read-models";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("./use-schedule-completion-logs-query", () => ({
  useScheduleCompletionLogsForItemProjectionQuery: jest.fn(),
  useScheduleCompletionLogsQuery: jest.fn(),
}));
jest.mock("./use-schedule-items-query", () => ({
  useScheduleByIdQuery: jest.fn(),
}));

describe("schedule detail read model", () => {
  it("최근 히스토리와 전체 projection log를 분리한다", () => {
    const item = createRecurringItemFixture({
      startDateLocal: "2026-04-08",
    });
    const oldCompletionLog = createCompletionLogFixture({
      id: "old-log",
      scheduledAtUtc: "2026-04-08T00:00:00.000Z",
    });
    const recentCompletionLog = createCompletionLogFixture();
    const refetch = jest.fn();

    jest.mocked(useScheduleByIdQuery).mockReturnValue({
      data: item,
      error: null,
      isPending: false,
      refetch,
    } as never);
    jest.mocked(useScheduleCompletionLogsQuery).mockReturnValue({
      data: [recentCompletionLog],
      error: null,
      isPending: false,
      refetch,
    } as never);
    jest
      .mocked(useScheduleCompletionLogsForItemProjectionQuery)
      .mockReturnValue({
        data: [oldCompletionLog, recentCompletionLog],
        error: null,
        isPending: false,
        refetch,
      } as never);

    const result = useScheduleDetailReadModelQuery({
      context: {
        isReady: true,
        timezone: recurringTestTimezone,
        userId: "user-1",
      },
      itemId: item.id,
      now: new Date("2026-04-12T03:00:00.000Z"),
    });

    expect(result.completionLogs).toEqual([recentCompletionLog]);
    expect(
      result.overdueOccurrences.map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-10", "2026-04-09"]);
    expect(
      useScheduleCompletionLogsForItemProjectionQuery
    ).toHaveBeenCalledWith({
      enabled: true,
      itemId: item.id,
      userId: "user-1",
    });
  });
});
