import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { ExternalLink, Pencil } from "lucide-react-native";

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
import { AppScreen } from "~/shared/ui/app-screen";
import {
  AppSelectMenu,
  type AppSelectMenuOption,
} from "~/shared/ui/app-select-menu";
import { AppText } from "~/shared/ui/app-text";
import { ScreenHeader } from "~/shared/ui/screen-header";
import { borderRadius, colors, spacing, typography } from "~/shared/ui/tokens";
import { useCollapsibleHeader } from "~/shared/ui/use-collapsible-header";

type SectionTitleProps = {
  title: string;
};

type SettingsSectionCardProps = {
  children: ReactNode;
  title: string;
};

type SettingsRowProps = {
  accessory?: ReactNode;
  description?: string;
  isDisabled?: boolean;
  isFirst?: boolean;
  isPressable?: boolean;
  onPress?: () => void;
  tone?: "default" | "danger";
  title: string;
};

type SettingsValueRowProps = {
  isFirst?: boolean;
  isPressable?: boolean;
  onPress?: () => void;
  title: string;
  value: string;
};

type SettingsControlRowProps = {
  accessory: ReactNode;
  description?: string;
  isFirst?: boolean;
  title: string;
};

function SectionTitle({ title }: SectionTitleProps): React.JSX.Element {
  return (
    <AppText style={styles.sectionTitle} variant="caption">
      {title}
    </AppText>
  );
}

function SettingsSectionCard({
  children,
  title,
}: SettingsSectionCardProps): React.JSX.Element {
  return (
    <View style={styles.sectionCard}>
      <SectionTitle title={title} />

      <View>{children}</View>
    </View>
  );
}

function SettingsRow({
  accessory,
  description,
  isDisabled = false,
  isFirst = false,
  isPressable = false,
  onPress,
  tone = "default",
  title,
}: SettingsRowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={isPressable ? "button" : undefined}
      disabled={!isPressable || isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isFirst ? styles.rowDivider : undefined,
        isDisabled ? styles.rowDisabled : undefined,
        isPressable && !isDisabled && pressed ? styles.rowPressed : undefined,
      ]}
    >
      <View style={styles.rowContent}>
        <AppText
          style={[
            styles.rowTitle,
            tone === "danger" ? styles.dangerText : null,
          ]}
          variant="body3"
        >
          {title}
        </AppText>
        {description ? (
          <AppText style={styles.rowDescription} variant="body3">
            {description}
          </AppText>
        ) : null}
      </View>

      {accessory ? <View style={styles.rowAccessory}>{accessory}</View> : null}
    </Pressable>
  );
}

function SettingsControlRow({
  accessory,
  description,
  isFirst = false,
  title,
}: SettingsControlRowProps): React.JSX.Element {
  return (
    <View style={[styles.row, !isFirst ? styles.rowDivider : undefined]}>
      <View style={styles.rowContent}>
        <AppText style={styles.rowTitle} variant="body3">
          {title}
        </AppText>
        {description ? (
          <AppText style={styles.rowDescription} variant="body3">
            {description}
          </AppText>
        ) : null}
      </View>

      <View style={styles.rowAccessory}>{accessory}</View>
    </View>
  );
}

