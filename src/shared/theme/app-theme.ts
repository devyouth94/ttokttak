import type { ColorSchemeName } from "react-native";

export const appThemePreferences = ["system", "light", "dark"] as const;

export type AppThemePreference = (typeof appThemePreferences)[number];
export type ResolvedAppTheme = Exclude<AppThemePreference, "system">;

export const fallbackAppThemePreference: AppThemePreference = "system";
export const appThemePreferenceStorageKey = "ttokttak:theme";

type ResolveAppThemePreferenceInput = {
  storedPreference: string | null | undefined;
};

type ResolveInitialAppThemePreferenceInput = {
  readStoredPreference: () => Promise<string | null>;
};

type ResolveAppThemeInput = {
  colorScheme: ColorSchemeName | null | undefined;
  preference: AppThemePreference;
};

export function isAppThemePreference(
  value: unknown
): value is AppThemePreference {
  return (
    typeof value === "string" &&
    appThemePreferences.includes(value as AppThemePreference)
  );
}

export function resolveAppThemePreference({
  storedPreference,
}: ResolveAppThemePreferenceInput): AppThemePreference {
  if (isAppThemePreference(storedPreference)) {
    return storedPreference;
  }

  return fallbackAppThemePreference;
}

export async function resolveInitialAppThemePreference({
  readStoredPreference,
}: ResolveInitialAppThemePreferenceInput): Promise<AppThemePreference> {
  try {
    return resolveAppThemePreference({
      storedPreference: await readStoredPreference(),
    });
  } catch {
    return fallbackAppThemePreference;
  }
}

export function resolveAppTheme({
  colorScheme,
  preference,
}: ResolveAppThemeInput): ResolvedAppTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return colorScheme === "dark" ? "dark" : "light";
}
