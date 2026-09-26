import { useQuery } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import { listItemLogs } from "./db/logs";
import { ScheduleNotFoundError } from "./errors";
import { logFixture, scheduleFixture, testTimezone } from "./fixtures";
import { useScheduleById, useScheduleDetailData, useSchedules } from "./query";
import { readActiveScheduleData } from "./read";

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
}));
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("./db/items", () => ({ getItem: jest.fn() }));
jest.mock("./db/logs", () => ({ listItemLogs: jest.fn() }));
jest.mock("./read", () => ({ readActiveScheduleData: jest.fn() }));
jest.mock("~/query-client", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone: testTimezone },
    status: "ready",
    user: { id: "user-1" },
  } as never);
  jest.mocked(useQuery).mockReturnValue(queryResult as never);
});

it("활성 일정과 전체 기록을 날짜와 무관한 사용자별 query 하나로 공유한다", async () => {
  const schedules = [scheduleFixture({ id: "fixed" })];
  const logs = [logFixture({ itemId: "fixed" })];
  jest.mocked(useQuery).mockReturnValue({
    ...queryResult,
    data: { logs, schedules },
  } as never);

  const result = useSchedules();
  const options = jest.mocked(useQuery).mock.calls[0]![0];

  expect(options.queryKey).toEqual(["schedule", "user-1", "active-data"]);
  expect(useQuery).toHaveBeenCalledTimes(1);
  expect(result.items).toBe(schedules);
  expect(result.logs).toBe(logs);

  await (options.queryFn as () => Promise<unknown>)();
  expect(readActiveScheduleData).toHaveBeenCalledWith({ userId: "user-1" });
});

it("일정 하나만 필요한 화면은 기록 없이 해당 일정만 조회한다", () => {
  const item = scheduleFixture({ id: "item-1" });
  const response = { ...queryResult, data: item };

  jest.mocked(useQuery).mockReturnValue(response as never);

  expect(useScheduleById("item-1")).toBe(response);
  expect(jest.mocked(useQuery).mock.calls[0]![0].queryKey).toEqual([
    "schedule",
    "user-1",
    "item",
    "item-1",
  ]);
  expect(useQuery).toHaveBeenCalledTimes(1);
});

it.each([
  ["ready", "user-1", "item-1", true],
  ["ready", "user-2", "item-1", true],
  ["loading", "user-1", "item-1", false],
  ["error", "user-1", "item-1", false],
  ["signedOut", null, "item-1", false],
  ["ready", "user-1", null, false],
] as const)(
  "세션 %s, 사용자 %s, 일정 %s로 단건 조회 조건과 key를 구성한다",
  (status, userId, itemId, enabled) => {
    jest.mocked(useSession).mockReturnValue({
      status,
      user: userId ? { id: userId } : null,
    } as never);
    useScheduleById(itemId);
    expect(jest.mocked(useQuery).mock.calls[0]?.[0]).toMatchObject({
      enabled,
      queryKey: ["schedule", userId ?? "signed-out", "item", itemId],
    });
  }
);

it("상세 조회가 일정 준비 후 사용자별 전체 기록을 읽는다", async () => {
  const item = scheduleFixture();
  const logs = [logFixture()];
  jest
    .mocked(useQuery)
    .mockReturnValueOnce({ ...queryResult, data: item } as never)
    .mockReturnValueOnce({ ...queryResult, data: logs } as never);
  jest.mocked(listItemLogs).mockResolvedValue(logs);

  const result = useScheduleDetailData(item.id);
  const options = jest.mocked(useQuery).mock.calls[1]![0];

  expect(result).toMatchObject({ item, logs, status: "ready" });
  expect(options).toMatchObject({
    enabled: true,
    queryKey: ["schedule", "user-1", "detail", item.id],
  });
  await (options.queryFn as () => Promise<unknown>)();
  expect(listItemLogs).toHaveBeenCalledWith({
    itemId: item.id,
    userId: "user-1",
  });
});

it("상세는 일정 없음과 기록 실패를 구분한다", () => {
  jest
    .mocked(useQuery)
    .mockReturnValueOnce({
      ...queryResult,
      error: new ScheduleNotFoundError(),
    } as never)
    .mockReturnValueOnce(queryResult as never);
  expect(useScheduleDetailData("missing").status).toBe("notFound");

  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone: testTimezone },
    status: "ready",
    user: { id: "user-1" },
  } as never);
  const item = scheduleFixture();
  const error = new Error("기록 조회 실패");
  jest
    .mocked(useQuery)
    .mockReturnValueOnce({ ...queryResult, data: item } as never)
    .mockReturnValueOnce({ ...queryResult, error } as never);
  expect(useScheduleDetailData(item.id)).toMatchObject({
    error,
    status: "error",
  });
});

it("세션 오류를 일정 로딩으로 취급하지 않는다", () => {
  jest.mocked(useSession).mockReturnValue({
    profile: null,
    status: "error",
    user: { id: "user-1" },
  } as never);
  jest.mocked(useQuery).mockReturnValue({
    ...queryResult,
    isPending: true,
  } as never);

  expect(useSchedules().isLoading).toBe(false);
});
