import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExternalLink } from "lucide-react-native";

import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/application/navigation";
import { useAppTheme } from "~/shared/theme";
import { AppScreen } from "~/shared/ui/app-screen";
import { AppSelectMenu } from "~/shared/ui/app-select-menu";
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
import { useSettingsScreenController } from "../model/use-settings-screen-controller";

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useSettingsScreenStyles();
  const insets = useSafeAreaInsets();
  const settingsModel = useSettingsScreenController();
  const {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle,
  } = useCollapsibleHeader({ hiddenOffset: insets.top });
  const { actions, options, values, view } = settingsModel;
  const { colors: themeColors } = useAppTheme();

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
              onPress={actions.openNameEditor}
              styles={styles}
              title={t("settings.account.name")}
              value={values.displayName}
            />
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              styles={styles}
              title={t("settings.account.email")}
              value={values.email}
            />
          </SettingsSectionCard>

          <SettingsSectionCard
            styles={styles}
            title={t("settings.environment.section")}
          >
            <SettingsControlRow
              accessory={
                <View style={styles.selectAccessory}>
                  {view.isSavingAppLanguage ? (
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
                    isDisabled={view.isSavingAppLanguage}
                    onChange={(nextLanguage) => {
                      void actions.changeAppLanguage(nextLanguage);
                    }}
                    options={options.appLanguage}
                    value={values.appLanguage}
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
                  {view.isSavingThemePreference ? (
                    <ActivityIndicator
                      color={themeColors.textSoft}
                      size="small"
                    />
                  ) : null}
                  <AppSelectMenu
                    accessibilityHint={t("settings.environment.themeHint")}
                    accessibilityLabel={t("settings.environment.theme")}
                    align="end"
                    isDisabled={view.isSavingThemePreference}
                    onChange={(nextPreference) => {
                      void actions.changeThemePreference(nextPreference);
                    }}
                    options={options.themePreference}
                    value={values.themePreference}
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
              value={values.timezone}
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
              value={values.notificationStatus}
            />
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              styles={styles}
              title={t("settings.notifications.permissionStatus")}
              value={values.notificationPermissionStatus}
            />
            {view.canRequestNotificationPermission ? (
              <SettingsRow
                accessory={
                  view.isRequestingPermission ? (
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
                  void actions.requestNotificationPermission();
                }}
                styles={styles}
                title={t("settings.notifications.permissionRequest")}
              />
            ) : null}
            {view.canOpenNotificationSettings ? (
              <SettingsRow
                accessory={
                  <ExternalLink color={themeColors.textSoft} size={16} />
                }
                description={t(
                  "settings.notifications.openSettingsDescription"
                )}
                isPressable
                onPress={() => {
                  void actions.openSystemSettings();
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
              value={`v${values.appVersion}`}
            />
            <SettingsRow
              accessory={
                <ExternalLink color={themeColors.textSoft} size={16} />
              }
              isPressable
              onPress={() => {
                void actions.openTermsOfService();
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
                void actions.openPrivacyPolicy();
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
                view.isSigningOut ? (
                  <ActivityIndicator
                    color={themeColors.textSoft}
                    size="small"
                  />
                ) : undefined
              }
              isDisabled={view.isSigningOut || view.isDeletingAccount}
              isFirst
              isPressable
              onPress={() => {
                void actions.signOutCurrentSession();
              }}
              styles={styles}
              title={t("settings.accountManagement.signOut")}
            />
            <SettingsRow
              accessory={
                view.isDeletingAccount ? (
                  <ActivityIndicator color={themeColors.error} size="small" />
                ) : undefined
              }
              isDisabled={view.isDeletingAccount || view.isSigningOut}
              isPressable
              onPress={actions.requestDeleteAccount}
              styles={styles}
              title={t("settings.accountManagement.delete")}
              tone="danger"
            />
          </SettingsSectionCard>
        </View>
      </Animated.ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={actions.closeNameEditor}
        transparent
        visible={view.isNameEditorVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.nameEditor}>
            <AppText style={styles.nameEditorTitle} variant="body2">
              {t("settings.nameEditor.title")}
            </AppText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!view.isSavingDisplayName}
              maxLength={30}
              onChangeText={(value) => {
                actions.changeDisplayNameDraft(value);
              }}
              placeholder={t("settings.nameEditor.placeholder")}
              placeholderTextColor={themeColors.textSoft}
              style={styles.nameInput}
              value={values.displayNameDraft}
            />
            {values.displayNameError ? (
              <AppText style={styles.nameErrorText} variant="caption">
                {values.displayNameError}
              </AppText>
            ) : null}
            <View style={styles.nameEditorActions}>
              <Pressable
                accessibilityRole="button"
                disabled={view.isSavingDisplayName}
                onPress={actions.closeNameEditor}
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
                disabled={view.isSavingDisplayName}
                onPress={() => {
                  void actions.saveDisplayName();
                }}
                style={({ pressed }) => [
                  styles.nameEditorButton,
                  styles.nameEditorSaveButton,
                  pressed ? styles.rowPressed : undefined,
                ]}
              >
                {view.isSavingDisplayName ? (
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
