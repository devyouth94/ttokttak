const MAX_PROFILE_DISPLAY_NAME_LENGTH = 30;

export function normalizeProfileDisplayName(value: string): string {
  return value.trim();
}

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
  value: string
): ProfileDisplayNameValidationResult {
  const normalizedValue = normalizeProfileDisplayName(value);

  if (!normalizedValue) {
    return {
      errorMessage: "이름을 입력해 주세요.",
      value: null,
    };
  }

  if (normalizedValue.length > MAX_PROFILE_DISPLAY_NAME_LENGTH) {
    return {
      errorMessage: "이름은 30자 이하로 입력해 주세요.",
      value: null,
    };
  }

  return {
    errorMessage: null,
    value: normalizedValue,
  };
}
