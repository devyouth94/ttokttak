import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { ExternalLink } from "lucide-react-native";

import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/application/navigation";
import { useSession } from "~/application/session";
import {
  AccountDeletionAppleAuthorizationRequiredError,
  AccountDeletionSessionRequiredError,
} from "~/features/delete-account";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "~/features/legal";
import { useNotifications } from "~/features/notifications";
import {
  getEditableProfileDisplayName,
  validateProfileDisplayName,
} from "~/features/settings";
import { type AppLanguage, useAppLanguage } from "~/shared/i18n";
import type { AppThemePreference } from "~/shared/theme/app-theme";
import { useAppTheme } from "~/shared/theme/theme-context";
import { AppScreen } from "~/shared/ui/app-screen";
import {
  AppSelectMenu,
  type AppSelectMenuOption,
} from "~/shared/ui/app-select-menu";
import { AppText } from "~/shared/ui/app-text";
import { ScreenHeader } from "~/shared/ui/screen-header";
import { useCollapsibleHeader } from "~/shared/ui/use-collapsible-header";

import {
  SettingsControlRow,
  SettingsRow,
  SettingsSectionCard,
  SettingsValueRow,
} from "./settings-screen-rows";
import { useSettingsScreenStyles } from "./settings-screen-styles";

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useSettingsScreenStyles();
  const insets = useSafeAreaInsets();
  const {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle,
  } = useCollapsibleHeader({ hiddenOffset: insets.top });
  const { deleteAccount, profile, signOut, updateDisplayName, user } =
    useSession();
  const { language: appLanguage, setLanguage: setAppLanguage } =
    useAppLanguage();
  const {
    colors: themeColors,
    setThemePreference,
    themePreference,
  } = useAppTheme();
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
  const appLanguageOptions = [
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
  ] satisfies AppSelectMenuOption<AppLanguage>[];
  const themeOptions = [
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
  ] satisfies AppSelectMenuOption<AppThemePreference>[];

  const profileName = profile?.display_name?.trim();
  const metadataName = user?.user_metadata?.full_name;
  const displayName =
    profileName ||
    (typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : null) ||
    user?.email ||
    t("settings.account.name");

  const email = user?.email ?? t("settings.account.missingEmail");
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const getNotificationPermissionStatusText = (
    status: typeof permission.status
  ): string => {
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
  };
  const getNotificationStatusText = (
    status: typeof permission.status
  ): string =>
    status === "granted"
      ? t("settings.notifications.statusGranted")
      : status === "unsupported"
        ? t("settings.notifications.statusUnsupported")
        : t("settings.notifications.statusDenied");

  function openNameEditor(): void {
    setDisplayNameDraft(
      getEditableProfileDisplayName({
        email: user?.email,
        metadataName:
          typeof metadataName === "string" ? metadataName : undefined,
        profileName,
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

  async function handleSaveDisplayName(): Promise<void> {
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

    const nextDisplayName = validationResult.value;

    setIsSavingDisplayName(true);

    try {
      await updateDisplayName(nextDisplayName);
      setIsNameEditorVisible(false);
      setDisplayNameError(null);
    } catch (error) {
      Alert.alert(
        t("settings.nameEditor.saveErrorTitle"),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsSavingDisplayName(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        t("settings.accountManagement.signOutErrorTitle"),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteAccount();
    } catch (error) {
      const message =
        error instanceof AccountDeletionAppleAuthorizationRequiredError
          ? t(
              "settings.accountManagement.deleteError.appleAuthorizationRequired"
            )
          : error instanceof AccountDeletionSessionRequiredError
            ? t("settings.accountManagement.deleteError.sessionRequired")
            : t("settings.accountManagement.deleteError.unknown");

      Alert.alert(t("settings.accountManagement.deleteError.title"), message);
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
            void handleDeleteAccount();
          },
          style: "destructive",
          text: t("settings.accountManagement.deleteAlert.confirm"),
        },
      ]
    );
  }

  async function handleChangeAppLanguage(
    nextLanguage: AppLanguage
  ): Promise<void> {
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

  async function handleChangeThemePreference(
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

  async function handleOpenSystemSettings(): Promise<void> {
    try {
      await openSettings();
    } catch {
      Alert.alert(
        t("settings.notifications.openSettingsErrorTitle"),
        t("settings.notifications.openSettingsErrorMessage")
      );
    }
  }

  async function handleOpenPrivacyPolicy(): Promise<void> {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(
        t("settings.appInfo.privacyOpenErrorTitle"),
        t("settings.appInfo.privacyOpenErrorMessage")
      );
    }
  }

  async function handleOpenTermsOfService(): Promise<void> {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch {
      Alert.alert(
        t("settings.appInfo.termsOpenErrorTitle"),
        t("settings.appInfo.termsOpenErrorMessage")
      );
    }
  }

  async function handleRequestNotificationPermission(): Promise<void> {
    try {
      await requestPermission();
    } catch (error) {
      Alert.alert(
        t("settings.notifications.permissionRequestErrorTitle"),
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <Animated.View style={[styles.headerLayer, headerAnimatedStyle]}>
        <ScreenHeader
          onHeightChange={onHeaderHeightChange}
          title={t("settings.headerTitle")}
        />
      </Animated.View>

      <Animated.ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight },
          {
            paddingBottom: MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom,
          },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sections}>
          <SettingsSectionCard
            styles={styles}
            title={t("settings.account.section")}
          >
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              isFirst
              isPressable
              onPress={openNameEditor}
              styles={styles}
              title={t("settings.account.name")}
              value={displayName}
            />
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              styles={styles}
              title={t("settings.account.email")}
              value={email}
            />
          </SettingsSectionCard>

          <SettingsSectionCard
            styles={styles}
            title={t("settings.environment.section")}
          >
            <SettingsControlRow
              accessory={
                <View style={styles.selectAccessory}>
                  {isSavingAppLanguage ? (
                    <ActivityIndicator
                      color={themeColors.textSoft}
                      size="small"
                    />
                  ) : null}
                  <AppSelectMenu
                    accessibilityHint={t(
                      "settings.environment.appLanguageHint"
                    )}
                    accessibilityLabel={t("settings.environment.appLanguage")}
                    align="end"
                    isDisabled={isSavingAppLanguage}
                    onChange={(nextLanguage) => {
                      void handleChangeAppLanguage(nextLanguage);
                    }}
                    options={appLanguageOptions}
                    value={appLanguage}
                    variant="compact"
                  />
                </View>
              }
              description={t("settings.environment.appLanguageLocalOnly")}
              isFirst
              styles={styles}
              title={t("settings.environment.appLanguage")}
            />
            <SettingsControlRow
              accessory={
                <View style={styles.selectAccessory}>
                  {isSavingThemePreference ? (
                    <ActivityIndicator
                      color={themeColors.textSoft}
                      size="small"
                    />
                  ) : null}
                  <AppSelectMenu
                    accessibilityHint={t("settings.environment.themeHint")}
                    accessibilityLabel={t("settings.environment.theme")}
                    align="end"
                    isDisabled={isSavingThemePreference}
                    onChange={(nextPreference) => {
                      void handleChangeThemePreference(nextPreference);
                    }}
                    options={themeOptions}
                    value={themePreference}
                    variant="compact"
                  />
                </View>
              }
              description={t("settings.environment.themeLocalOnly")}
              styles={styles}
              title={t("settings.environment.theme")}
            />
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              styles={styles}
              title={t("settings.environment.timezone")}
              value={timezone}
            />
          </SettingsSectionCard>

          <SettingsSectionCard
            styles={styles}
            title={t("settings.notifications.section")}
          >
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              isFirst
              styles={styles}
              title={t("settings.notifications.appNotification")}
              value={getNotificationStatusText(permission.status)}
            />
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              styles={styles}
              title={t("settings.notifications.permissionStatus")}
              value={
                isPermissionLoading
                  ? t("settings.notifications.statusChecking")
                  : getNotificationPermissionStatusText(permission.status)
              }
            />
            {permission.canRequest ? (
              <SettingsRow
                accessory={
                  isRequestingPermission ? (
                    <ActivityIndicator
                      color={themeColors.textSoft}
                      size="small"
                    />
                  ) : (
                    <ExternalLink color={themeColors.textSoft} size={16} />
                  )
                }
                description={t(
                  "settings.notifications.permissionRequestDescription"
                )}
                isPressable
                onPress={() => {
                  void handleRequestNotificationPermission();
                }}
                styles={styles}
                title={t("settings.notifications.permissionRequest")}
              />
            ) : null}
            {permission.canOpenSettings ? (
              <SettingsRow
                accessory={
                  <ExternalLink color={themeColors.textSoft} size={16} />
                }
                description={t(
                  "settings.notifications.openSettingsDescription"
                )}
                isPressable
                onPress={() => {
                  void handleOpenSystemSettings();
                }}
                styles={styles}
                title={t("settings.notifications.openSettings")}
              />
            ) : null}
          </SettingsSectionCard>

          <SettingsSectionCard
            styles={styles}
            title={t("settings.appInfo.section")}
          >
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              isFirst
              styles={styles}
              title={t("settings.appInfo.version")}
              value={`v${appVersion}`}
            />
            <SettingsRow
              accessory={
                <ExternalLink color={themeColors.textSoft} size={16} />
              }
              isPressable
              onPress={() => {
                void handleOpenTermsOfService();
              }}
              styles={styles}
              title={t("settings.appInfo.terms")}
            />
            <SettingsRow
              accessory={
                <ExternalLink color={themeColors.textSoft} size={16} />
              }
              isPressable
              onPress={() => {
                void handleOpenPrivacyPolicy();
              }}
              styles={styles}
              title={t("settings.appInfo.privacyPolicy")}
            />
          </SettingsSectionCard>

          <SettingsSectionCard
            styles={styles}
            title={t("settings.accountManagement.section")}
          >
            <SettingsRow
              accessory={
                isSigningOut ? (
                  <ActivityIndicator
                    color={themeColors.textSoft}
                    size="small"
                  />
                ) : undefined
              }
              isDisabled={isSigningOut || isDeletingAccount}
              isFirst
              isPressable
              onPress={() => {
                void handleSignOut();
              }}
              styles={styles}
              title={t("settings.accountManagement.signOut")}
            />
            <SettingsRow
              accessory={
                isDeletingAccount ? (
                  <ActivityIndicator color={themeColors.error} size="small" />
                ) : undefined
              }
              isDisabled={isDeletingAccount || isSigningOut}
              isPressable
              onPress={requestDeleteAccount}
              styles={styles}
              title={t("settings.accountManagement.delete")}
              tone="danger"
            />
          </SettingsSectionCard>
        </View>
      </Animated.ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={closeNameEditor}
        transparent
        visible={isNameEditorVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.nameEditor}>
            <AppText style={styles.nameEditorTitle} variant="body2">
              {t("settings.nameEditor.title")}
            </AppText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSavingDisplayName}
              maxLength={30}
              onChangeText={(value) => {
                setDisplayNameDraft(value);
                setDisplayNameError(null);
              }}
              placeholder={t("settings.nameEditor.placeholder")}
              placeholderTextColor={themeColors.textSoft}
              style={styles.nameInput}
              value={displayNameDraft}
            />
            {displayNameError ? (
              <AppText style={styles.nameErrorText} variant="caption">
                {displayNameError}
              </AppText>
            ) : null}
            <View style={styles.nameEditorActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isSavingDisplayName}
                onPress={closeNameEditor}
                style={({ pressed }) => [
                  styles.nameEditorButton,
                  styles.nameEditorCancelButton,
                  pressed ? styles.rowPressed : undefined,
                ]}
              >
                <AppText style={styles.nameEditorCancelText} variant="body3">
                  {t("settings.nameEditor.cancel")}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSavingDisplayName}
                onPress={() => {
                  void handleSaveDisplayName();
                }}
                style={({ pressed }) => [
                  styles.nameEditorButton,
                  styles.nameEditorSaveButton,
                  pressed ? styles.rowPressed : undefined,
                ]}
              >
                {isSavingDisplayName ? (
                  <ActivityIndicator color={themeColors.primaryForeground} />
                ) : (
                  <AppText style={styles.nameEditorSaveText} variant="body3">
                    {t("settings.nameEditor.save")}
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}
