import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  type AppLanguage,
  appLanguageStorageKey,
  isAppLanguage,
} from "./app-language";

export async function readStoredAppLanguage(): Promise<string | null> {
  return AsyncStorage.getItem(appLanguageStorageKey);
}

export async function writeStoredAppLanguage(
  language: AppLanguage
): Promise<void> {
  if (!isAppLanguage(language)) {
    throw new Error("지원하지 않는 표시 언어입니다.");
  }

  await AsyncStorage.setItem(appLanguageStorageKey, language);
}
