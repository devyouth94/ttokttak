import { createElement, type ReactElement } from "react";

import { LoginScreen } from "~/screens/login/ui/login-screen";
import { useSession } from "~/session/provider";

import IndexRoute from "../../../app/index";

jest.mock("expo-router", () => ({ Redirect: "Redirect" }));
jest.mock("~/screens/login/ui/login-screen", () => ({
  LoginScreen: "LoginScreen",
}));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

declare const require: (moduleName: string) => unknown;

type TestInstance = {
  findByType: (type: unknown) => TestInstance;
  props: Record<string, unknown>;
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => void) => Promise<void>;
  create: (element: ReactElement) => {
    root: TestInstance;
    toJSON: () => unknown;
  };
};

it("세션 준비 중에는 로그인 화면을 열지 않는다", async () => {
  const route = await renderRoute("loading");

  expect(route.toJSON()).toBeNull();
});

it("준비된 세션은 홈으로 이동한다", async () => {
  const route = await renderRoute("ready");

  expect(route.root.findByType("Redirect").props.href).toBe("/(tabs)/home");
});

it.each(["signedOut", "error"] as const)(
  "%s 세션에는 화면 모듈의 로그인을 표시한다",
  async (status) => {
    const route = await renderRoute(status);

    expect(route.root.findByType(LoginScreen)).toBeDefined();
  }
);

async function renderRoute(
  status: "error" | "loading" | "ready" | "signedOut"
) {
  jest.mocked(useSession).mockReturnValue({ status } as never);
  let route!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    route = TestRenderer.create(createElement(IndexRoute));
  });

  return route;
}
