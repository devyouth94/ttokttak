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
  const { actions, copy, options, values, view } = settingsModel;
  const { colors: themeColors } = useAppTheme();

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <Animated.View style={[styles.headerLayer, headerAnimatedStyle]}>
        <ScreenHeader
          onHeightChange={onHeaderHeightChange}
          title={copy.headerTitle}
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
          <SettingsSectionCard styles={styles} title={copy.accountSection}>
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              isFirst
              isPressable
              onPress={actions.openNameEditor}
              styles={styles}
              title={copy.accountName}
              value={values.displayName}
            />
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              styles={styles}
              title={copy.accountEmail}
              value={values.email}
            />
          </SettingsSectionCard>

          <SettingsSectionCard styles={styles} title={copy.environmentSection}>
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
                    accessibilityHint={copy.appLanguageHint}
                    accessibilityLabel={copy.appLanguage}
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
              description={copy.appLanguageLocalOnly}
              isFirst
              styles={styles}
              title={copy.appLanguage}
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
                    accessibilityHint={copy.themeHint}
                    accessibilityLabel={copy.theme}
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
              description={copy.themeLocalOnly}
              styles={styles}
              title={copy.theme}
            />
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              styles={styles}
              title={copy.timezone}
              value={values.timezone}
            />
          </SettingsSectionCard>

          <SettingsSectionCard
            styles={styles}
            title={copy.notificationsSection}
          >
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              isFirst
              styles={styles}
              title={copy.notificationsAppNotification}
              value={values.notificationStatus}
            />
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              styles={styles}
              title={copy.notificationsPermissionStatus}
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
                description={copy.notificationPermissionRequestDescription}
                isPressable
                onPress={() => {
                  void actions.requestNotificationPermission();
                }}
                styles={styles}
                title={copy.notificationPermissionRequest}
              />
            ) : null}
            {view.canOpenNotificationSettings ? (
              <SettingsRow
                accessory={
                  <ExternalLink color={themeColors.textSoft} size={16} />
                }
                description={copy.notificationOpenSettingsDescription}
                isPressable
                onPress={() => {
                  void actions.openSystemSettings();
                }}
                styles={styles}
                title={copy.notificationOpenSettings}
              />
            ) : null}
          </SettingsSectionCard>

          <SettingsSectionCard styles={styles} title={copy.appInfoSection}>
            <SettingsValueRow
              iconColor={themeColors.textSoft}
              isFirst
              styles={styles}
              title={copy.appInfoVersion}
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
              title={copy.appInfoTerms}
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
              title={copy.appInfoPrivacyPolicy}
            />
          </SettingsSectionCard>

          <SettingsSectionCard
            styles={styles}
            title={copy.accountManagementSection}
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
              title={copy.accountManagementSignOut}
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
              title={copy.accountManagementDelete}
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
              {copy.nameEditorTitle}
            </AppText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!view.isSavingDisplayName}
              maxLength={30}
              onChangeText={(value) => {
                actions.changeDisplayNameDraft(value);
              }}
              placeholder={copy.nameEditorPlaceholder}
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
                  {copy.nameEditorCancel}
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
                    {copy.nameEditorSave}
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
