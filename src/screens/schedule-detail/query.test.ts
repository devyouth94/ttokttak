import { logFixture, scheduleFixture, testTimezone } from "~/schedule/fixtures";
import { useScheduleItem } from "~/schedule/query";

import { useDetailQuery } from "./query";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("~/schedule/query", () => ({ useScheduleItem: jest.fn() }));

it("상세 계산에는 최근 표시 기록과 별개로 전체 기록을 사용한다", () => {
  const item = scheduleFixture({ startDateLocal: "2026-04-08" });
  const oldLog = logFixture({
    id: "old-log",
    scheduledAtUtc: "2026-04-08T00:00:00.000Z",
  });
  const recentLog = logFixture();

  jest.mocked(useScheduleItem).mockReturnValue({
    history: [recentLog],
    item,
    logs: [oldLog, recentLog],
    timezone: testTimezone,
  } as never);

  const result = useDetailQuery({
    itemId: item.id,
    now: new Date("2026-04-12T03:00:00.000Z"),
  });

  expect(result.completionLogs).toEqual([recentLog]);
  expect(
    result.overdueOccurrences.map((occurrence) => occurrence.localDate)
  ).toEqual(["2026-04-10", "2026-04-09"]);
});
