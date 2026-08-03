import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createInstance } from "i18next";

import {
  type AppLanguage,
  appLanguages,
  fallbackAppLanguage,
  normalizeAppLanguage,
  resolveAppLanguage,
} from "./language";
import { appI18nResources } from "./resources";

const APP_LANGUAGE_STORAGE_KEY = "ttokttak:app-display-language";

type ApplyLanguage = (language: AppLanguage) => Promise<void>;

export const appI18n = createInstance();

let initialization: Promise<void> | null = null;

export function initializeAppI18n(): Promise<void> {
  initialization ??= initializeWithFallback(
    resolveInitialLanguage,
    applyLanguage
  ).catch((error: unknown) => {
    initialization = null;
    throw error;
  });

  return initialization;
}

export async function initializeWithFallback(
  resolveLanguage: () => Promise<AppLanguage>,
  apply: ApplyLanguage
): Promise<void> {
  try {
    await apply(await resolveLanguage());
  } catch {
    await apply(fallbackAppLanguage);
  }
}

export async function changeAppLanguage(
  nextLanguage: AppLanguage
): Promise<void> {
  await persistLanguageChange(
    normalizeAppLanguage(appI18n.resolvedLanguage ?? appI18n.language),
    nextLanguage,
    applyLanguage,
    (language) => AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language)
  );
}

export async function persistLanguageChange(
  currentLanguage: AppLanguage,
  nextLanguage: AppLanguage,
  apply: ApplyLanguage,
  save: ApplyLanguage
): Promise<void> {
  if (currentLanguage === nextLanguage) {
    return;
  }

  try {
    await apply(nextLanguage);
    await save(nextLanguage);
  } catch (error) {
    try {
      await apply(currentLanguage);
    } catch {
      // 복구 실패는 원래 실패 원인을 가리지 않는다.
    }

    throw error;
  }
}

async function resolveInitialLanguage(): Promise<AppLanguage> {
  try {
    const locale = getLocales()[0];

    return resolveAppLanguage({
      deviceLanguage: locale?.languageCode ?? locale?.languageTag,
      storedLanguage: await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY),
    });
  } catch {
    return fallbackAppLanguage;
  }
}

async function applyLanguage(language: AppLanguage): Promise<void> {
  if (appI18n.isInitialized) {
    await appI18n.changeLanguage(language);
    return;
  }

  await appI18n.use(initReactI18next).init({
    fallbackLng: fallbackAppLanguage,
    interpolation: { escapeValue: false },
    lng: language,
    resources: appI18nResources,
    supportedLngs: appLanguages,
  });
}