function SettingsValueRow({
  isFirst = false,
  isPressable = false,
  onPress,
  title,
  value,
}: SettingsValueRowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={isPressable ? "button" : undefined}
      disabled={!isPressable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isFirst ? styles.rowDivider : undefined,
        isPressable && pressed ? styles.rowPressed : undefined,
      ]}
    >
      <AppText style={styles.rowTitle} variant="body3">
        {title}
      </AppText>
      <View style={styles.valueWithIcon}>
        <AppText style={styles.rowValue} variant="body3">
          {value}
        </AppText>
        {isPressable ? <Pencil color={colors.textSoft} size={14} /> : null}
      </View>
    </Pressable>
  );
}

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
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
    isPermissionLoading,
    isRequestingPermission,
    openSettings,
    permission,
    requestPermission,
    syncAfterAppLanguageChanged,
  } = useNotifications();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSavingAppLanguage, setIsSavingAppLanguage] = useState(false);
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
      try {
        await syncAfterAppLanguageChanged(nextLanguage);
      } catch {
        Alert.alert(
          t("settings.environment.syncErrorTitle"),
          t("settings.environment.syncErrorMessage")
        );
      }
    } catch {
      Alert.alert(
        t("settings.environment.saveErrorTitle"),
        t("settings.environment.saveErrorMessage")
      );
    } finally {
      setIsSavingAppLanguage(false);
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
          <SettingsSectionCard title={t("settings.account.section")}>
            <SettingsValueRow
              isFirst
              isPressable
              onPress={openNameEditor}
              title={t("settings.account.name")}
              value={displayName}
            />
            <SettingsValueRow
              title={t("settings.account.email")}
              value={email}
            />
          </SettingsSectionCard>

          <SettingsSectionCard title={t("settings.environment.section")}>
            <SettingsControlRow
              accessory={
                <View style={styles.languageSelectAccessory}>
                  {isSavingAppLanguage ? (
                    <ActivityIndicator color={colors.textSoft} size="small" />
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
              title={t("settings.environment.appLanguage")}
            />
            <SettingsValueRow
              title={t("settings.environment.timezone")}
              value={timezone}
            />
          </SettingsSectionCard>

          <SettingsSectionCard title={t("settings.notifications.section")}>
            <SettingsValueRow
              isFirst
              title={t("settings.notifications.appNotification")}
              value={getNotificationStatusText(permission.status)}
            />
            <SettingsValueRow
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
                    <ActivityIndicator color={colors.textSoft} size="small" />
                  ) : (
                    <ExternalLink color={colors.textSoft} size={16} />
                  )
                }
                description={t(
                  "settings.notifications.permissionRequestDescription"
                )}
                isPressable
                onPress={() => {
                  void handleRequestNotificationPermission();
                }}
                title={t("settings.notifications.permissionRequest")}
              />
            ) : null}
            {permission.canOpenSettings ? (
              <SettingsRow
                accessory={<ExternalLink color={colors.textSoft} size={16} />}
                description={t(
                  "settings.notifications.openSettingsDescription"
                )}
                isPressable
                onPress={() => {
                  void handleOpenSystemSettings();
                }}
                title={t("settings.notifications.openSettings")}
              />
            ) : null}
          </SettingsSectionCard>

          <SettingsSectionCard title={t("settings.appInfo.section")}>
            <SettingsValueRow
              isFirst
              title={t("settings.appInfo.version")}
              value={`v${appVersion}`}
            />
            <SettingsRow
              accessory={<ExternalLink color={colors.textSoft} size={16} />}
              isPressable
              onPress={() => {
                void handleOpenTermsOfService();
              }}
              title={t("settings.appInfo.terms")}
            />
            <SettingsRow
              accessory={<ExternalLink color={colors.textSoft} size={16} />}
              isPressable
              onPress={() => {
                void handleOpenPrivacyPolicy();
              }}
              title={t("settings.appInfo.privacyPolicy")}
            />
          </SettingsSectionCard>

          <SettingsSectionCard title={t("settings.accountManagement.section")}>
            <SettingsRow
              accessory={
                isSigningOut ? (
                  <ActivityIndicator color={colors.textSoft} size="small" />
                ) : undefined
              }
              isDisabled={isSigningOut || isDeletingAccount}
              isFirst
              isPressable
              onPress={() => {
                void handleSignOut();
              }}
              title={t("settings.accountManagement.signOut")}
            />
            <SettingsRow
              accessory={
                isDeletingAccount ? (
                  <ActivityIndicator color={colors.error} size="small" />
                ) : undefined
              }
              isDisabled={isDeletingAccount || isSigningOut}
              isPressable
              onPress={requestDeleteAccount}
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
              placeholderTextColor={colors.textSoft}
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
                  <ActivityIndicator color={colors.primaryForeground} />
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

const styles = StyleSheet.create({
  dangerText: {
    color: colors.error,
  },
  headerLayer: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  languageSelectAccessory: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  nameEditor: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
    padding: spacing.lg,
    width: "100%",
  },
  nameEditorActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  nameEditorButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 36,
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: spacing.md,
  },
  nameEditorCancelButton: {
    borderColor: colors.dividerOnPrimary,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nameEditorCancelText: {
    color: colors.textMuted,
  },
  nameEditorSaveButton: {
    backgroundColor: colors.primary,
  },
  nameEditorSaveText: {
    color: colors.primaryForeground,
  },
  nameEditorTitle: {
    color: colors.text,
  },
  nameErrorText: {
    color: colors.error,
  },
  nameInput: {
    backgroundColor: "transparent",
    borderColor: colors.dividerOnPrimary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    color: colors.text,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.body3,
    lineHeight: typography.lineHeight.body3,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  rowAccessory: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowDivider: {
    borderTopColor: colors.dividerOnPrimary,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowContent: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  rowDescription: {
    color: colors.textSoft,
  },
  rowDisabled: {
    opacity: 0.56,
  },
  rowPressed: {
    opacity: 0.72,
  },
  rowTitle: {
    color: colors.text,
  },
  rowValue: {
    color: colors.textSoft,
    flexShrink: 1,
    textAlign: "right",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sections: {
    gap: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
  },
  screenContent: {
    flex: 1,
  },
  valueWithIcon: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: spacing.xs,
  },
});
