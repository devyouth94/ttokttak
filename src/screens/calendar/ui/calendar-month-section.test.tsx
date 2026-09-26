import { createElement, type ReactElement } from "react";

import type { AppLanguage } from "~/i18n/language";
import { useAppLanguage } from "~/i18n/provider";
import { useTheme } from "~/theme/provider";

import { CalendarMonthSection } from "./calendar-month-section";

declare const require: (moduleName: string) => unknown;

jest.mock("react-native-calendars", () => ({
  Calendar: jest.fn(() => null),
  LocaleConfig: { defaultLocale: "", locales: {} },
}));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/theme/provider", () => ({ useTheme: jest.fn() }));

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    update: (element: ReactElement) => void;
  };
};
const { Calendar, LocaleConfig } = require("react-native-calendars") as {
  Calendar: jest.Mock;
  LocaleConfig: { defaultLocale: string };
};

it("캘린더를 렌더하기 전에 표시 언어 locale을 적용한다", async () => {
  let language: AppLanguage = "ko";
  const renderedLocales: string[] = [];
  Calendar.mockImplementation(() => {
    renderedLocales.push(LocaleConfig.defaultLocale);
    return null;
  });

  jest
    .mocked(useAppLanguage)
    .mockImplementation(
      () => ({ language }) as ReturnType<typeof useAppLanguage>
    );
  jest.mocked(useTheme).mockReturnValue({
    colors: {
      blue: "#00f",
      primary: "#222",
      primaryForeground: "#fff",
      red: "#f00",
      surface: "#fff",
      text: "#222",
      textMuted: "#666",
    },
    resolvedTheme: "light",
  } as never);

  let section!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    section = TestRenderer.create(createSection());
  });

  expect(renderedLocales.length).toBeGreaterThan(0);
  expect(renderedLocales.every((locale) => locale === "ko")).toBe(true);

  language = "en";
  renderedLocales.length = 0;

  await TestRenderer.act(() => {
    section.update(createSection());
  });

  expect(renderedLocales.length).toBeGreaterThan(0);
  expect(renderedLocales.every((locale) => locale === "")).toBe(true);
});

function createSection(): ReactElement {
  return createElement(CalendarMonthSection, {
    occurrenceEntries: [],
    onSelectDate: jest.fn(),
    selectedDate: "2026-08-01",
    today: "2026-08-07",
  });
}
