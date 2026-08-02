import type { AppLanguage } from "~/i18n/app-language";
import type { PermissionStatus } from "~/notifications/permission";
import type { ThemePreference } from "~/theme/preference";
import type { SelectOption } from "~/ui/select-menu";

type Translate = (key: string) => string;
export function getSettingsDisplayName(params: {
  email?: string;
  fallbackName: string;
  metadataName?: unknown;
  profileName?: string | null;
}): string {
  const profileName = params.profileName?.trim();

  if (profileName) {
    return profileName;
  }

  const metadataName =
    typeof params.metadataName === "string" ? params.metadataName.trim() : "";

  if (metadataName) {
    return metadataName;
  }

  return params.email ?? params.fallbackName;
}

export function getNotificationPermissionStatusText(
  status: PermissionStatus,
  t: Translate
): string {
  switch (status) {
    case "granted":
      return t("settings.notifications.statusGranted");
    case "denied":
      return t("settings.notifications.statusDenied");
    case "unsupported":
      return t("settings.notifications.statusUnsupported");
    case "undetermined":
      return t("settings.notifications.statusUndetermined");
    default:
      return t("settings.notifications.statusDenied");
  }
}

export function getNotificationStatusText(
  status: PermissionStatus,
  t: Translate
): string {
  if (status === "granted") {
    return t("settings.notifications.statusGranted");
  }

  if (status === "unsupported") {
    return t("settings.notifications.statusUnsupported");
  }

  return t("settings.notifications.statusDenied");
}

export function getDeleteAccountErrorMessage(
  error: unknown,
  t: Translate
): string {
  if (error instanceof Error && error.name === "AppleAuthRequiredError") {
    return t(
      "settings.accountManagement.deleteError.appleAuthorizationRequired"
    );
  }

  if (error instanceof Error && error.name === "LoginRequiredError") {
    return t("settings.accountManagement.deleteError.sessionRequired");
  }

  return t("settings.accountManagement.deleteError.unknown");
}

export function getSettingsErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getAppLanguageOptions(
  t: Translate
): SelectOption<AppLanguage>[] {
  return [
    {
      accessibilityHint: t("settings.environment.languageKoreanHint"),
      label: "한국어",
      value: "ko",
    },
    {
      accessibilityHint: t("settings.environment.languageEnglishHint"),
      label: "English",
      value: "en",
    },
  ];
}

export function getThemePreferenceOptions(
  t: Translate
): SelectOption<ThemePreference>[] {
  return [
    {
      accessibilityHint: t("settings.environment.themeSystemHint"),
      label: t("settings.environment.themeSystem"),
      value: "system",
    },
    {
      accessibilityHint: t("settings.environment.themeLightHint"),
      label: t("settings.environment.themeLight"),
      value: "light",
    },
    {
      accessibilityHint: t("settings.environment.themeDarkHint"),
      label: t("settings.environment.themeDark"),
      value: "dark",
    },
  ];
}
