import { AuthError } from "@supabase/supabase-js";

import { supabase } from "~/supabase";

import { signInLocal } from "./local";

jest.mock("~/supabase", () => ({
  supabase: { auth: { signInWithPassword: jest.fn() } },
}));

const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalDev = __DEV__;

afterEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
  Object.assign(globalThis, { __DEV__: originalDev });
  jest.resetAllMocks();
});

it.each([
  [false, "http://127.0.0.1:54321"],
  [true, "https://production.supabase.co"],
  [true, "http://localhost.evil.test:54321"],
  [true, "http://localhost:54321@evil.test"],
  [true, ""],
])(
  "개발 상태 %s, 주소 %s에서 금지된 인증 요청을 보내지 않는다",
  async (dev, url) => {
    Object.assign(globalThis, { __DEV__: dev });
    process.env.EXPO_PUBLIC_SUPABASE_URL = String(url);

    await expect(
      signInLocal("test@example.com", "test-password")
    ).rejects.toThrow();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  }
);

it.each([
  "http://127.0.0.1:54321",
  "http://localhost:54321/",
  "http://10.0.2.2:54321",
])("%s 로컬 개발 주소에서만 인증을 요청한다", async (url) => {
  Object.assign(globalThis, { __DEV__: true });
  process.env.EXPO_PUBLIC_SUPABASE_URL = url;
  const error = new AuthError("인증 실패");
  jest.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { session: null, user: null },
    error,
  });

  await expect(signInLocal("test@example.com", "test-password")).rejects.toBe(
    error
  );
  expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "test-password",
  });
});
