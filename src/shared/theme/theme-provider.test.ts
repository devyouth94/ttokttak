import type { ReactElement } from "react";

declare const require: (moduleName: string) => unknown;

jest.mock("react-native", () => ({
  useColorScheme: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

type UseColorScheme = typeof import("react-native").useColorScheme;

const React = require("react") as typeof import("react");
const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { unmount: () => void };
};
const { useColorScheme } = require("react-native") as {
  useColorScheme: jest.Mock<
    ReturnType<UseColorScheme>,
    Parameters<UseColorScheme>
  >;
};
const AsyncStorage = require("@react-native-async-storage/async-storage") as {
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
};
const { AppThemeProvider } =
  require("./theme-provider") as typeof import("./theme-provider");
const { useAppTheme } =
  require("./theme-context") as typeof import("./theme-context");

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function requireThemeContext(
  context: ReturnType<typeof useAppTheme> | null
): ReturnType<typeof useAppTheme> {
  if (!context) {
    throw new Error("테마 컨텍스트를 읽지 못했습니다.");
  }

  return context;
}

describe("AppThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useColorScheme.mockReturnValue("light");
  });

  it("system 기본값은 현재 기기의 화면 표시 설정을 resolved theme으로 제공한다", async () => {
    useColorScheme.mockReturnValue("dark");
    let observedTheme: ReturnType<typeof useAppTheme> | null = null;

    function ThemeProbe(): null {
      observedTheme = useAppTheme();

      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppThemeProvider,
          null,
          React.createElement(ThemeProbe, null)
        )
      );
      await Promise.resolve();
    });

    expect(observedTheme).toMatchObject({
      colors: expect.objectContaining({
        background: "#111315",
        text: "#F4F5F6",
      }),
      resolvedTheme: "dark",
      themePreference: "system",
    });
  });

  it("저장된 초기 테마가 늦게 도착한 뒤 사용자 변경 저장이 실패하면 저장된 테마로 복구한다", async () => {
    const hydration = createDeferred<string | null>();
    const write = createDeferred<void>();
    let observedTheme: ReturnType<typeof useAppTheme> | null = null;

    useColorScheme.mockReturnValue("dark");
    AsyncStorage.getItem.mockReturnValue(hydration.promise);
    AsyncStorage.setItem.mockReturnValue(write.promise);

    function ThemeProbe(): null {
      observedTheme = useAppTheme();

      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppThemeProvider,
          null,
          React.createElement(ThemeProbe, null)
        )
      );
      await Promise.resolve();
    });

    const currentTheme = requireThemeContext(observedTheme);
    let changePromise!: Promise<void>;
    await TestRenderer.act(async () => {
      changePromise = currentTheme.setThemePreference("light");
      await Promise.resolve();
    });

    expect(observedTheme).toMatchObject({
      resolvedTheme: "light",
      themePreference: "light",
    });

    await TestRenderer.act(async () => {
      hydration.resolve("dark");
      await Promise.resolve();
    });

    expect(observedTheme).toMatchObject({
      resolvedTheme: "light",
      themePreference: "light",
    });

    await TestRenderer.act(async () => {
      write.reject(new Error("저장 실패"));
      await expect(changePromise).rejects.toThrow("저장 실패");
    });

    expect(observedTheme).toMatchObject({
      resolvedTheme: "dark",
      themePreference: "dark",
    });
  });

  it("사용자 변경이 성공한 뒤 늦게 도착한 초기 테마는 실패 복구 기준을 덮지 않는다", async () => {
    const hydration = createDeferred<string | null>();
    const failedWrite = createDeferred<void>();
    let observedTheme: ReturnType<typeof useAppTheme> | null = null;

    useColorScheme.mockReturnValue("dark");
    AsyncStorage.getItem.mockReturnValue(hydration.promise);
    AsyncStorage.setItem
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(failedWrite.promise);

    function ThemeProbe(): null {
      observedTheme = useAppTheme();

      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppThemeProvider,
          null,
          React.createElement(ThemeProbe, null)
        )
      );
      await Promise.resolve();
    });

    await TestRenderer.act(async () => {
      await requireThemeContext(observedTheme).setThemePreference("light");
    });

    expect(observedTheme).toMatchObject({
      resolvedTheme: "light",
      themePreference: "light",
    });

    await TestRenderer.act(async () => {
      hydration.resolve("dark");
      await Promise.resolve();
    });

    expect(observedTheme).toMatchObject({
      resolvedTheme: "light",
      themePreference: "light",
    });

    let failedChange!: Promise<void>;
    await TestRenderer.act(async () => {
      failedChange =
        requireThemeContext(observedTheme).setThemePreference("system");
      await Promise.resolve();
    });

    await TestRenderer.act(async () => {
      failedWrite.reject(new Error("저장 실패"));
      await expect(failedChange).rejects.toThrow("저장 실패");
    });

    expect(observedTheme).toMatchObject({
      resolvedTheme: "light",
      themePreference: "light",
    });
  });
});
