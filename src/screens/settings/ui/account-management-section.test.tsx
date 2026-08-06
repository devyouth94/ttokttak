import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import { useSession } from "~/session/provider";

import { AccountManagementSection } from "./account-management-section";
import { SettingsRow } from "./settings-screen-rows";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("~/account/delete", () => ({
  AppleAuthRequiredError: class AppleAuthRequiredError extends Error {},
  LoginRequiredError: class LoginRequiredError extends Error {},
}));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));
jest.mock("~/theme/provider", () => ({
  useThemeColors: () => ({
    divider: "#ddd",
    error: "#f00",
    surface: "#fff",
    textSoft: "#777",
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

const deleteAccount = jest.fn(async () => undefined);

describe("계정 관리 섹션", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useTranslation)
      .mockReturnValue({ t: (key: string) => key } as never);
    jest.mocked(useSession).mockReturnValue({
      deleteAccount,
      signOut: jest.fn(async () => undefined),
    } as never);
  });

  it("확인 뒤 계정을 삭제한다", async () => {
    const alert = jest.spyOn(Alert, "alert");
    const section = await renderSection();
    const deleteRow = section.root
      .findAllByType(SettingsRow)
      .find((row) => row.props.title === "settings.accountManagement.delete");

    await TestRenderer.act(async () => {
      (deleteRow?.props.onPress as (() => void) | undefined)?.();
    });

    const buttons = alert.mock.calls.at(-1)?.[2];
    const confirm = buttons?.find((button) => button.style === "destructive");

    await TestRenderer.act(async () => {
      confirm?.onPress?.();
    });

    expect(deleteAccount).toHaveBeenCalledTimes(1);
  });
});

async function renderSection(): Promise<{ root: TestInstance }> {
  let section!: { root: TestInstance };

  await TestRenderer.act(async () => {
    section = TestRenderer.create(createElement(AccountManagementSection));
  });

  return section;
}
