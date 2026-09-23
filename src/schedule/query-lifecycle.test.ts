import { createElement, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import { listItems } from "./db/items";
import { listLogs } from "./db/logs";
import { scheduleFixture } from "./fixtures";
import { useSchedules } from "./query";

jest.mock("./db/items", () => ({ listItems: jest.fn() }));
jest.mock("./db/logs", () => ({ listLogs: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

declare const require: (moduleName: string) => unknown;
const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => void | Promise<void>) => Promise<void>;
  create: (element: ReactElement) => { unmount: () => void };
};

it.each([false, true])(
  "전체 기록이 준비되기 전이나 실패하면 계산할 일정을 노출하지 않는다: 실패=%s",
  async (fail) => {
    jest.clearAllMocks();
    jest.mocked(useSession).mockReturnValue({
      status: "ready",
      user: { id: "user-1" },
      profile: { timezone: "UTC" },
    } as never);
    const item = scheduleFixture();
    jest.mocked(listItems).mockResolvedValue([item]);
    let resolve!: (logs: Awaited<ReturnType<typeof listLogs>>) => void;
    let reject!: (error: Error) => void;
    jest.mocked(listLogs).mockReturnValue(
      new Promise((fulfill, decline) => {
        resolve = fulfill;
        reject = decline;
      })
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    let result!: ReturnType<typeof useSchedules>;
    function Probe() {
      result = useSchedules();
      return null;
    }
    let renderer!: ReturnType<typeof TestRenderer.create>;
    try {
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          createElement(
            QueryClientProvider,
            { client },
            createElement(Probe),
            createElement(Probe)
          )
        );
      });
      await TestRenderer.act(async () => {
        await new Promise((done) => setTimeout(done, 10));
      });
      expect(listItems).toHaveBeenCalledTimes(1);
      expect(listLogs).toHaveBeenCalledTimes(1);
      expect(result.isLoading).toBe(true);
      expect(result.items).toEqual([]);

      await TestRenderer.act(async () => {
        if (fail) reject(new Error("후속 페이지 실패"));
        else resolve([]);
        await new Promise((done) => setTimeout(done, 10));
      });
      expect(result.isLoading).toBe(false);
      expect(result.items).toEqual(fail ? [] : [item]);
      expect(Boolean(result.error)).toBe(fail);
    } finally {
      await TestRenderer.act(() => renderer?.unmount());
      client.clear();
    }
  }
);
