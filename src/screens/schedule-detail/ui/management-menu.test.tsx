import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";

import { useDeviceSync } from "~/device-sync";
import { scheduleFixture } from "~/schedule/fixtures";
import { archiveSchedule } from "~/schedule/write";

import { DetailManagementMenu } from "./management-menu";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock("@rn-primitives/dropdown-menu", () => ({
  Content: "DropdownMenuContent",
  Item: "DropdownMenuItem",
  Overlay: "DropdownMenuOverlay",
  Portal: "DropdownMenuPortal",
  Root: "DropdownMenuRoot",
  Trigger: "DropdownMenuTrigger",
}));
jest.mock("~/device-sync", () => ({
  useDeviceSync: jest.fn(),
}));
jest.mock("~/schedule/write", () => ({ archiveSchedule: jest.fn() }));
jest.mock("~/theme/provider", () => ({
  useThemeColors: () => ({
    error: "#f00",
    surface: "#fff",
    text: "#000",
  }),
}));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));

type TestInstance = {
  findAllByProps: (props: Record<string, unknown>) => TestInstance[];
  findByProps: (props: Record<string, unknown>) => TestInstance;
  props: Record<string, unknown>;
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { root: TestInstance };
};

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
const syncDeviceOutputs = jest.fn(async () => undefined);

describe("일정 상세 관리 메뉴", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useTranslation)
      .mockReturnValue({ t: (key: string) => key } as never);
    jest.mocked(useDeviceSync).mockReturnValue({ syncDeviceOutputs } as never);
    jest.mocked(archiveSchedule).mockResolvedValue(undefined);
  });

  it("일정 수정 화면으로 이동한다", async () => {
    const menu = await renderMenu(scheduleFixture());
    const editButton = menu.root.findByProps({
      accessibilityHint: "scheduleDetail.management.editHint",
    });

    await TestRenderer.act(async () => {
      (editButton.props.onPress as () => void)();
    });

    expect(router.push).toHaveBeenCalledWith({
      params: { itemId: "item-1", returnTo: "/schedule" },
      pathname: "/items/[itemId]/edit",
    });
  });

  it("복구할 수 없는 일정은 수정 없이 삭제한다", async () => {
    const item = scheduleFixture({ contentStatus: "unrecoverable" });
    const menu = await renderMenu(item);

    expect(
      menu.root.findAllByProps({
        accessibilityHint: "scheduleDetail.management.editHint",
      })
    ).toHaveLength(0);
    await confirmDelete(menu.root);

    expect(archiveSchedule).toHaveBeenCalledWith({
      itemId: item.id,
      syncDeviceOutputs,
    });
    expect(router.replace).toHaveBeenCalledWith("/schedule");
  });

  it("삭제에 실패하면 오류를 표시하고 이동하지 않는다", async () => {
    jest.mocked(archiveSchedule).mockRejectedValue(new Error("삭제 실패"));
    const menu = await renderMenu(scheduleFixture());

    await confirmDelete(menu.root);

    expect(alert).toHaveBeenNthCalledWith(
      2,
      "scheduleDetail.inlineErrorTitle",
      "삭제 실패"
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
});

async function renderMenu(
  item: ReturnType<typeof scheduleFixture>
): Promise<{ root: TestInstance }> {
  let menu!: { root: TestInstance };

  await TestRenderer.act(async () => {
    menu = TestRenderer.create(
      createElement(DetailManagementMenu, {
        item,
        returnTo: "/schedule",
      })
    );
  });

  return menu;
}

async function confirmDelete(root: TestInstance): Promise<void> {
  const deleteButton = root.findByProps({
    accessibilityHint: "scheduleDetail.management.deleteHint",
  });

  await TestRenderer.act(async () => {
    (deleteButton.props.onPress as () => void)();
  });

  const confirmButton = alert.mock.calls[0]?.[2]?.find(
    (button) => button.style === "destructive"
  );

  await TestRenderer.act(async () => {
    confirmButton?.onPress?.();
    await Promise.resolve();
  });
}
