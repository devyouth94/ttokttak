const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID!;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID!;

let isConfigured = false;

async function getGoogleSigninModule() {
  return import("@react-native-google-signin/google-signin");
}

async function getConfiguredGoogleSignin() {
  const googleSigninModule = await getGoogleSigninModule();

  if (!isConfigured) {
    googleSigninModule.GoogleSignin.configure({
      iosClientId: googleIosClientId,
      webClientId: googleWebClientId,
    });
    isConfigured = true;
  }

  return googleSigninModule;
}

function getGoogleSignInError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Google 로그인 중 오류가 발생했습니다.");
}

export async function signInWithGoogleIdToken(): Promise<string> {
  const googleSigninModule = await getConfiguredGoogleSignin();

  try {
    await googleSigninModule.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const response = await googleSigninModule.GoogleSignin.signIn();

    if (!googleSigninModule.isSuccessResponse(response)) {
      throw new Error("Google 로그인이 취소되었습니다.");
    }

    const idToken = response.data.idToken;

    if (!idToken) {
      throw new Error("Google ID 토큰을 받지 못했습니다.");
    }

    return idToken;
  } catch (error) {
    if (googleSigninModule.isErrorWithCode(error)) {
      switch (error.code) {
        case googleSigninModule.statusCodes.IN_PROGRESS:
          throw new Error("Google 로그인이 이미 진행 중입니다.");
        case googleSigninModule.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error("Google Play 서비스를 사용할 수 없습니다.");
        default:
          throw getGoogleSignInError(error);
      }
    }

    throw getGoogleSignInError(error);
  }
}

export async function signOutFromGoogle(): Promise<void> {
  const googleSigninModule = await getConfiguredGoogleSignin();

  try {
    await googleSigninModule.GoogleSignin.signOut();
  } catch {}
}
