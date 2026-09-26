import { createElement, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import { listItems } from "./db/items";
import { listLogs } from "./db/logs";
import { logFixture, scheduleFixture } from "./fixtures";
import { useSchedules } from "./query";

jest.mock("./db/items", () => ({ listItems: jest.fn() }));
jest.mock("./db/logs", () => ({ listLogs: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

declare const require: (moduleName: string) => unknown;
const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    unmount: () => void;
    update: (element: ReactElement) => void;
  };
};

type Session = ReturnType<typeof useSession>;

let session: Session;

beforeEach(() => {
  jest.clearAllMocks();
  session = sessionValue("loading", "user-a");
  jest.mocked(useSession).mockImplementation(() => session);
});

it("profile 준비 전 조회를 막고 계정 전환 뒤 A의 늦은 결과를 노출하지 않는다", async () => {
  const aItems = deferred<Awaited<ReturnType<typeof listItems>>>();
  const aLogs = deferred<Awaited<ReturnType<typeof listLogs>>>();
  const aLogsStarted = deferred<void>();
  const itemA = scheduleFixture({ id: "A1", title: "A 일정" });
  const itemB = scheduleFixture({ id: "B1", title: "B 일정" });
  jest
    .mocked(listItems)
    .mockImplementation(({ userId }) =>
      userId === "user-a" ? aItems.promise : Promise.resolve([itemB])
    );
  jest.mocked(listLogs).mockImplementation(({ userId }) => {
    if (userId === "user-a") {
      aLogsStarted.resolve();
      return aLogs.promise;
    }

    return Promise.resolve([]);
  });
  const query = await renderSchedules();

  expect(listItems).not.toHaveBeenCalled();

  session = sessionValue("ready", "user-a");
  await query.update();
  expect(listItems).toHaveBeenCalledWith({ userId: "user-a" });

  session = sessionValue("loading", "user-b");
  await query.update();
  expect(query.current.items).toEqual([]);

  await TestRenderer.act(async () => {
    aItems.resolve([itemA]);
    await aLogsStarted.promise;
    aLogs.resolve([]);
    await aLogs.promise;
  });
  expect(query.current.items).toEqual([]);

  session = sessionValue("ready", "user-b");
  await query.update();
  await TestRenderer.act(() =>
    query.waitFor((result) => result.items[0]?.id === "B1")
  );
  expect(query.current.items).toEqual([itemB]);

  await query.close();
});

it("기록 조회 실패 뒤 완전한 묶음으로 재조회한다", async () => {
  session = sessionValue("ready", "user-a");
  const item = scheduleFixture({ id: "A1" });
  const logs = [logFixture({ itemId: item.id })];
  const error = new Error("기록 조회 실패");
  jest.mocked(listItems).mockResolvedValue([item]);
  jest.mocked(listLogs).mockRejectedValueOnce(error).mockResolvedValue(logs);
  const query = await renderSchedules();

  await TestRenderer.act(() =>
    query.waitFor((result) => result.error === error)
  );
  expect(query.current).toMatchObject({
    error,
    isLoading: false,
    isReady: true,
    items: [],
  });

  await TestRenderer.act(async () => {
    await query.current.refetch();
  });
  await TestRenderer.act(() =>
    query.waitFor((result) => result.items.length === 1)
  );
  expect(query.current).toMatchObject({ items: [item], logs });

  await query.close();
});

it("활성 일정이 없으면 기록 요청 없이 빈 결과로 완료한다", async () => {
  session = sessionValue("ready", "user-a");
  jest.mocked(listItems).mockResolvedValue([]);
  const query = await renderSchedules();

  await TestRenderer.act(() => query.waitFor((result) => !result.isLoading));
  expect(query.current).toMatchObject({ items: [], logs: [] });
  expect(listLogs).not.toHaveBeenCalled();

  await query.close();
});

function sessionValue(status: "loading" | "ready", userId: string): Session {
  return {
    profile: status === "ready" ? { timezone: "Asia/Seoul" } : null,
    status,
    user: { id: userId },
  } as Session;
}

async function renderSchedules() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  let current!: ReturnType<typeof useSchedules>;
  const waiters: {
    predicate: (result: ReturnType<typeof useSchedules>) => boolean;
    resolve: () => void;
  }[] = [];

  function Probe() {
    current = useSchedules();
    for (const waiter of [...waiters]) {
      if (!waiter.predicate(current)) continue;
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.resolve();
    }
    return null;
  }

  const element = () =>
    createElement(QueryClientProvider, { client }, createElement(Probe));
  let renderer!: ReturnType<typeof TestRenderer.create>;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(element());
  });

  return {
    get current() {
      return current;
    },
    async close() {
      await TestRenderer.act(() => renderer.unmount());
      client.clear();
    },
    async update() {
      await TestRenderer.act(() => renderer.update(element()));
    },
    waitFor(predicate: (result: ReturnType<typeof useSchedules>) => boolean) {
      if (predicate(current)) return Promise.resolve();
      return new Promise<void>((resolve) => {
        waiters.push({ predicate, resolve });
      });
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });

  return { promise, resolve };
}
