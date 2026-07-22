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
const { useTheme } = require("./context") as typeof import("./context");
const { ThemeProvider } = require("./theme") as typeof import("./theme");

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
  context: ReturnType<typeof useTheme> | null
): ReturnType<typeof useTheme> {
  if (!context) {
    throw new Error("테마 컨텍스트를 읽지 못했습니다.");
  }

  return context;
}

async function renderTheme(): Promise<() => ReturnType<typeof useTheme>> {
  let theme: ReturnType<typeof useTheme> | null = null;

  function ThemeProbe(): null {
    theme = useTheme();

    return null;
  }

  await TestRenderer.act(async () => {
    TestRenderer.create(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    await Promise.resolve();
  });

  return () => requireThemeContext(theme);
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useColorScheme.mockReturnValue("light");
  });

  it("system 기본값은 현재 기기의 화면 표시 설정을 resolved theme으로 제공한다", async () => {
    useColorScheme.mockReturnValue("dark");
    AsyncStorage.getItem.mockRejectedValue(new Error("저장소 오류"));
    const getTheme = await renderTheme();

    expect(getTheme()).toMatchObject({
      resolvedTheme: "dark",
      themePreference: "system",
    });

    await TestRenderer.act(async () => {
      await getTheme().setThemePreference("system");
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("사용자 변경 저장이 실패하면 저장된 초기 테마를 유지한다", async () => {
    const hydration = createDeferred<string | null>();
    const write = createDeferred<void>();

    useColorScheme.mockReturnValue("dark");
    AsyncStorage.getItem.mockReturnValue(hydration.promise);
    AsyncStorage.setItem.mockReturnValue(write.promise);
    const getTheme = await renderTheme();

    let changePromise!: Promise<void>;
    await TestRenderer.act(async () => {
      changePromise = getTheme().setThemePreference("light");
      await Promise.resolve();
    });

    expect(getTheme()).toMatchObject({
      resolvedTheme: "dark",
      themePreference: "system",
    });

    await TestRenderer.act(async () => {
      hydration.resolve("dark");
      await Promise.resolve();
    });

    expect(getTheme()).toMatchObject({
      resolvedTheme: "dark",
      themePreference: "dark",
    });

    await TestRenderer.act(async () => {
      write.reject(new Error("저장 실패"));
      await expect(changePromise).rejects.toThrow("저장 실패");
    });

    expect(getTheme()).toMatchObject({
      resolvedTheme: "dark",
      themePreference: "dark",
    });
  });

  it("사용자 변경이 성공하면 늦게 도착한 초기 테마를 무시한다", async () => {
    const hydration = createDeferred<string | null>();
    const failedWrite = createDeferred<void>();

    useColorScheme.mockReturnValue("dark");
    AsyncStorage.getItem.mockReturnValue(hydration.promise);
    AsyncStorage.setItem
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(failedWrite.promise);
    const getTheme = await renderTheme();

    await TestRenderer.act(async () => {
      await getTheme().setThemePreference("light");
    });

    expect(getTheme()).toMatchObject({
      resolvedTheme: "light",
      themePreference: "light",
    });

    await TestRenderer.act(async () => {
      hydration.resolve("dark");
      await Promise.resolve();
    });

    expect(getTheme()).toMatchObject({
      resolvedTheme: "light",
      themePreference: "light",
    });

    let failedChange!: Promise<void>;
    await TestRenderer.act(async () => {
      failedChange = getTheme().setThemePreference("system");
      await Promise.resolve();
    });

    await TestRenderer.act(async () => {
      failedWrite.reject(new Error("저장 실패"));
      await expect(failedChange).rejects.toThrow("저장 실패");
    });

    expect(getTheme()).toMatchObject({
      resolvedTheme: "light",
      themePreference: "light",
    });
  });
});
