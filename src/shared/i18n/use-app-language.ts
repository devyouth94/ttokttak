import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import {
  type AppLanguage,
  fallbackAppLanguage,
  isAppLanguage,
} from "./app-language";
import { changeAppLanguage } from "./app-language-change";

type UseAppLanguageResult = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

export function useAppLanguage(): UseAppLanguageResult {
  const { i18n } = useTranslation();
  const language = normalizeI18nLanguage(
    i18n.resolvedLanguage ?? i18n.language
  );

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    await changeAppLanguage(nextLanguage);
  }, []);

  return {
    language,
    setLanguage,
  };
}

function normalizeI18nLanguage(language: string | undefined): AppLanguage {
  if (isAppLanguage(language)) {
    return language;
  }

  const baseLanguage = language?.split("-")[0];

  if (isAppLanguage(baseLanguage)) {
    return baseLanguage;
  }

  return fallbackAppLanguage;
}
