import { type AppLanguage, fallbackAppLanguage } from "./app-language";

type BootstrapAppI18nInput = {
  applyLanguage: (language: AppLanguage) => Promise<void>;
  resolveInitialLanguage: () => Promise<AppLanguage>;
};

export async function bootstrapAppI18n({
  applyLanguage,
  resolveInitialLanguage,
}: BootstrapAppI18nInput): Promise<AppLanguage> {
  try {
    const language = await resolveInitialLanguage();

    await applyLanguage(language);

    return language;
  } catch {
    try {
      await applyLanguage(fallbackAppLanguage);
    } catch {
      // fallback 적용까지 실패해도 앱 시작은 막지 않는다.
    }

    return fallbackAppLanguage;
  }
}
