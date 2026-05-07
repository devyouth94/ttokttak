import { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { ExternalLink } from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { useCollapsibleHeader } from "~/design-system/hooks/use-collapsible-header";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";
import { useNotificationBootstrap } from "~/features/notifications/notification-bootstrap";
import { useSession } from "~/features/session/session-provider";

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
  isFirst?: boolean;
  isPressable?: boolean;
  onPress?: () => void;
  title: string;
};

type SettingsValueRowProps = {
  isFirst?: boolean;
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
  isFirst = false,
  isPressable = false,
  onPress,
  title,
}: SettingsRowProps): React.JSX.Element {
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
    <View style={[styles.row, !isFirst ? styles.rowDivider : undefined]}>
      <AppText style={styles.rowTitle} variant="body3">
        {title}
      </AppText>
      <AppText style={styles.rowValue} variant="body3">
        {value}
      </AppText>
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
  const {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle,
  } = useCollapsibleHeader({ hiddenOffset: insets.top });
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
            <SettingsValueRow isFirst title="이름" value={displayName} />
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
          </SettingsSectionCard>
        </View>

        <View style={styles.logoutSlot}>
          {isSigningOut ? (
            <ActivityIndicator color={colors.textSoft} size="small" />
          ) : (
            <Pressable
              accessibilityLabel="로그아웃"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                void handleSignOut();
              }}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed ? styles.rowPressed : undefined,
              ]}
            >
              <AppText style={styles.logoutText} variant="body3">
                로그아웃
              </AppText>
            </Pressable>
          )}
        </View>
      </Animated.ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerLayer: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: colors.textSoft,
    textDecorationLine: "underline",
  },
  logoutSlot: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: spacing.xl,
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
});
