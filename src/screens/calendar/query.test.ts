import { scheduleFixture } from "~/schedule/fixtures";
import { useSchedules } from "~/schedule/query";

import { useCalendarQuery } from "./query";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("~/schedule/query", () => ({ useSchedules: jest.fn() }));

it("캘린더는 전체 이력에서 보이는 월의 occurrence만 표시한다", () => {
  jest.mocked(useSchedules).mockReturnValue({
    items: [scheduleFixture({ startDateLocal: "2026-03-01" })],
    logs: [],
    timezone: "Asia/Seoul",
  } as never);

  const result = useCalendarQuery({
    now: new Date("2026-04-10T03:00:00.000Z"),
    selectedDate: "2026-04-10",
  });

  expect(result.occurrenceEntries).toHaveLength(30);
  expect(result.occurrenceEntries[0]?.occurrence.localDate).toBe("2026-04-01");
  expect(result.occurrenceEntries.at(-1)?.occurrence.localDate).toBe(
    "2026-04-30"
  );
});

it("완료 기록 로딩 중에는 임시 occurrence를 노출하지 않는다", () => {
  jest.mocked(useSchedules).mockReturnValue({
    error: null,
    isLoading: true,
    items: [
      scheduleFixture({
        anchorType: "completion_based",
        recurrenceType: "monthly",
        startDateLocal: "2026-07-03",
      }),
    ],
    logs: [],
    timezone: "Asia/Seoul",
  } as never);

  const result = useCalendarQuery({
    now: new Date("2026-08-03T00:00:00.000Z"),
    selectedDate: "2026-08-03",
  });

  expect(result.occurrenceEntries).toEqual([]);
});
