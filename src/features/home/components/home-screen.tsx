import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Bell } from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
import { useSession } from "~/features/session/session-provider";

function getProfileName(
  profile: ReturnType<typeof useSession>["profile"]
): string {
  if (profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }

  return "사용자";
}

export function HomeScreen(): React.JSX.Element {
  const { profile } = useSession();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const profileName = getProfileName(profile);

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.screenRoot}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText style={styles.title} variant="title">
              {"안녕하세요. '"}
              {profileName}
              {"'님"}
            </AppText>
          </View>

          <View style={styles.headerAction}>
            <Pressable
              accessibilityHint="알림 목록 팝오버를 엽니다."
              accessibilityLabel="알림 열기"
              accessibilityRole="button"
              onPress={() => {
                setIsNotificationsOpen((prevState) => !prevState);
              }}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <Bell color={colors.text} size={20} strokeWidth={2} />
            </Pressable>

            {isNotificationsOpen ? (
              <View pointerEvents="box-none" style={styles.popoverLayer}>
                <View style={styles.popoverCard}>
                  <AppText variant="label">알림</AppText>
                  <AppText style={styles.popoverTitle} variant="title">
                    알림 목록을 준비하고 있습니다.
                  </AppText>
                  <AppText style={styles.popoverDescription}>
                    실제 알림 데이터 연결은 다음 페이즈에서 진행합니다.
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {isNotificationsOpen ? (
          <Pressable
            accessibilityLabel="알림 팝오버 닫기"
            accessibilityRole="button"
            onPress={() => {
              setIsNotificationsOpen(false);
            }}
            style={styles.popoverBackdrop}
          />
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  headerAction: {
    alignItems: "flex-end",
    position: "relative",
    zIndex: 20,
  },
  headerCopy: {
    flex: 1,
  },
  iconButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    marginRight: -10,
    width: 48,
  },
  iconButtonPressed: {
    opacity: 0.88,
  },
  popoverBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  popoverCard: {
    gap: spacing.sm,
    width: 240,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 4,
  },
  popoverDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  popoverLayer: {
    position: "absolute",
    right: -10,
    top: 48,
    zIndex: 10,
  },
  popoverTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  screenContent: {
    position: "relative",
    paddingHorizontal: spacing.lg,
  },
  screenRoot: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "left",
  },
});
