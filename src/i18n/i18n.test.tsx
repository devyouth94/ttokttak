import type { ReactElement } from "react";
import { SplashScreen } from "expo-router";

import * as i18nCore from "./i18n";
import { initializeWithFallback } from "./i18n";
import { AppI18nProvider } from "./provider";

declare const require: (moduleName: string) => unknown;

jest.mock("expo-router", () => ({
  SplashScreen: { hideAsync: jest.fn() },
}));
jest.mock("~/ui/app-screen", () => ({ AppScreen: "AppScreen" }));
jest.mock("~/ui/state-message", () => ({ StateMessage: "StateMessage" }));

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { unmount: () => void };
};

describe("표시 언어 초기화", () => {
  it("선택한 언어 적용이 실패하면 한국어를 다시 적용한다", async () => {
    const apply = jest
      .fn<Promise<void>, ["ko" | "en"]>()
      .mockRejectedValueOnce(new Error("초기화 실패"))
      .mockResolvedValueOnce();

    await initializeWithFallback(async () => "en", apply);

    expect(apply).toHaveBeenNthCalledWith(1, "en");
    expect(apply).toHaveBeenNthCalledWith(2, "ko");
  });

  it("한국어 fallback도 실패하면 오류를 돌려준다", async () => {
    const error = new Error("초기화 실패");
    const apply = jest
      .fn<Promise<void>, ["ko" | "en"]>()
      .mockRejectedValue(error);

    await expect(
      initializeWithFallback(async () => "en", apply)
    ).rejects.toThrow(error);
  });

  it("최종 초기화 실패 시 오류 화면을 위해 native splash를 숨긴다", async () => {
    jest
      .spyOn(i18nCore, "initializeAppI18n")
      .mockRejectedValueOnce(new Error("초기화 실패"));

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <AppI18nProvider>
          <></>
        </AppI18nProvider>
      );
      await Promise.resolve();
    });

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    await TestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
