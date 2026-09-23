import { createElement, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";

import { listItemLogs } from "~/schedule/db/logs";
import { logFixture, scheduleFixture, testTimezone } from "~/schedule/fixtures";
import { useScheduleById } from "~/schedule/query";
import { useSession } from "~/session/provider";

import { useDetailQuery } from "./query";

jest.mock("~/schedule/query", () => ({ useScheduleById: jest.fn() }));

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("~/schedule/db/logs", () => ({ listItemLogs: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

declare const require: (moduleName: string) => unknown;
const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => void) => Promise<void>;
  create: (element: ReactElement) => { unmount: () => void };
};
const refetchSchedule = jest.fn();
const refetchDetail = jest.fn();
const scheduleResult = {
  error: null,
  isPending: false,
  data: scheduleFixture(),
  refetch: refetchSchedule,
};
const detailResult = {
  data: [],
  error: null,
  isPending: false,
  refetch: refetchDetail,
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone: testTimezone },
    status: "ready",
    user: { id: "user-1" },
  } as never);
  jest.mocked(useScheduleById).mockReturnValue(scheduleResult as never);
  jest.mocked(useQuery).mockReturnValue(detailResult as never);
});

describe("상세 occurrence 계산", () => {
  it("전체 기록으로 지난 일정을 계산하고 가장 최근 일정을 대표로 삼는다", async () => {
    const item = scheduleFixture({ startDateLocal: "2026-04-08" });
    const oldLog = logFixture({
      id: "old-log",
      scheduledAtUtc: "2026-04-08T00:00:00.000Z",
    });
    const recentLog = logFixture();
    jest
      .mocked(useQuery)
      .mockReturnValue({ ...detailResult, data: [oldLog, recentLog] } as never);

    jest.mocked(useScheduleById).mockReturnValue({
      ...scheduleResult,
      data: item,
    } as never);

    const result = await renderDetail({
      itemId: item.id,
      now: new Date("2026-04-12T03:00:00.000Z"),
    });

    expect(result.history).toEqual([oldLog, recentLog]);
    expect(result.overdueCount).toBe(2);
    expect(result.basisOccurrence?.localDate).toBe("2026-04-10");
  });

  it("지난 일정이 없으면 다음 일정을 대표로 삼는다", async () => {
    const item = scheduleFixture();

    jest.mocked(useScheduleById).mockReturnValue({
      ...scheduleResult,
      data: item,
    } as never);

    const result = await renderDetail({
      itemId: item.id,
      now: new Date("2026-04-10T03:00:00.000Z"),
    });

    expect(result.overdueCount).toBe(0);
    expect(result.basisOccurrence?.localDate).toBe("2026-04-11");
  });

  it("진입 시각의 처리 상태를 기본 대표 일정보다 우선한다", async () => {
    const item = scheduleFixture();
    const completedLog = logFixture({
      actedAtUtc: "2026-04-10T01:00:00.000Z",
      scheduledAtUtc: "2026-04-10T00:00:00.000Z",
    });

    jest
      .mocked(useQuery)
      .mockReturnValue({ ...detailResult, data: [completedLog] } as never);

    const result = await renderDetail({
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

it("전체 기록을 바꾸지 않고 처리 시각 최신순 5건을 파생하며 동률은 입력 순서를 유지한다", async () => {
  const logs = [12, 16, 11, 15, 14, 16, 13].map((day, index) =>
    logFixture({
      id: `log-${index}`,
      actedAtUtc: `2026-04-${day}T01:00:00.000Z`,
      scheduledAtUtc: `2026-04-${10 + index}T00:00:00.000Z`,
      action: index === 1 ? "skipped" : "completed",
    })
  );
  Object.freeze(logs);
  jest
    .mocked(useQuery)
    .mockReturnValue({ ...detailResult, data: logs } as never);
  const result = await renderDetail();
  expect(result.history).toEqual([logs[1], logs[5], logs[3], logs[4], logs[6]]);
  expect(result.logs).toBe(logs);
});

it("사용자별 상세 key로 전체 기록만 조회하고 일정과 기록을 함께 재조회한다", async () => {
  const result = await renderDetail();
  const options = jest.mocked(useQuery).mock.calls[0]![0];
  expect(options).toMatchObject({
    enabled: true,
    queryKey: ["schedule", "user-1", "detail", "item-1"],
  });
  const queryFn = options.queryFn as () => Promise<unknown>;
  await queryFn();
  expect(listItemLogs).toHaveBeenCalledWith({
    itemId: "item-1",
    userId: "user-1",
  });
  expect(listItemLogs).toHaveBeenCalledTimes(1);
  await result.refetch();
  expect(refetchSchedule).toHaveBeenCalledTimes(1);
  expect(refetchDetail).toHaveBeenCalledTimes(1);
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone: testTimezone },
    status: "ready",
    user: { id: "user-2" },
  } as never);
  await renderDetail();
  expect(jest.mocked(useQuery).mock.calls.at(-1)?.[0].queryKey).toEqual([
    "schedule",
    "user-2",
    "detail",
    "item-1",
  ]);
});

it("일정이 없으면 기록을 조회하지 않고 일정만 재조회한다", async () => {
  jest
    .mocked(useScheduleById)
    .mockReturnValue({ ...scheduleResult, data: undefined } as never);
  const result = await renderDetail();
  expect(jest.mocked(useQuery).mock.calls[0]?.[0].enabled).toBe(false);
  expect(result.basisOccurrence).toBeNull();
  expect(result.overdueCount).toBe(0);
  await result.refetch();
  expect(refetchSchedule).toHaveBeenCalledTimes(1);
  expect(refetchDetail).not.toHaveBeenCalled();
});

it.each([
  ["loading", true],
  ["ready", true],
  ["error", false],
  ["signedOut", false],
] as const)(
  "일정 조회 대기 중 세션 %s의 상세 로딩을 판정한다",
  async (status, isLoading) => {
    jest.mocked(useSession).mockReturnValue({
      profile: null,
      status,
      user: status === "signedOut" ? null : { id: "user-1" },
    } as never);
    jest.mocked(useScheduleById).mockReturnValue({
      ...scheduleResult,
      data: undefined,
      isPending: true,
    } as never);
    jest
      .mocked(useQuery)
      .mockReturnValue({ ...detailResult, isPending: true } as never);
    const result = await renderDetail();
    expect(result.isLoading).toBe(isLoading);
    expect(jest.mocked(useQuery).mock.calls[0]?.[0].enabled).toBe(false);
  }
);

it("기록 로딩과 실패를 상세 화면에 전달한다", async () => {
  jest
    .mocked(useQuery)
    .mockReturnValue({ ...detailResult, isPending: true } as never);
  expect((await renderDetail()).isLoading).toBe(true);
  const error = new Error("기록 조회 실패");
  jest.mocked(useQuery).mockReturnValue({ ...detailResult, error } as never);
  const result = await renderDetail();
  expect(result.isLoading).toBe(false);
  expect(result.error).toBe(error);
});

async function renderDetail(
  overrides: Partial<Parameters<typeof useDetailQuery>[0]> = {}
) {
  let result!: ReturnType<typeof useDetailQuery>;
  let renderer!: ReturnType<typeof TestRenderer.create>;
  function Probe() {
    result = useDetailQuery({
      itemId: "item-1",
      now: new Date("2026-04-12T03:00:00.000Z"),
      ...overrides,
    });
    return null;
  }
  await TestRenderer.act(() => {
    renderer = TestRenderer.create(createElement(Probe));
  });
  await TestRenderer.act(() => renderer.unmount());
  return result;
}
