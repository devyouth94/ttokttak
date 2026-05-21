import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { createInstance } from "i18next";

import { bootstrapAppI18n } from "./app-i18n-bootstrap";
import {
  type AppLanguage,
  appLanguages,
  fallbackAppLanguage,
  resolveInitialAppLanguage,
} from "./app-language";
import { readStoredAppLanguage } from "./app-language-storage";
import { appI18nResources } from "./resources";

export const appI18n = createInstance();

let appI18nInitialization: Promise<AppLanguage> | null = null;

export function ensureAppI18nInitialized(): Promise<AppLanguage> {
  appI18nInitialization ??= bootstrapAppI18n({
    applyLanguage: applyAppI18nLanguage,
    resolveInitialLanguage: () =>
      resolveInitialAppLanguage({
        getDeviceLocales: getLocales,
        readStoredLanguage: readStoredAppLanguage,
      }),
  });

  return appI18nInitialization;
}

async function applyAppI18nLanguage(language: AppLanguage): Promise<void> {
  if (appI18n.isInitialized) {
    await appI18n.changeLanguage(language);
    return;
  }

  await appI18n.use(initReactI18next).init({
    fallbackLng: fallbackAppLanguage,
    interpolation: {
      escapeValue: false,
    },
    lng: language,
    resources: appI18nResources,
    supportedLngs: appLanguages,
  });
}
