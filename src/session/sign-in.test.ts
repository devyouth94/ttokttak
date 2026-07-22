import * as AppleAuthentication from "expo-apple-authentication";

import { updateName } from "~/account/profile";
import { supabase } from "~/supabase";

import { signInApple } from "./apple";
import { signInGoogle } from "./google";

jest.mock("expo-apple-authentication", () => ({
  AppleAuthenticationScope: { EMAIL: 0, FULL_NAME: 1 },
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
}));
jest.mock("~/account/profile", () => ({
  updateName: jest.fn(),
}));
jest.mock("~/supabase", () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
    },
  },
}));

describe("소셜 로그인", () => {
  const signInWithIdToken = jest.mocked(supabase.auth.signInWithIdToken);

  beforeEach(() => {
    jest.clearAllMocks();
    signInWithIdToken.mockResolvedValue({ data: {}, error: null } as never);
  });

  it("Google ID 토큰으로 로그인한다", async () => {
    await signInGoogle(async () => "google-token");

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "google-token",
    });
  });

  it("Apple ID 토큰과 이름으로 로그인한다", async () => {
    signInWithIdToken.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    jest.mocked(AppleAuthentication.signInAsync).mockResolvedValue({
      fullName: { familyName: "홍", givenName: "길동" },
      identityToken: "apple-token",
    } as never);

    await signInApple();

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: "apple",
      token: "apple-token",
    });
    expect(updateName).toHaveBeenCalledWith("user-1", "길동 홍");
  });

  it("Apple 이름이 없으면 표시 이름을 수정하지 않는다", async () => {
    signInWithIdToken.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    jest.mocked(AppleAuthentication.signInAsync).mockResolvedValue({
      fullName: null,
      identityToken: "apple-token",
    } as never);

    await signInApple();

    expect(updateName).not.toHaveBeenCalled();
  });
});
