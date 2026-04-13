import * as AppleAuthentication from "expo-apple-authentication";

export type AppleSignInResult = {
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
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function getDisplayName(
  givenName: string | null,
  familyName: string | null
): string | null {
  const nameParts = [givenName, familyName].filter(
    (value): value is string => value !== null
  );

  if (nameParts.length === 0) {
    return null;
  }

  return nameParts.join(" ");
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

    const givenName = trimNamePart(credential.fullName?.givenName);
    const familyName = trimNamePart(credential.fullName?.familyName);

    return {
      displayName: getDisplayName(givenName, familyName),
      familyName,
      givenName,
      identityToken: credential.identityToken,
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === "ERR_REQUEST_CANCELED") {
      throw new Error("Apple 로그인이 취소되었습니다.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Apple 로그인 중 오류가 발생했습니다.");
  }
}
