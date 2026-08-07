import { createElement, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";

import type { AppLanguage } from "~/i18n/language";
import { appI18nResources } from "~/i18n/resources";

import { CalendarDayCell } from "./calendar-day-cell";

declare const require: (moduleName: string) => unknown;

jest.mock("~/theme/provider", () => ({
  useThemeColors: () => ({
    blue: "#00f",
    border: "#ddd",
    primary: "#222",
    primaryForeground: "#fff",
    red: "#f00",
    surface: "#fff",
    text: "#222",
    textMuted: "#666",
  }),
}));

type TestInstance = {
  findByProps: (props: Record<string, unknown>) => TestInstance;
  props: Record<string, unknown>;
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { root: TestInstance };
};

it("날짜 셀 접근성 문구는 표시 언어를 따른다", async () => {
  const cases = [
    {
      hint: "선택 날짜를 바꿉니다.",
      label: "8월 7일 금요일, 오늘, 선택됨, 빨강, 파랑, 외 2개",
      language: "ko",
    },
    {
      hint: "Change the selected date.",
      label: "Friday, Aug 7, Today, Selected, Red, Blue, 2 more",
      language: "en",
    },
  ] as const;

  for (const testCase of cases) {
    const cell = await renderCell(testCase.language);
    const button = cell.root.findByProps({ accessibilityRole: "button" });

    expect(button.props.accessibilityHint).toBe(testCase.hint);
    expect(button.props.accessibilityLabel).toBe(testCase.label);
  }
});

async function renderCell(language: AppLanguage) {
  const i18n = createInstance();

  await i18n.init({
    fallbackLng: "ko",
    lng: language,
    resources: appI18nResources,
    supportedLngs: ["ko", "en"],
  });

  let cell!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    cell = TestRenderer.create(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(CalendarDayCell, {
          date: {
            dateString: "2026-08-07",
            day: 7,
            month: 8,
            timestamp: 1_786_060_800_000,
            year: 2026,
          },
          isSelected: true,
          isToday: true,
          markerColorKeys: ["red", "blue"],
          onPress: jest.fn(),
          overflowCount: 2,
        })
      )
    );
  });

  return cell;
}
