import * as AppleAuthentication from "expo-apple-authentication";

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
