import { useQuery } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import { scheduleFixture, testTimezone } from "./fixtures";
import { useScheduleRange } from "./query";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useCallback: <T>(callback: T): T => callback,
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("./db/items", () => ({ listItems: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));
jest.mock("~/query-client", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

it("조회 범위와 완료일 기준 일정의 anchor 대상을 query key에 반영한다", () => {
  const items = [
    scheduleFixture({ id: "fixed" }),
    scheduleFixture({
      anchorType: "completion_based",
      id: "completion-based",
      recurrenceType: "interval_days",
    }),
  ];
  const queryResult = {
    data: undefined,
    error: null,
    isPending: false,
    isRefetching: false,
    refetch: jest.fn(async () => undefined),
  };

  jest.mocked(useSession).mockReturnValue({
    profile: { timezone: testTimezone },
    status: "ready",
    user: { id: "user-1" },
  } as never);
  jest
    .mocked(useQuery)
    .mockReturnValueOnce({ ...queryResult, data: items } as never)
    .mockReturnValueOnce(queryResult as never);
  useScheduleRange({
    endLocalDate: "2026-04-12",
    startLocalDate: "2026-04-10",
  });

  expect(jest.mocked(useQuery).mock.calls[1]?.[0].queryKey).toEqual([
    "schedule",
    "user-1",
    "logs",
    ["completion-based", "fixed"],
    ["completion-based"],
    "2026-04-09T15:00:00.000Z",
    "2026-04-12T14:59:59.999Z",
  ]);
});
