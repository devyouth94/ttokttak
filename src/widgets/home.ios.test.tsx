import { createWidget } from "expo-widgets";

import { scheduleFixture } from "~/schedule/fixtures";

import { applyHomeWidget } from "./home.ios";

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

const mockHomeWidget = jest.mocked(createWidget).mock.results[0]?.value;

if (!mockHomeWidget) {
  throw new Error("테스트 위젯이 생성되지 않았습니다.");
}

const mockUpdateSnapshot = jest.mocked(mockHomeWidget.updateSnapshot);

beforeEach(() => {
  mockUpdateSnapshot.mockClear();
});

it("준비된 기준시각과 기록으로 위젯을 만들고 종료 시 로그인 안내로 비운다", () => {
  applyHomeWidget({
    language: "ko",
    timezone: "Asia/Seoul",
    userId: "A",
    now: new Date("2026-04-10T03:00:00.000Z"),
    items: [scheduleFixture({ title: "현재 일정" })],
    completionLogs: [],
  });
  expect(mockUpdateSnapshot.mock.calls[0]?.[0].items).toEqual([
    expect.objectContaining({ title: "현재 일정" }),
  ]);
  applyHomeWidget(null);
  expect(mockUpdateSnapshot).toHaveBeenLastCalledWith({
    emptyMessage: "home.widget.login",
    items: [],
    moreMedium: "",
    moreSmall: "",
  });
});
