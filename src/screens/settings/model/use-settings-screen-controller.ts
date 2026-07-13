import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking } from "react-native";
import Constants from "expo-constants";

import { useSession } from "~/application/session";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "~/features/legal";
import { useNotifications } from "~/features/notifications";
import {
  getEditableProfileDisplayName,
  validateProfileDisplayName,
} from "~/features/settings";
import { type AppLanguage, useAppLanguage } from "~/shared/i18n";
import { type AppThemePreference, useAppTheme } from "~/shared/theme";

import {
  getAppLanguageOptions,
  getDeleteAccountErrorMessage,
  getNotificationPermissionStatusText,
  getNotificationStatusText,
  getSettingsDisplayName,
  getSettingsErrorMessage,
  getThemePreferenceOptions,
} from "./settings-screen-model";

export function useSettingsScreenController() {
  const { t } = useTranslation();
  const { deleteAccount, profile, signOut, updateDisplayName, user } =
    useSession();
  const { language: appLanguage, setLanguage: setAppLanguage } =
    useAppLanguage();
  const { setThemePreference, themePreference } = useAppTheme();
  const {
    isPermissionLoading,
    isRequestingPermission,
    openSettings,
    permission,
    requestPermission,
  } = useNotifications();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSavingAppLanguage, setIsSavingAppLanguage] = useState(false);
  const [isSavingThemePreference, setIsSavingThemePreference] = useState(false);
  const [isNameEditorVisible, setIsNameEditorVisible] = useState(false);
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  const profileName = profile?.display_name ?? null;
  const metadataName = user?.user_metadata?.full_name;
  const displayName = getSettingsDisplayName({
    email: user?.email,
    fallbackName: t("settings.account.name"),
    metadataName,
    profileName,
  });
  const email = user?.email ?? t("settings.account.missingEmail");
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  function openNameEditor(): void {
    setDisplayNameDraft(
      getEditableProfileDisplayName({
        email: user?.email,
        metadataName:
          typeof metadataName === "string" ? metadataName : undefined,
        profileName: profileName?.trim(),
      })
    );
    setDisplayNameError(null);
    setIsNameEditorVisible(true);
  }

  function closeNameEditor(): void {
    if (isSavingDisplayName) {
      return;
    }

    setIsNameEditorVisible(false);
    setDisplayNameError(null);
  }

  function changeDisplayNameDraft(value: string): void {
    setDisplayNameDraft(value);
    setDisplayNameError(null);
  }

  async function saveDisplayName(): Promise<void> {
    if (isSavingDisplayName) {
      return;
    }

    const validationResult = validateProfileDisplayName(
      displayNameDraft,
      appLanguage
    );

    if (validationResult.value === null) {
      setDisplayNameError(validationResult.errorMessage);
      return;
    }

    setIsSavingDisplayName(true);

    try {
      await updateDisplayName(validationResult.value);
      setIsNameEditorVisible(false);
      setDisplayNameError(null);
    } catch (error) {
      Alert.alert(
        t("settings.nameEditor.saveErrorTitle"),
        getSettingsErrorMessage(error)
      );
    } finally {
      setIsSavingDisplayName(false);
    }
  }

  async function signOutCurrentSession(): Promise<void> {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        t("settings.accountManagement.signOutErrorTitle"),
        getSettingsErrorMessage(error)
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  async function deleteCurrentAccount(): Promise<void> {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteAccount();
    } catch (error) {
      Alert.alert(
        t("settings.accountManagement.deleteError.title"),
        getDeleteAccountErrorMessage(error, t)
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }

  function requestDeleteAccount(): void {
    if (isDeletingAccount) {
      return;
    }

    Alert.alert(
      t("settings.accountManagement.deleteAlert.title"),
      t("settings.accountManagement.deleteAlert.message"),
      [
        {
          style: "cancel",
          text: t("settings.accountManagement.deleteAlert.cancel"),
        },
        {
          onPress: () => {
            void deleteCurrentAccount();
          },
          style: "destructive",
          text: t("settings.accountManagement.deleteAlert.confirm"),
        },
      ]
    );
  }

  async function changeAppLanguage(nextLanguage: AppLanguage): Promise<void> {
    if (isSavingAppLanguage || nextLanguage === appLanguage) {
      return;
    }

    setIsSavingAppLanguage(true);

    try {
      await setAppLanguage(nextLanguage);
    } catch {
      Alert.alert(
        t("settings.environment.saveErrorTitle"),
        t("settings.environment.saveErrorMessage")
      );
    } finally {
      setIsSavingAppLanguage(false);
    }
  }

  async function changeThemePreference(
    nextPreference: AppThemePreference
  ): Promise<void> {
    if (isSavingThemePreference || nextPreference === themePreference) {
      return;
    }

    setIsSavingThemePreference(true);

    try {
      await setThemePreference(nextPreference);
    } catch {
      Alert.alert(
        t("settings.environment.themeSaveErrorTitle"),
        t("settings.environment.themeSaveErrorMessage")
      );
    } finally {
      setIsSavingThemePreference(false);
    }
  }

  async function openSystemSettings(): Promise<void> {
    try {
      await openSettings();
    } catch {
      Alert.alert(
        t("settings.notifications.openSettingsErrorTitle"),
        t("settings.notifications.openSettingsErrorMessage")
      );
    }
  }

  async function openPrivacyPolicy(): Promise<void> {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(
        t("settings.appInfo.privacyOpenErrorTitle"),
        t("settings.appInfo.privacyOpenErrorMessage")
      );
    }
  }

  async function openTermsOfService(): Promise<void> {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch {
      Alert.alert(
        t("settings.appInfo.termsOpenErrorTitle"),
        t("settings.appInfo.termsOpenErrorMessage")
      );
    }
  }

  async function requestNotificationPermission(): Promise<void> {
    try {
      await requestPermission();
    } catch (error) {
      Alert.alert(
        t("settings.notifications.permissionRequestErrorTitle"),
        getSettingsErrorMessage(error)
      );
    }
  }

  return {
    actions: {
      changeAppLanguage,
      changeDisplayNameDraft,
      changeThemePreference,
      closeNameEditor,
      openNameEditor,
      openPrivacyPolicy,
      openSystemSettings,
      openTermsOfService,
      requestDeleteAccount,
      requestNotificationPermission,
      saveDisplayName,
      signOutCurrentSession,
    },
    options: {
      appLanguage: getAppLanguageOptions(t),
      themePreference: getThemePreferenceOptions(t),
    },
    values: {
      appLanguage,
      appVersion,
      displayName,
      displayNameDraft,
      displayNameError,
      email,
      notificationPermissionStatus: isPermissionLoading
        ? t("settings.notifications.statusChecking")
        : getNotificationPermissionStatusText(permission.status, t),
      notificationStatus: getNotificationStatusText(permission.status, t),
      themePreference,
      timezone,
    },
    view: {
      canOpenNotificationSettings: permission.canOpenSettings,
      canRequestNotificationPermission: permission.canRequest,
      isDeletingAccount,
      isNameEditorVisible,
      isPermissionLoading,
      isRequestingPermission,
      isSavingAppLanguage,
      isSavingDisplayName,
      isSavingThemePreference,
      isSigningOut,
    },
  };
}
