import * as AppleAuthentication from "expo-apple-authentication";

export type AppleSignInResult = {
  authorizationCode: string;
  displayName: string | null;
  familyName: string | null;
  givenName: string | null;
  identityToken: string;
};

type ErrorWithCode = {
  code: string;
};

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

function trimNamePart(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getDisplayName(
  givenName: string | null,
  familyName: string | null
): string | null {
  const nameParts = [givenName, familyName].filter(Boolean) as string[];

  return nameParts.length > 0 ? nameParts.join(" ") : null;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithAppleIdToken(): Promise<AppleSignInResult> {
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

    if (!credential.authorizationCode) {
      throw new Error("Apple 인증 코드를 받지 못했습니다.");
    }

    const givenName = trimNamePart(credential.fullName?.givenName);
    const familyName = trimNamePart(credential.fullName?.familyName);

    return {
      authorizationCode: credential.authorizationCode,
      displayName: getDisplayName(givenName, familyName),
      familyName,
      givenName,
      identityToken: credential.identityToken,
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === "ERR_REQUEST_CANCELED") {
      throw new Error("Apple 로그인이 취소되었습니다.");
    }

    throw error instanceof Error
      ? error
      : new Error(`Apple 로그인 중 오류가 발생했습니다: ${String(error)}`);
  }
}

export async function requestAppleAuthorizationCodeForAccountDeletion(): Promise<string> {
  try {
    const credential = await AppleAuthentication.signInAsync();

    if (!credential.authorizationCode) {
      throw new Error("Apple 인증 코드를 받지 못했습니다.");
    }

    return credential.authorizationCode;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === "ERR_REQUEST_CANCELED") {
      throw new Error("Apple 인증이 취소되었습니다.");
    }

    throw error instanceof Error
      ? error
      : new Error(`Apple 인증 중 오류가 발생했습니다: ${String(error)}`);
  }
}
