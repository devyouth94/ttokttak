import * as AppleAuthentication from "expo-apple-authentication";

import { cancelNotifications } from "~/notifications/session";
import { signOutGoogle } from "~/session/google";
import { supabase } from "~/supabase";

import {
  AppleAuthRequiredError,
  deleteAccount,
  LoginRequiredError,
} from "./delete";

jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
}));
jest.mock("~/notifications/session", () => ({
  cancelNotifications: jest.fn(),
}));
jest.mock("~/session/google", () => ({
  signOutGoogle: jest.fn(),
}));
jest.mock("~/supabase", () => ({
  supabase: {
    auth: { signOut: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

function createUser(provider: "apple" | "google") {
  return {
    app_metadata: { provider, providers: [provider] },
    aud: "authenticated",
    created_at: "2026-07-13T00:00:00.000Z",
    id: "user-1",
    user_metadata: {},
  } as never;
}

function mockClient(invokeError: Error | null = null) {
  const invoke = jest.mocked(supabase.functions.invoke);
  const signOut = jest.mocked(supabase.auth.signOut);
  invoke.mockResolvedValue({ error: invokeError } as never);
  signOut.mockResolvedValue({ error: null });

  return { invoke, signOut };
}

describe("deleteAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(cancelNotifications).mockResolvedValue();
    jest.mocked(signOutGoogle).mockResolvedValue();
  });

  it("계정 삭제 성공 뒤 로컬 세션과 알림을 정리한다", async () => {
    const { invoke, signOut } = mockClient();

    await deleteAccount(createUser("google"));

    expect(invoke).toHaveBeenCalledWith("delete-account", {
      body: { confirm: true },
    });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signOutGoogle).toHaveBeenCalledTimes(1);
    expect(cancelNotifications).toHaveBeenCalledTimes(1);
  });

  it("계정 삭제 호출이 실패하면 로컬 세션과 알림을 유지한다", async () => {
    const error = new Error("삭제 실패");
    const { signOut } = mockClient(error);

    await expect(deleteAccount(createUser("google"))).rejects.toThrow(error);

    expect(signOut).not.toHaveBeenCalled();
    expect(signOutGoogle).not.toHaveBeenCalled();
    expect(cancelNotifications).not.toHaveBeenCalled();
  });

  it("현재 사용자가 없으면 다시 로그인을 요구한다", async () => {
    await expect(deleteAccount(null)).rejects.toBeInstanceOf(
      LoginRequiredError
    );

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("Apple 계정이면 재인증 코드를 삭제 함수에 전달한다", async () => {
    const { invoke } = mockClient();
    jest
      .mocked(AppleAuthentication.signInAsync)
      .mockResolvedValue({ authorizationCode: "apple-code" } as never);

    await deleteAccount(createUser("apple"));

    expect(invoke).toHaveBeenCalledWith("delete-account", {
      body: { appleAuthorizationCode: "apple-code", confirm: true },
    });
  });

  it("Apple 재인증 코드가 없으면 삭제하지 않는다", async () => {
    const { invoke } = mockClient();
    jest
      .mocked(AppleAuthentication.signInAsync)
      .mockResolvedValue({ authorizationCode: null } as never);

    await expect(deleteAccount(createUser("apple"))).rejects.toBeInstanceOf(
      AppleAuthRequiredError
    );

    expect(invoke).not.toHaveBeenCalled();
  });
});
