import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useAppLanguage } from "~/i18n/provider";

import { DetailStatusSection } from "./status-section";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/theme/provider", () => ({
  useThemeColors: () => ({
    primary: "#222",
    primaryForeground: "#fff",
  }),
}));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));

type TestInstance = {
  findAllByType: (type: unknown) => TestInstance[];
  props: Record<string, unknown>;
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { root: TestInstance };
};

it("지난 일정 한 건은 시간대 기준으로 지난 날짜 수를 표시한다", async () => {
  jest.mocked(useAppLanguage).mockReturnValue({ language: "ko" } as never);
  jest.mocked(useTranslation).mockReturnValue({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  } as never);

  let section!: { root: TestInstance };

  await TestRenderer.act(async () => {
    section = TestRenderer.create(
      createElement(DetailStatusSection, {
        isEntryOccurrence: false,
        now: new Date("2026-04-10T03:00:00.000Z"),
        occurrence: {
          localDate: "2026-04-08",
          scheduledAtUtc: "2026-04-08T00:00:00.000Z",
          status: "overdue",
        },
        overdueCount: 1,
        timezone: "Asia/Seoul",
      })
    );
  });

  expect(
    section.root.findAllByType("AppText").map((node) => node.props.children)
  ).toContain("scheduleDetail.status.overdueDays:2 오전 9:00");
});
