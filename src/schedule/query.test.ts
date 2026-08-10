import { useQuery } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import { scheduleFixture, testTimezone } from "./fixtures";
import { useScheduleById, useScheduleDetail, useScheduleRange } from "./query";

const refetch = jest.fn(async () => undefined);
const queryResult = {
  data: undefined,
  error: null,
  isPending: false,
  refetch,
};

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useCallback: <T>(callback: T): T => callback,
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("./db/items", () => ({
  getItem: jest.fn(),
  listItems: jest.fn(),
}));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));
jest.mock("~/query-client", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone: testTimezone },
    status: "ready",
    user: { id: "user-1" },
  } as never);
});

it("조회 범위와 완료일 기준 일정의 anchor 대상을 query key에 반영한다", () => {
  const items = [
    scheduleFixture({ id: "fixed" }),
    scheduleFixture({
      anchorType: "completion_based",
      id: "completion-based",
      recurrenceType: "interval_days",
    }),
  ];
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

it("일정 하나만 필요한 화면은 기록 없이 해당 일정만 조회한다", () => {
  const item = scheduleFixture({ id: "item-1" });

  jest
    .mocked(useQuery)
    .mockReturnValue({ ...queryResult, data: item } as never);

  useScheduleById("item-1");
  const options = jest.mocked(useQuery).mock.calls[0]![0];

  expect(options.queryKey).toEqual(["schedule", "user-1", "item", "item-1"]);
  expect(useQuery).toHaveBeenCalledTimes(1);
});

it("상세 기록은 일정이 있을 때 하나의 query로 조회한다", () => {
  const item = scheduleFixture({ id: "item-1" });
  const history = [{ id: "history-1" }];
  const logs = [{ id: "log-1" }];

  jest
    .mocked(useQuery)
    .mockReturnValueOnce({ ...queryResult, data: item } as never)
    .mockReturnValueOnce({ ...queryResult, data: { history, logs } } as never);

  const result = useScheduleDetail("item-1");
  const options = jest.mocked(useQuery).mock.calls[1]![0];

  expect(options).toMatchObject({
    enabled: true,
    queryKey: ["schedule", "user-1", "detail", "item-1"],
  });
  expect(result).toMatchObject({ history, item, logs });
  expect(useQuery).toHaveBeenCalledTimes(2);
});

it("일정이 없으면 상세 기록 query를 실행하지 않는다", () => {
  jest
    .mocked(useQuery)
    .mockReturnValue({ ...queryResult, data: null } as never);

  useScheduleDetail("missing");

  expect(jest.mocked(useQuery).mock.calls[1]?.[0]).toMatchObject({
    enabled: false,
    queryKey: ["schedule", "user-1", "detail", "missing"],
  });
});

it("세션 오류를 일정 로딩으로 취급하지 않는다", () => {
  jest.mocked(useSession).mockReturnValue({
    profile: null,
    status: "error",
    user: { id: "user-1" },
  } as never);
  jest
    .mocked(useQuery)
    .mockReturnValue({ ...queryResult, isPending: true } as never);

  const result = useScheduleRange({
    endLocalDate: "2026-04-10",
    startLocalDate: "2026-04-10",
  });

  expect(result.isLoading).toBe(false);
});
