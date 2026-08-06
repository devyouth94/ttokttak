import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { TextInput } from "react-native";

import { useSession } from "~/session/provider";

import { AccountSection } from "./account-section";
import { SettingsValueRow } from "./settings-screen-rows";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));
jest.mock("~/theme/provider", () => ({
  useThemeColors: () => ({
    border: "#ddd",
    divider: "#ddd",
    error: "#f00",
    primary: "#222",
    primaryForeground: "#fff",
    scrim: "#888",
    surface: "#fff",
    text: "#222",
    textMuted: "#666",
    textSoft: "#777",
  }),
}));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));

type TestInstance = {
  findAllByType: (type: unknown) => TestInstance[];
  findByProps: (props: Record<string, unknown>) => TestInstance;
  props: Record<string, unknown>;
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { root: TestInstance };
};

const updateName = jest.fn(async () => undefined);

describe("계정 정보 섹션", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useTranslation)
      .mockReturnValue({ t: (key: string) => key } as never);
    jest.mocked(useSession).mockReturnValue({
      profile: { display_name: "기존 이름", timezone: "Asia/Seoul" },
      updateName,
      user: { email: "user@example.com", user_metadata: {} },
    } as never);
  });

  it("표시 이름을 검증한 뒤 저장한다", async () => {
    const section = await renderSection();
    const nameRow = section.root
      .findAllByType(SettingsValueRow)
      .find((row) => row.props.title === "settings.account.name");

    await TestRenderer.act(async () => {
      (nameRow?.props.onPress as (() => void) | undefined)?.();
    });

    const input = section.root.findAllByType(TextInput)[0];
    const saveButton = section.root.findByProps({
      accessibilityLabel: "settings.nameEditor.save",
    });

    await TestRenderer.act(async () => {
      (input?.props.onChangeText as (value: string) => void)("   ");
    });
    await TestRenderer.act(async () => {
      (saveButton.props.onPress as () => void)();
    });

    expect(updateName).not.toHaveBeenCalled();
    expect(
      section.root
        .findAllByType("AppText")
        .some(
          (node) => node.props.children === "settings.nameEditor.emptyError"
        )
    ).toBe(true);

    await TestRenderer.act(async () => {
      (input?.props.onChangeText as (value: string) => void)(" 새 이름 ");
    });
    await TestRenderer.act(async () => {
      (saveButton.props.onPress as () => void)();
    });

    expect(updateName).toHaveBeenCalledWith("새 이름");
  });
});

async function renderSection(): Promise<{ root: TestInstance }> {
  let section!: { root: TestInstance };

  await TestRenderer.act(async () => {
    section = TestRenderer.create(createElement(AccountSection));
  });

  return section;
}
