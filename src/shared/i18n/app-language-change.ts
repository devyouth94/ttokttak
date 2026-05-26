import { appI18n } from "./app-i18n";
import {
  type AppLanguage,
  fallbackAppLanguage,
  isAppLanguage,
} from "./app-language";
import { writeStoredAppLanguage } from "./app-language-storage";

type ApplyAppLanguage = (language: AppLanguage) => Promise<void>;
type WriteAppLanguage = (language: AppLanguage) => Promise<void>;

type PersistAppLanguageChangeInput = {
  applyLanguage: ApplyAppLanguage;
  currentLanguage: AppLanguage;
  nextLanguage: AppLanguage;
  writeLanguage: WriteAppLanguage;
};

export type PersistAppLanguageChangeResult = {
  didChange: boolean;
  language: AppLanguage;
};

export async function changeAppLanguage(
  nextLanguage: AppLanguage
): Promise<PersistAppLanguageChangeResult> {
  return persistAppLanguageChange({
    applyLanguage: async (language) => {
      await appI18n.changeLanguage(language);
    },
    currentLanguage: getCurrentAppLanguage(),
    nextLanguage,
    writeLanguage: writeStoredAppLanguage,
  });
}

export async function persistAppLanguageChange({
  applyLanguage,
  currentLanguage,
  nextLanguage,
  writeLanguage,
}: PersistAppLanguageChangeInput): Promise<PersistAppLanguageChangeResult> {
  if (currentLanguage === nextLanguage) {
    return {
      didChange: false,
      language: currentLanguage,
    };
  }

  await writeLanguage(nextLanguage);

  try {
    await applyLanguage(nextLanguage);
  } catch (error) {
    await restoreAppLanguage({
      applyLanguage,
      currentLanguage,
      writeLanguage,
    });

    throw error;
  }

  return {
    didChange: true,
    language: nextLanguage,
  };
}

export function getCurrentAppLanguage(): AppLanguage {
  return normalizeAppI18nLanguage(appI18n.resolvedLanguage ?? appI18n.language);
}

function normalizeAppI18nLanguage(language: string | undefined): AppLanguage {
  if (isAppLanguage(language)) {
    return language;
  }

  const baseLanguage = language?.split("-")[0];

  if (isAppLanguage(baseLanguage)) {
    return baseLanguage;
  }

  return fallbackAppLanguage;
}

async function restoreAppLanguage({
  applyLanguage,
  currentLanguage,
  writeLanguage,
}: Omit<PersistAppLanguageChangeInput, "nextLanguage">): Promise<void> {
  try {
    await writeLanguage(currentLanguage);
    await applyLanguage(currentLanguage);
  } catch {
    // 복구 실패는 원래 실패 원인을 가리지 않는다.
  }
}
