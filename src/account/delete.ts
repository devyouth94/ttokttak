import * as AppleAuthentication from "expo-apple-authentication";
import type { User } from "@supabase/supabase-js";

import { clearDeviceOutputs } from "~/device-sync-session";
import { signOutGoogle } from "~/session/google";
import { supabase } from "~/supabase";

export class LoginRequiredError extends Error {
  constructor() {
    super("계정 삭제를 진행하려면 다시 로그인이 필요합니다.");
    this.name = "LoginRequiredError";
  }
}

export class AppleAuthRequiredError extends Error {
  constructor() {
    super("Apple 계정 삭제를 진행하려면 Apple 인증이 필요합니다.");
    this.name = "AppleAuthRequiredError";
  }
}

/** 현재 사용자 계정과 로컬 세션 데이터를 함께 삭제한다. */
export async function deleteAccount(user: User | null): Promise<void> {
  if (!user) {
    throw new LoginRequiredError();
  }

  const appleCode = isApple(user) ? await requestAppleCode() : undefined;
  const { error } = await supabase.functions.invoke("delete-account", {
    body: {
      ...(appleCode ? { appleAuthorizationCode: appleCode } : {}),
      confirm: true,
    },
  });

  if (error) {
    throw error;
  }

  const { error: signOutError } = await supabase.auth.signOut({
    scope: "local",
  });

  if (signOutError) {
    throw signOutError;
  }

  await signOutGoogle();
  await clearDeviceOutputs();
}

function isApple(user: User): boolean {
  const { provider, providers } = user.app_metadata;
  return (
    provider === "apple" ||
    (Array.isArray(providers) && providers.includes("apple"))
  );
}

async function requestAppleCode(): Promise<string> {
  const credential = await AppleAuthentication.signInAsync();

  if (!credential.authorizationCode) {
    throw new AppleAuthRequiredError();
  }

  return credential.authorizationCode;
}
