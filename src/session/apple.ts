import * as AppleAuthentication from "expo-apple-authentication";

import { updateName } from "~/account/profile";
import { supabase } from "~/supabase";

/** Apple 인증 결과로 Supabase 세션과 최초 표시 이름을 저장한다. */
export async function signInApple(): Promise<void> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple ID 토큰을 받지 못했습니다.");
    }

    const givenName = credential.fullName?.givenName?.trim() || null;
    const familyName = credential.fullName?.familyName?.trim() || null;
    const displayName =
      [givenName, familyName].filter(Boolean).join(" ") || null;

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });

    if (error) {
      throw error;
    }

    if (displayName && data.user) {
      await updateName(data.user.id, displayName);
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
    ) {
      throw new Error("Apple 로그인이 취소되었습니다.");
    }

    throw error instanceof Error
      ? error
      : new Error(`Apple 로그인 중 오류가 발생했습니다: ${String(error)}`);
  }
}
