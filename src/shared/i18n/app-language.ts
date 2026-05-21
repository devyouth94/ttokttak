import type { Locale } from "expo-localization";

export const appLanguages = ["ko", "en"] as const;

export type AppLanguage = (typeof appLanguages)[number];

export const fallbackAppLanguage: AppLanguage = "ko";
export const appLanguageStorageKey = "ttokttak:app-display-language";

type ResolveAppLanguageInput = {
  deviceLocales: readonly Pick<Locale, "languageCode" | "languageTag">[];
  storedLanguage: string | null | undefined;
};

type ResolveInitialAppLanguageInput = {
  getDeviceLocales: () => readonly Pick<
    Locale,
    "languageCode" | "languageTag"
  >[];
  readStoredLanguage: () => Promise<string | null>;
};

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === "string" && appLanguages.includes(value as AppLanguage)
  );
}

export function resolveAppLanguage({
  deviceLocales,
  storedLanguage,
}: ResolveAppLanguageInput): AppLanguage {
  if (isAppLanguage(storedLanguage)) {
    return storedLanguage;
  }

  return resolveDeviceAppLanguage(deviceLocales);
}

export async function resolveInitialAppLanguage({
  getDeviceLocales,
  readStoredLanguage,
}: ResolveInitialAppLanguageInput): Promise<AppLanguage> {
  try {
    return resolveAppLanguage({
      deviceLocales: getDeviceLocales(),
      storedLanguage: await readStoredLanguage(),
    });
  } catch {
    return fallbackAppLanguage;
  }
}

function resolveDeviceAppLanguage(
  deviceLocales: readonly Pick<Locale, "languageCode" | "languageTag">[]
): AppLanguage {
  const primaryLocale = deviceLocales[0];
  const languageCode = primaryLocale?.languageCode?.toLowerCase();
  const languageTag = primaryLocale?.languageTag.toLowerCase();

  if (
    languageCode === "en" ||
    languageTag === "en" ||
    languageTag?.startsWith("en-")
  ) {
    return "en";
  }

  return fallbackAppLanguage;
}
