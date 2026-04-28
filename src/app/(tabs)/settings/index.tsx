import { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { ExternalLink, LogOut } from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";
import { useNotificationBootstrap } from "~/features/notifications/notification-bootstrap";
import { useSession } from "~/features/session/session-provider";

type SectionTitleProps = {
  title: string;
};

type SettingsCardProps = {
  children: ReactNode;
};

type SettingsRowProps = {
  accessory?: ReactNode;
  description?: string;
  isFirst?: boolean;
  isPressable?: boolean;
  isSeparated?: boolean;
  onPress?: () => void;
  title: string;
  titleStyle?: StyleProp<TextStyle>;
};

type SettingsValueRowProps = {
  isFirst?: boolean;
  title: string;
  value: string;
};

function SectionTitle({ title }: SectionTitleProps): React.JSX.Element {
  return (
    <AppText style={styles.sectionTitle} variant="label">
      {title}
    </AppText>
  );
}

function SettingsCard({ children }: SettingsCardProps): React.JSX.Element {
  return <View style={styles.card}>{children}</View>;
}

function SettingsRow({
  accessory,
  description,
  isFirst = false,
  isPressable = false,
  isSeparated = true,
  onPress,
  title,
  titleStyle,
}: SettingsRowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={isPressable ? "button" : undefined}
      disabled={!isPressable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isFirst ? styles.firstRow : undefined,
        isSeparated ? styles.rowBorder : undefined,
        isPressable && pressed ? styles.rowPressed : undefined,
      ]}
    >
      <View style={styles.rowContent}>
        <AppText style={[styles.rowTitle, titleStyle]}>{title}</AppText>
        {description ? (
          <AppText style={styles.rowDescription}>{description}</AppText>
        ) : null}
      </View>

      {accessory ? <View style={styles.rowAccessory}>{accessory}</View> : null}
    </Pressable>
  );
}

function SettingsValueRow({
  isFirst = false,
  title,
  value,
}: SettingsValueRowProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.row,
        isFirst ? styles.firstRow : undefined,
        styles.rowBorder,
      ]}
    >
      <AppText style={styles.rowTitle}>{title}</AppText>
      <AppText style={styles.rowValue}>{value}</AppText>
    </View>
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
  const { profile, signOut, user } = useSession();
  const {
    isPermissionLoading,
    isRequestingPermission,
    openSettings,
    permission,
    requestPermission,
  } = useNotificationBootstrap();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  async function handleOpenSystemSettings(): Promise<void> {
    try {
      await openSettings();
    } catch {
      Alert.alert("설정 열기 실패", "기기 설정을 열 수 없습니다.");
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
    <AppScreen>
      <ScreenHeader title="설정" />

      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <SectionTitle title="계정" />
          <SettingsCard>
            <SettingsValueRow isFirst title="이름" value={displayName} />
            <SettingsValueRow title="이메일" value={email} />
            <SettingsRow
              accessory={
                isSigningOut ? (
                  <ActivityIndicator color={colors.error} size="small" />
                ) : (
                  <LogOut color={colors.error} size={18} />
                )
              }
              isPressable
              isSeparated={false}
              onPress={() => {
                void handleSignOut();
              }}
              title="로그아웃"
              titleStyle={styles.logoutText}
            />
          </SettingsCard>
        </View>

        <View style={styles.section}>
          <SectionTitle title="알림" />
          <SettingsCard>
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
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <ExternalLink color={colors.outlineSoft} size={16} />
                  )
                }
                description="원격 푸시 토큰 등록을 위해 알림 권한이 필요합니다."
                isPressable
                isSeparated={!permission.canOpenSettings}
                onPress={() => {
                  void handleRequestNotificationPermission();
                }}
                title="권한 요청"
              />
            ) : null}
            {permission.canOpenSettings ? (
              <SettingsRow
                accessory={
                  <ExternalLink color={colors.outlineSoft} size={16} />
                }
                description="권한이 꺼져 있으면 시스템 설정에서 다시 허용해야 합니다."
                isPressable
                isSeparated={false}
                onPress={() => {
                  void handleOpenSystemSettings();
                }}
                title="시스템 설정 열기"
              />
            ) : null}
          </SettingsCard>
        </View>

        <View style={styles.section}>
          <SectionTitle title="앱 정보" />
          <SettingsCard>
            <SettingsValueRow isFirst title="시간대" value={timezone} />
            <View style={styles.row}>
              <AppText style={styles.rowTitle}>앱 버전</AppText>
              <View style={styles.versionBadge}>
                <AppText style={styles.versionText}>{`v${appVersion}`}</AppText>
              </View>
            </View>
          </SettingsCard>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  firstRow: {
    paddingTop: spacing.md,
  },
  logoutText: {
    color: colors.error,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowAccessory: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowBorder: {
    borderBottomColor: colors.outlineSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  rowPressed: {
    backgroundColor: colors.surfaceLow,
  },
  rowTitle: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 20,
  },
  rowValue: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
  },
  scrollContent: {
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    paddingHorizontal: spacing.xs,
  },
  versionBadge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    minWidth: 76,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
  },
});
