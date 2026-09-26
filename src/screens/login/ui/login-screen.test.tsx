import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "~/legal";
import { useSession } from "~/session/provider";
import { useThemeColors } from "~/theme/provider";

import { LoginScreen } from "./login-screen";

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(),
}));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));
jest.mock("~/theme/provider", () => ({ useThemeColors: jest.fn() }));
jest.mock("~/ui/app-screen", () => ({ AppScreen: "AppScreen" }));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));
jest.mock("./app-logo-icon", () => ({ AppLogoIcon: "AppLogoIcon" }));
jest.mock("./social-icons", () => ({
  AppleLogoIcon: "AppleLogoIcon",
  GoogleLogoIcon: "GoogleLogoIcon",
}));

declare const require: (moduleName: string) => unknown;

type TestInstance = {
  findAllByProps: (props: Record<string, unknown>) => TestInstance[];
  findByProps: (props: Record<string, unknown>) => TestInstance;
  props: {
    onPress?: () => void;
  };
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { root: TestInstance };
};

const signInApple = jest.fn();
const signInGoogle = jest.fn();

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  jest
    .mocked(useTranslation)
    .mockReturnValue({ t: (key: string) => key } as never);
  jest.mocked(useThemeColors).mockReturnValue({
    border: "#ddd",
    primary: "#222",
    primaryForeground: "#fff",
    shadow: "#0001",
    surface: "#fff",
    text: "#222",
    textSoft: "#777",
  } as never);
  jest.mocked(useSession).mockReturnValue({
    signInApple,
    signInGoogle,
    status: "signedOut",
  } as never);
  jest.mocked(AppleAuthentication.isAvailableAsync).mockResolvedValue(true);
  signInApple.mockResolvedValue(undefined);
  signInGoogle.mockResolvedValue(undefined);
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
});

it("지원되는 로그인과 법적 문서 동작을 화면에서 연결한다", async () => {
  const screen = await renderLogin();

  await press(screen, { accessibilityHint: "login.googleHint" });
  await press(screen, { accessibilityHint: "login.appleHint" });

  expect(signInGoogle).toHaveBeenCalledTimes(1);
  expect(signInApple).toHaveBeenCalledTimes(1);

  const links = screen.root
    .findAllByProps({ accessibilityRole: "link" })
    .filter((node) => node.props.onPress);

  await TestRenderer.act(async () => {
    links[0]?.props.onPress?.();
    links[1]?.props.onPress?.();
    await Promise.resolve();
  });

  expect(Linking.openURL).toHaveBeenNthCalledWith(1, TERMS_OF_SERVICE_URL);
  expect(Linking.openURL).toHaveBeenNthCalledWith(2, PRIVACY_POLICY_URL);
});

it("로그인과 법적 문서 열기 실패를 기존 안내로 표시한다", async () => {
  signInGoogle.mockRejectedValueOnce(new Error("로그인 실패"));
  jest
    .mocked(Linking.openURL)
    .mockRejectedValueOnce(new Error("문서 열기 실패"));
  const screen = await renderLogin();

  await press(screen, { accessibilityHint: "login.googleHint" });

  const termsLink = screen.root
    .findAllByProps({ accessibilityRole: "link" })
    .find((node) => node.props.onPress);
  await TestRenderer.act(async () => {
    termsLink?.props.onPress?.();
    await Promise.resolve();
  });

  expect(Alert.alert).toHaveBeenCalledWith(
    "login.googleSignInErrorTitle",
    "로그인 실패"
  );
  expect(Alert.alert).toHaveBeenCalledWith(
    "login.termsOpenErrorTitle",
    "login.termsOpenErrorMessage"
  );
});

async function renderLogin() {
  let screen!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(async () => {
    screen = TestRenderer.create(createElement(LoginScreen));
    await Promise.resolve();
  });

  return screen;
}

async function press(
  screen: ReturnType<typeof TestRenderer.create>,
  props: Record<string, unknown>
): Promise<void> {
  const target = screen.root.findByProps(props);

  await TestRenderer.act(async () => {
    target.props.onPress?.();
    await Promise.resolve();
  });
}
