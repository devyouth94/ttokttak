import { supabase } from "~/supabase";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID!;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID!;

let configured = false;

async function getGoogle() {
  const google = await import("@react-native-google-signin/google-signin");

  if (!configured) {
    google.GoogleSignin.configure({ iosClientId, webClientId });
    configured = true;
  }

  return google;
}

async function requestToken(): Promise<string> {
  const google = await getGoogle();

  try {
    await google.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const response = await google.GoogleSignin.signIn();

    if (!google.isSuccessResponse(response)) {
      throw new Error("Google 로그인이 취소되었습니다.");
    }

    const token = response.data.idToken;

    if (!token) {
      throw new Error("Google ID 토큰을 받지 못했습니다.");
    }

    return token;
  } catch (error) {
    if (google.isErrorWithCode(error)) {
      switch (error.code) {
        case google.statusCodes.IN_PROGRESS:
          throw new Error("Google 로그인이 이미 진행 중입니다.");
        case google.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error("Google Play 서비스를 사용할 수 없습니다.");
        default:
          throw error;
      }
    }

    throw error instanceof Error
      ? error
      : new Error(`Google 로그인 중 오류가 발생했습니다: ${String(error)}`);
  }
}

/** Google 인증 결과로 Supabase 세션을 만든다. */
export async function signInGoogle(
  getToken: () => Promise<string> = requestToken
): Promise<void> {
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: await getToken(),
  });

  if (error) {
    throw error;
  }
}

/** 현재 기기의 Google 로그인 상태를 정리한다. */
export async function signOutGoogle(): Promise<void> {
  const google = await getGoogle();
  await google.GoogleSignin.signOut();
}
