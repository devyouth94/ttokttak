import { createWidget } from "expo-widgets";

import { listItems } from "~/schedule/db/items";

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
