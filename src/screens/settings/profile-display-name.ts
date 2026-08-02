import type { AppLanguage } from "~/i18n/app-language";

const MAX_PROFILE_DISPLAY_NAME_LENGTH = 30;

const profileDisplayNameValidationMessages = {
  en: {
    empty: "Enter a name.",
    tooLong: "Enter a name with 30 characters or fewer.",
  },
  ko: {
    empty: "이름을 입력해 주세요.",
    tooLong: "이름은 30자 이하로 입력해 주세요.",
  },
} as const satisfies Record<AppLanguage, Record<"empty" | "tooLong", string>>;

type ProfileDisplayNameValidationResult =
  | {
      errorMessage: null;
      value: string;
    }
  | {
      errorMessage: string;
      value: null;
    };

type EditableProfileDisplayNameInput = {
  email: string | null | undefined;
  metadataName: string | null | undefined;
  profileName: string | null | undefined;
};

function normalizeNullableName(
  value: string | null | undefined
): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getEditableProfileDisplayName({
  email,
  metadataName,
  profileName,
}: EditableProfileDisplayNameInput): string {
  const normalizedProfileName = normalizeNullableName(profileName);
  const normalizedEmail = normalizeNullableName(email);

  if (normalizedProfileName && normalizedProfileName !== normalizedEmail) {
    return normalizedProfileName;
  }

  return normalizeNullableName(metadataName) ?? "";
}

export function validateProfileDisplayName(
  value: string,
  language: AppLanguage = "ko"
): ProfileDisplayNameValidationResult {
  const normalizedValue = value.trim();
  const messages = profileDisplayNameValidationMessages[language];

  if (!normalizedValue) {
    return {
      errorMessage: messages.empty,
      value: null,
    };
  }

  if (normalizedValue.length > MAX_PROFILE_DISPLAY_NAME_LENGTH) {
    return {
      errorMessage: messages.tooLong,
      value: null,
    };
  }

  return {
    errorMessage: null,
    value: normalizedValue,
  };
}
