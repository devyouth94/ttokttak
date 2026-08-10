import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useAppLanguage } from "~/i18n/provider";
import { scheduleFixture } from "~/schedule/fixtures";

import { DetailSummarySection } from "./summary-section";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("lucide-react-native", () => ({ Bell: "Bell", BellOff: "BellOff" }));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/theme/provider", () => ({
  useThemeColors: () => ({ primary: "#222", text: "#000" }),
}));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));
jest.mock("~/ui/state-message", () => ({ StateMessage: "StateMessage" }));

type TestInstance = {
  findAllByType: (type: unknown) => TestInstance[];
  props: Record<string, unknown>;
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { root: TestInstance };
};

it("복구할 수 없는 일정의 안내를 표시한다", async () => {
  jest.mocked(useAppLanguage).mockReturnValue({ language: "ko" } as never);
  jest
    .mocked(useTranslation)
    .mockReturnValue({ t: (key: string) => key } as never);

  let section!: { root: TestInstance };

  await TestRenderer.act(async () => {
    section = TestRenderer.create(
      createElement(DetailSummarySection, {
        item: scheduleFixture({ contentStatus: "unrecoverable" }),
      })
    );
  });

  expect(
    section.root
      .findAllByType("StateMessage")
      .some(
        (message) =>
          message.props.title === "scheduleDetail.contentRecovery.title"
      )
  ).toBe(true);
});
