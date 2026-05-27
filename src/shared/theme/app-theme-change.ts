import type { AppThemePreference } from "./app-theme";
import { writeStoredAppThemePreference } from "./app-theme-storage";

type ApplyAppThemePreference = (
  preference: AppThemePreference
) => Promise<void>;
type WriteAppThemePreference = (
  preference: AppThemePreference
) => Promise<void>;

type PersistAppThemePreferenceChangeInput = {
  applyPreference: ApplyAppThemePreference;
  currentPreference: AppThemePreference;
  nextPreference: AppThemePreference;
  writePreference: WriteAppThemePreference;
};

export type PersistAppThemePreferenceChangeResult = {
  didChange: boolean;
  preference: AppThemePreference;
};

type ChangeAppThemePreferenceInput = Pick<
  PersistAppThemePreferenceChangeInput,
  "applyPreference" | "currentPreference" | "nextPreference"
>;

export async function changeAppThemePreference({
  applyPreference,
  currentPreference,
  nextPreference,
}: ChangeAppThemePreferenceInput): Promise<PersistAppThemePreferenceChangeResult> {
  return persistAppThemePreferenceChange({
    applyPreference,
    currentPreference,
    nextPreference,
    writePreference: writeStoredAppThemePreference,
  });
}

export async function persistAppThemePreferenceChange({
  applyPreference,
  currentPreference,
  nextPreference,
  writePreference,
}: PersistAppThemePreferenceChangeInput): Promise<PersistAppThemePreferenceChangeResult> {
  if (currentPreference === nextPreference) {
    return {
      didChange: false,
      preference: currentPreference,
    };
  }

  try {
    await applyPreference(nextPreference);
    await writePreference(nextPreference);
  } catch (error) {
    await restoreRuntimeThemePreference({
      applyPreference,
      currentPreference,
    });

    throw error;
  }

  return {
    didChange: true,
    preference: nextPreference,
  };
}

async function restoreRuntimeThemePreference({
  applyPreference,
  currentPreference,
}: Pick<
  PersistAppThemePreferenceChangeInput,
  "applyPreference" | "currentPreference"
>): Promise<void> {
  try {
    await applyPreference(currentPreference);
  } catch {
    // 복구 실패는 원래 실패 원인을 가리지 않는다.
  }
}
