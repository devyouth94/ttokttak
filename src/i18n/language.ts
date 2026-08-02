export const appLanguages = ["ko", "en"] as const;

export type AppLanguage = (typeof appLanguages)[number];

export const fallbackAppLanguage: AppLanguage = "ko";

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === "string" && appLanguages.includes(value as AppLanguage)
  );
}

export function normalizeAppLanguage(
  language: string | null | undefined
): AppLanguage {
  const normalizedLanguage = language?.toLowerCase();

  if (isAppLanguage(normalizedLanguage)) {
    return normalizedLanguage;
  }

  const baseLanguage = normalizedLanguage?.split("-")[0];

  return isAppLanguage(baseLanguage) ? baseLanguage : fallbackAppLanguage;
}

export function resolveAppLanguage({
  deviceLanguage,
  storedLanguage,
}: {
  deviceLanguage: string | null | undefined;
  storedLanguage: string | null | undefined;
}): AppLanguage {
  return isAppLanguage(storedLanguage)
    ? storedLanguage
    : normalizeAppLanguage(deviceLanguage);
}
