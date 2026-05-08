import { type ReactNode, useState } from "react";
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

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { useCollapsibleHeader } from "~/design-system/hooks/use-collapsible-header";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "~/features/legal/legal-links";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";
import { useNotificationBootstrap } from "~/features/notifications/notification-bootstrap";
import { AccountDeletionSessionRequiredError } from "~/features/session/account-deletion";
import { useSession } from "~/features/session/session-provider";
import {
  getEditableProfileDisplayName,
  validateProfileDisplayName,
} from "~/features/settings/settings.helpers";

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

function getNotificationStatusText(
  status: ReturnType<typeof useNotificationBootstrap>["permission"]["status"]
): string {
  if (status === "granted") {
    return "사용 중";
  }

  if (status === "unsupported") {
    return "지원 안 됨";
  }

  return "꺼짐";
}

export default function SettingsTabPage(): React.JSX.Element {
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
  const {
    isPermissionLoading,
    isRequestingPermission,
    openSettings,
    permission,
    requestPermission,
  } = useNotificationBootstrap();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isNameEditorVisible, setIsNameEditorVisible] = useState(false);
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  const profileName = profile?.display_name?.trim();
  const metadataName = user?.user_metadata?.full_name;
  const displayName =
    profileName ||
    (typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : null) ||
    user?.email ||
    "사용자";

  const email = user?.email ?? "로그인된 계정 이메일이 없습니다.";
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

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

    const validationResult = validateProfileDisplayName(displayNameDraft);

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
        "이름 저장 실패",
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
        "로그아웃 실패",
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
        error instanceof AccountDeletionSessionRequiredError
          ? "다시 로그인한 뒤 시도해 주세요."
          : "계정 삭제에 실패했어요. 잠시 뒤 다시 시도해 주세요.";

      Alert.alert("계정 삭제 실패", message);
    } finally {
      setIsDeletingAccount(false);
    }
  }

  function requestDeleteAccount(): void {
    if (isDeletingAccount) {
      return;
    }

    Alert.alert(
      "계정 삭제",
      "계정과 저장된 일정이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
      [
        {
          style: "cancel",
          text: "취소",
        },
        {
          onPress: () => {
            void handleDeleteAccount();
          },
          style: "destructive",
          text: "계정 삭제",
        },
      ]
    );
  }

  async function handleOpenSystemSettings(): Promise<void> {
    try {
      await openSettings();
    } catch {
      Alert.alert("설정 열기 실패", "기기 설정을 열 수 없습니다.");
    }
  }

  async function handleOpenPrivacyPolicy(): Promise<void> {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(
        "개인정보처리방침 열기 실패",
        "개인정보처리방침을 열 수 없습니다."
      );
    }
  }

  async function handleOpenTermsOfService(): Promise<void> {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch {
      Alert.alert("이용약관 열기 실패", "이용약관을 열 수 없습니다.");
    }
  }

  async function handleRequestNotificationPermission(): Promise<void> {
    try {
      await requestPermission();
    } catch (error) {
      Alert.alert(
        "권한 요청 실패",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <Animated.View style={[styles.headerLayer, headerAnimatedStyle]}>
        <ScreenHeader onHeightChange={onHeaderHeightChange} title="설정" />
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
          <SettingsSectionCard title="계정">
            <SettingsValueRow
              isFirst
              isPressable
              onPress={openNameEditor}
              title="이름"
              value={displayName}
            />
            <SettingsValueRow title="이메일" value={email} />
          </SettingsSectionCard>

          <SettingsSectionCard title="알림">
            <SettingsValueRow
              isFirst
              title="앱 알림"
              value={getNotificationStatusText(permission.status)}
            />
            <SettingsValueRow
              title="권한 상태"
              value={isPermissionLoading ? "확인 중" : permission.label}
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
                description="정해둔 시간에 현재 기기에서 알려드리려면 알림 권한이 필요합니다."
                isPressable
                onPress={() => {
                  void handleRequestNotificationPermission();
                }}
                title="권한 요청"
              />
            ) : null}
            {permission.canOpenSettings ? (
              <SettingsRow
                accessory={<ExternalLink color={colors.textSoft} size={16} />}
                description="권한이 꺼져 있으면 시스템 설정에서 다시 허용해야 합니다."
                isPressable
                onPress={() => {
                  void handleOpenSystemSettings();
                }}
                title="시스템 설정 열기"
              />
            ) : null}
          </SettingsSectionCard>

          <SettingsSectionCard title="앱 정보">
            <SettingsValueRow isFirst title="시간대" value={timezone} />
            <SettingsValueRow title="앱 버전" value={`v${appVersion}`} />
            <SettingsRow
              accessory={<ExternalLink color={colors.textSoft} size={16} />}
              isPressable
              onPress={() => {
                void handleOpenTermsOfService();
              }}
              title="이용약관"
            />
            <SettingsRow
              accessory={<ExternalLink color={colors.textSoft} size={16} />}
              isPressable
              onPress={() => {
                void handleOpenPrivacyPolicy();
              }}
              title="개인정보처리방침"
            />
          </SettingsSectionCard>

          <SettingsSectionCard title="계정 관리">
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
              title="로그아웃"
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
              title="계정 삭제"
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
              이름 수정
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
              placeholder="이름"
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
                  취소
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
                    저장
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
