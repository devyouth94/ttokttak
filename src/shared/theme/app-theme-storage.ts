import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  type AppThemePreference,
  appThemePreferenceStorageKey,
  isAppThemePreference,
} from "./app-theme";

export async function readStoredAppThemePreference(): Promise<string | null> {
  return AsyncStorage.getItem(appThemePreferenceStorageKey);
}

export async function writeStoredAppThemePreference(
  preference: AppThemePreference
): Promise<void> {
  if (!isAppThemePreference(preference)) {
    throw new Error("지원하지 않는 테마입니다.");
  }

  await AsyncStorage.setItem(appThemePreferenceStorageKey, preference);
}
