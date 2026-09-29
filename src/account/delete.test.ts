import type { User } from "@supabase/supabase-js";

import { clearDeviceOutputs } from "~/device-sync-session";
import { signOutGoogle } from "~/session/google";
import { supabase } from "~/supabase";

import { deleteAccount } from "./delete";

jest.mock("~/device-sync-session", () => ({ clearDeviceOutputs: jest.fn() }));
jest.mock("~/session/google", () => ({ signOutGoogle: jest.fn() }));
jest.mock("~/supabase", () => ({
  supabase: {
    auth: { signOut: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

const user: User = {
  app_metadata: { provider: "google", providers: ["google"] },
  aud: "authenticated",
  created_at: "2026-09-29T00:00:00.000Z",
  id: "user-1",
  user_metadata: {},
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(supabase.functions.invoke).mockResolvedValue({
    data: null,
    error: null,
  });
  jest.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
  jest.mocked(signOutGoogle).mockResolvedValue();
  jest.mocked(clearDeviceOutputs).mockResolvedValue();
});

it("계정 삭제 성공 뒤 로컬 세션과 기기 출력을 정리한다", async () => {
  await deleteAccount(user);

  expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(signOutGoogle).toHaveBeenCalledTimes(1);
  expect(clearDeviceOutputs).toHaveBeenCalledTimes(1);
});

it("서버 계정 삭제 실패 시 로컬 상태를 유지한다", async () => {
  const error = new Error("삭제 실패");
  jest.mocked(supabase.functions.invoke).mockResolvedValue({
    data: null,
    error,
  } as never);

  await expect(deleteAccount(user)).rejects.toBe(error);
  expect(supabase.auth.signOut).not.toHaveBeenCalled();
  expect(signOutGoogle).not.toHaveBeenCalled();
  expect(clearDeviceOutputs).not.toHaveBeenCalled();
});
