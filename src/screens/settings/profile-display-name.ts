const MAX_PROFILE_DISPLAY_NAME_LENGTH = 30;

export type ProfileDisplayNameError = "empty" | "tooLong";

type ProfileDisplayNameValidationResult =
  | {
      errorMessage: null;
      value: string;
    }
  | {
      errorMessage: ProfileDisplayNameError;
      value: null;
    };

type EditableProfileDisplayNameInput = {
  email: string | null | undefined;
  metadataName: string | null | undefined;
  profileName: string | null | undefined;
};

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
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {
      errorMessage: "empty",
      value: null,
    };
  }

  if (normalizedValue.length > MAX_PROFILE_DISPLAY_NAME_LENGTH) {
    return {
      errorMessage: "tooLong",
      value: null,
    };
  }

  return {
    errorMessage: null,
    value: normalizedValue,
  };
}

function normalizeNullableName(
  value: string | null | undefined
): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
