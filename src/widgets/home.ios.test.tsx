import { createWidget } from "expo-widgets";

import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";
import { scheduleFixture } from "~/schedule/fixtures";

import { syncHomeWidget } from "./home.ios";

jest.mock("expo-widgets", () => ({
  createWidget: jest.fn(() => ({ updateSnapshot: jest.fn() })),
}));
jest.mock("@expo/ui/swift-ui", () => ({
  Circle: jest.fn(),
  HStack: jest.fn(),
  Text: jest.fn(),
  VStack: jest.fn(),
}));
jest.mock("@expo/ui/swift-ui/modifiers", () => ({
  font: jest.fn(),
  foregroundStyle: jest.fn(),
  frame: jest.fn(),
  lineLimit: jest.fn(),
  widgetAccentedRenderingMode: jest.fn(),
  widgetURL: jest.fn(),
}));
jest.mock("~/i18n/i18n", () => ({
  appI18n: { t: (key: string) => key },
}));
jest.mock("~/schedule/db/items", () => ({ listItems: jest.fn() }));
jest.mock("~/schedule/db/logs", () => ({ listLogs: jest.fn() }));

const mockHomeWidget = jest.mocked(createWidget).mock.results[0]?.value;

if (!mockHomeWidget) {
  throw new Error("테스트 위젯이 생성되지 않았습니다.");
}

const mockUpdateSnapshot = jest.mocked(mockHomeWidget.updateSnapshot);

beforeEach(() => {
  jest.mocked(listItems).mockReset();
  jest.mocked(listLogs).mockReset();
  mockUpdateSnapshot.mockClear();
});

it("로그아웃 뒤 완료된 이전 동기화는 위젯을 덮어쓰지 않는다", async () => {
  let resolveItems!: (items: Awaited<ReturnType<typeof listItems>>) => void;
  jest.mocked(listItems).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveItems = resolve;
    })
  );

  const signedInSync = syncHomeWidget({
    language: "ko",
    timezone: "Asia/Seoul",
    userId: "user-1",
  });

  await syncHomeWidget({ language: "ko", timezone: "Asia/Seoul" });

  expect(mockUpdateSnapshot).toHaveBeenCalledWith({
    emptyMessage: "home.widget.login",
    items: [],
    moreMedium: "",
    moreSmall: "",
  });

  resolveItems([]);
  await signedInSync;

  expect(mockUpdateSnapshot).toHaveBeenCalledTimes(1);
});

it("B의 위젯을 갱신한 뒤 끝난 A의 기록 조회는 이전 제목을 다시 쓰지 않는다", async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-04-10T03:00:00.000Z"));
  let resolveLogs!: (logs: Awaited<ReturnType<typeof listLogs>>) => void;
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  jest
    .mocked(listItems)
    .mockResolvedValueOnce([scheduleFixture({ title: "A 제목" })])
    .mockResolvedValueOnce([scheduleFixture({ title: "B 제목" })]);
  jest
    .mocked(listLogs)
    .mockImplementationOnce(() => {
      markStarted();
      return new Promise((resolve) => {
        resolveLogs = resolve;
      });
    })
    .mockResolvedValueOnce([]);
  try {
    const oldSync = syncHomeWidget({
      language: "ko",
      timezone: "Asia/Seoul",
      userId: "A",
    });
    await started;
    await syncHomeWidget({
      language: "ko",
      timezone: "Asia/Seoul",
      userId: "B",
    });
    resolveLogs([]);
    await oldSync;
    expect(mockUpdateSnapshot).toHaveBeenCalledTimes(1);
    expect(mockUpdateSnapshot.mock.calls[0]?.[0].items).toEqual([
      expect.objectContaining({ title: "B 제목" }),
    ]);
  } finally {
    jest.useRealTimers();
  }
});

it("조회 실패로 기존 snapshot을 지우지 않고 다음 동기화를 허용한다", async () => {
  jest
    .mocked(listItems)
    .mockRejectedValueOnce(new Error("조회 실패"))
    .mockResolvedValueOnce([]);
  const params = {
    language: "ko" as const,
    timezone: "Asia/Seoul",
    userId: "A",
  };
  await expect(syncHomeWidget(params)).rejects.toThrow("조회 실패");
  expect(mockUpdateSnapshot).not.toHaveBeenCalled();
  await syncHomeWidget(params);
  expect(mockUpdateSnapshot).toHaveBeenCalledTimes(1);
});
