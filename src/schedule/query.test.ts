import { createElement, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import { getItem } from "./db/items";
import { listItemLogs } from "./db/logs";
import { ScheduleNotFoundError } from "./errors";
import { logFixture, scheduleFixture } from "./fixtures";
import { useScheduleById, useScheduleDetailData } from "./query";

jest.mock("./db/items", () => ({ getItem: jest.fn() }));
jest.mock("./db/logs", () => ({ listItemLogs: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

declare const require: (moduleName: string) => unknown;
const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    update: (element: ReactElement) => void;
    unmount: () => void;
  };
};
const cleanup: (() => Promise<void>)[] = [];

beforeEach(() => {
  jest.resetAllMocks();
  setSession("ready", "user-a");
});

afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

it.each([
  ["loading", "user-a", "item-1"],
  ["error", "user-a", "item-1"],
  ["signedOut", null, "item-1"],
  ["ready", null, "item-1"],
  ["ready", "user-a", null],
] as const)(
  "세션 %s에서 조회할 수 없는 일정은 DB에 요청하지 않는다",
  async (status, userId, itemId) => {
    setSession(status, userId);
    await renderQuery(() => useScheduleById(itemId));
    expect(getItem).not.toHaveBeenCalled();
  }
);

it("같은 일정 ID라도 계정을 바꾸면 이전 계정의 캐시를 노출하지 않는다", async () => {
  jest
    .mocked(getItem)
    .mockImplementation(async ({ userId }) =>
      scheduleFixture({ id: "same-item", title: userId })
    );
  const query = await renderQuery(() => useScheduleById("same-item"));
  expect(query.current.data?.title).toBe("user-a");

  let resolve!: (item: Awaited<ReturnType<typeof getItem>>) => void;
  jest.mocked(getItem).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    })
  );
  setSession("ready", "user-b");
  await query.update();
  expect(query.current.data).toBeUndefined();

  await TestRenderer.act(async () => {
    resolve(scheduleFixture({ id: "same-item", title: "user-b" }));
    await settle();
  });
  expect(query.current.data?.title).toBe("user-b");

  setSession("ready", "user-a");
  await query.update();
  expect(query.current.data?.title).toBe("user-a");
});

it("상세 기록 실패를 빈 성공으로 바꾸지 않고 재조회로 복구한다", async () => {
  jest.mocked(getItem).mockResolvedValue(scheduleFixture());
  const error = new Error("기록 조회 실패");
  jest.mocked(listItemLogs).mockRejectedValueOnce(error);
  const query = await renderQuery(() => useScheduleDetailData("item-1"));
  expect(query.current).toMatchObject({ status: "error", error });
  if (query.current.status !== "error")
    throw new Error("실패 상태가 필요합니다.");

  const logs = [logFixture()];
  jest.mocked(listItemLogs).mockResolvedValue(logs);
  const retry = query.current.refetch;
  await TestRenderer.act(async () => {
    await retry();
    await settle();
  });
  expect(query.current).toMatchObject({ status: "ready", logs });
});

it("일정이 없으면 처리 기록을 요청하지 않고 notFound를 반환한다", async () => {
  jest.mocked(getItem).mockRejectedValue(new ScheduleNotFoundError());
  const query = await renderQuery(() => useScheduleDetailData("missing"));
  expect(query.current.status).toBe("notFound");
  expect(listItemLogs).not.toHaveBeenCalled();
});

function setSession(
  status: "loading" | "ready" | "error" | "signedOut",
  userId: string | null
) {
  jest.mocked(useSession).mockReturnValue({
    status,
    user: userId ? { id: userId } : null,
    profile: { timezone: "UTC" },
  } as ReturnType<typeof useSession>);
}

async function renderQuery<T>(useValue: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  let current!: T;
  function Probe() {
    current = useValue();
    return null;
  }
  const element = () =>
    createElement(QueryClientProvider, { client }, createElement(Probe));
  let view!: ReturnType<typeof TestRenderer.create>;
  await TestRenderer.act(async () => {
    view = TestRenderer.create(element());
  });
  cleanup.push(async () => {
    await TestRenderer.act(() => view.unmount());
    client.clear();
  });
  await TestRenderer.act(settle);
  return {
    get current() {
      return current;
    },
    async update() {
      await TestRenderer.act(() => view.update(element()));
      await TestRenderer.act(settle);
    },
  };
}

async function settle() {
  // React Query의 구독 알림과 이어지는 상세 기록 조회를 반영한다.
  await new Promise((done) => setTimeout(done, 20));
}
