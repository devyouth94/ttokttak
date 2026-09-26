import { createElement, type ReactElement } from "react";

import { logFixture, scheduleFixture, testTimezone } from "~/schedule/fixtures";
import { useScheduleDetailData } from "~/schedule/query";

import { type DetailQueryResult, useDetailQuery } from "./query";

jest.mock("~/schedule/query", () => ({ useScheduleDetailData: jest.fn() }));

declare const require: (moduleName: string) => unknown;
const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => void) => Promise<void>;
  create: (element: ReactElement) => { unmount: () => void };
};
const refetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useScheduleDetailData).mockReturnValue({
    item: scheduleFixture(),
    logs: [],
    refetch,
    status: "ready",
    timezone: testTimezone,
  });
});

describe("상세 occurrence 계산", () => {
  it("전체 기록으로 지난 일정을 계산하고 가장 최근 일정을 대표로 삼는다", async () => {
    const item = scheduleFixture({ startDateLocal: "2026-04-08" });
    const oldLog = logFixture({
      id: "old-log",
      scheduledAtUtc: "2026-04-08T00:00:00.000Z",
    });
    const recentLog = logFixture();
    mockReady(item, [oldLog, recentLog]);

    const result = expectReady(
      await renderDetail({
        itemId: item.id,
        now: new Date("2026-04-12T03:00:00.000Z"),
      })
    );

    expect(result.history).toEqual([oldLog, recentLog]);
    expect(result.overdueCount).toBe(2);
    expect(result.basisOccurrence?.localDate).toBe("2026-04-10");
  });

  it("지난 일정이 없으면 다음 일정을 대표로 삼는다", async () => {
    const item = scheduleFixture();
    mockReady(item, []);

    const result = expectReady(
      await renderDetail({
        itemId: item.id,
        now: new Date("2026-04-10T03:00:00.000Z"),
      })
    );

    expect(result.overdueCount).toBe(0);
    expect(result.basisOccurrence?.localDate).toBe("2026-04-11");
  });

  it("진입 시각의 처리 상태를 기본 대표 일정보다 우선한다", async () => {
    const item = scheduleFixture();
    const completedLog = logFixture({
      actedAtUtc: "2026-04-10T01:00:00.000Z",
      scheduledAtUtc: "2026-04-10T00:00:00.000Z",
    });
    mockReady(item, [completedLog]);

    const result = expectReady(
      await renderDetail({
        itemId: item.id,
        now: new Date("2026-04-12T03:00:00.000Z"),
        scheduledAtUtc: completedLog.scheduledAtUtc,
      })
    );

    expect(result.basisOccurrence).toMatchObject({
      localDate: "2026-04-10",
      status: "completed",
    });
    expect(result.overdueCount).toBe(1);
  });
});

it("전체 기록을 바꾸지 않고 처리 시각 최신순 5건을 파생한다", async () => {
  const logs = [12, 16, 11, 15, 14, 16, 13].map((day, index) =>
    logFixture({
      id: `log-${index}`,
      actedAtUtc: `2026-04-${day}T01:00:00.000Z`,
      scheduledAtUtc: `2026-04-${10 + index}T00:00:00.000Z`,
      action: index === 1 ? "skipped" : "completed",
    })
  );
  Object.freeze(logs);
  const originalLogs = [...logs];
  mockReady(scheduleFixture(), logs);

  const result = expectReady(await renderDetail());

  expect(result.history).toEqual([logs[1], logs[5], logs[3], logs[4], logs[6]]);
  expect(logs).toEqual(originalLogs);
});

function mockReady(
  item: ReturnType<typeof scheduleFixture>,
  logs: ReturnType<typeof logFixture>[]
): void {
  jest.mocked(useScheduleDetailData).mockReturnValue({
    item,
    logs,
    refetch,
    status: "ready",
    timezone: testTimezone,
  });
}

function expectReady(
  result: DetailQueryResult
): Extract<DetailQueryResult, { status: "ready" }> {
  expect(result.status).toBe("ready");

  if (result.status !== "ready") {
    throw new Error(`상세 ready 상태가 필요하지만 ${result.status}입니다.`);
  }

  return result;
}

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
