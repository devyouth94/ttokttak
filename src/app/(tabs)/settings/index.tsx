import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Switch,
  type TextStyle,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
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

export default function SettingsTabPage(): React.JSX.Element {
  const { profile, signOut, user } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [notificationPermissionLabel, setNotificationPermissionLabel] =
    useState("확인 중");

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

  useEffect(() => {
    async function refreshNotificationPermission(): Promise<void> {
      if (Platform.OS === "web") {
        setNotificationPermissionLabel("지원 안 됨");
        return;
      }

      try {
        const permission = await Notifications.getPermissionsAsync();

        setNotificationPermissionLabel(permission.granted ? "허용됨" : "꺼짐");
      } catch {
        setNotificationPermissionLabel("확인 실패");
      }
    }

    void refreshNotificationPermission();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshNotificationPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
      await Linking.openSettings();
    } catch {
      Alert.alert("설정 열기 실패", "기기 설정을 열 수 없습니다.");
    }
  }

  return (
    <AppScreen>
      <ScreenHeader title="설정" />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
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
            <SettingsRow
              accessory={
                <Switch
                  onValueChange={setIsNotificationsEnabled}
                  thumbColor={colors.primaryForeground}
                  trackColor={{
                    false: colors.outlineSoft,
                    true: colors.text,
                  }}
                  value={isNotificationsEnabled}
                />
              }
              description="앱 알림과 리마인더를 받습니다."
              isFirst
              title="앱 알림"
            />
            <SettingsValueRow
              title="권한 상태"
              value={notificationPermissionLabel}
            />
            <SettingsRow
              accessory={<ExternalLink color={colors.outlineSoft} size={16} />}
              isPressable
              isSeparated={false}
              onPress={() => {
                void handleOpenSystemSettings();
              }}
              title="시스템 설정 열기"
            />
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
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
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
