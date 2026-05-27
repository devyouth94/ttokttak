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
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (element: ReactElement) => string;
};
const { useColorScheme } = require("react-native") as {
  useColorScheme: jest.Mock<
    ReturnType<UseColorScheme>,
    Parameters<UseColorScheme>
  >;
};
const { AppThemeProvider } =
  require("./theme-provider") as typeof import("./theme-provider");
const { useAppTheme } =
  require("./theme-context") as typeof import("./theme-context");

describe("AppThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("system 기본값은 현재 기기의 화면 표시 설정을 resolved theme으로 제공한다", () => {
    useColorScheme.mockReturnValue("dark");
    let observedTheme: ReturnType<typeof useAppTheme> | null = null;

    function ThemeProbe(): null {
      observedTheme = useAppTheme();

      return null;
    }

    renderToStaticMarkup(
      React.createElement(
        AppThemeProvider,
        null,
        React.createElement(ThemeProbe, null)
      )
    );

    expect(observedTheme).toMatchObject({
      colors: expect.objectContaining({
        background: "#111315",
        text: "#F4F5F6",
      }),
      resolvedTheme: "dark",
      themePreference: "system",
    });
  });
});
