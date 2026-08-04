import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";

import { useAppLanguage } from "~/i18n/provider";
import { useNotifications } from "~/notifications/provider";
import { useNow } from "~/schedule/now";
import { useScheduleRange } from "~/schedule/query";
import { useSession } from "~/session/provider";

import { useHomeActions } from "./action";
import { useHomeFeed } from "./feed";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("@react-navigation/native", () => ({ useIsFocused: jest.fn() }));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/notifications/provider", () => ({
  useNotifications: jest.fn(),
}));
jest.mock("~/schedule/now", () => ({ useNow: jest.fn() }));
jest.mock("~/schedule/query", () => ({ useScheduleRange: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));
jest.mock("./action", () => ({ useHomeActions: jest.fn() }));

const now = new Date("2026-04-10T23:30:00.000Z");
const refetch = jest.fn(async () => undefined);
const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    update: (element: ReactElement) => void;
  };
};

let focused = true;
let timezone = "UTC";
let query: ReturnType<typeof useScheduleRange> = createQuery();

describe("홈 피드 lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(now);
    focused = true;
    timezone = "UTC";
    query = createQuery();

    jest.mocked(useTranslation).mockReturnValue({
      t: (key: string) => key,
    } as never);
    jest.mocked(useAppLanguage).mockReturnValue({ language: "ko" } as never);
    jest.mocked(useNotifications).mockReturnValue({
      syncNotifications: jest.fn(),
    } as never);
    jest.mocked(useIsFocused).mockImplementation(() => focused);
    jest.mocked(useNow).mockReturnValue(now);
    jest
      .mocked(useSession)
      .mockImplementation(() => ({ profile: { timezone } }) as never);
    jest.mocked(useScheduleRange).mockImplementation(() => query as never);
    jest.mocked(useHomeActions).mockReturnValue({
      clearError: jest.fn(),
      errorMessage: null,
      processingIds: [],
      runAction: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("화면 준비와 피드 조회 단계를 하나의 상태로 구분한다", async () => {
    query = { ...query, isReady: false, userId: null };
    const feed = await renderFeed();

    expect(feed.current.status).toBe("starting");

    query = { ...query, isLoading: true, isReady: true, userId: "user-1" };
    await feed.update();
    expect(feed.current.status).toBe("loading");

    query = { ...query, isLoading: false };
    await feed.update();
    expect(feed.current.status).toBe("ready");
  });

  it("오늘을 보고 있을 때 시간대가 바뀌면 선택 날짜도 옮긴다", async () => {
    const feed = await renderFeed();

    expect(feed.current.selectedDateId).toBe("2026-04-10");

    timezone = "Asia/Seoul";
    query = { ...query, timezone };
    await feed.update();

    expect(feed.current.selectedDateId).toBe("2026-04-11");
  });

  it("홈에 다시 진입하면 피드 데이터를 새로 읽는다", async () => {
    const feed = await renderFeed();

    expect(refetch).not.toHaveBeenCalled();

    focused = false;
    await feed.update();
    focused = true;
    await feed.update();

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

function createQuery(): ReturnType<typeof useScheduleRange> {
  return {
    error: null,
    isLoading: false,
    isReady: true,
    items: [],
    logs: [],
    refetch,
    timezone,
    userId: "user-1",
  };
}

async function renderFeed(): Promise<{
  current: ReturnType<typeof useHomeFeed>;
  update: () => Promise<void>;
}> {
  let current!: ReturnType<typeof useHomeFeed>;
  const element = () =>
    createElement(HomeFeedProbe, {
      onChange: (feed) => {
        current = feed;
      },
    });
  let renderer!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(element());
  });

  return {
    get current() {
      return current;
    },
    update: async () => {
      await TestRenderer.act(async () => {
        renderer.update(element());
      });
    },
  };
}

function HomeFeedProbe({
  onChange,
}: {
  onChange: (feed: ReturnType<typeof useHomeFeed>) => void;
}): null {
  onChange(useHomeFeed());

  return null;
}
