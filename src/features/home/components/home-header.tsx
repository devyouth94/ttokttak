import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { IconButton } from "~/design-system/components/icon-button";
import { borderRadius, colors } from "~/design-system/tokens";

type HomeHeaderProps = {
  hasUnreadNotification: boolean;
  profileName: string;
};

export function HomeHeader({
  hasUnreadNotification,
  profileName,
}: HomeHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={2}
          style={styles.headerTitle}
          variant="display"
        >
          {"안녕하세요,\n"}
          {profileName}
          {"님!"}
        </AppText>
      </View>

      <View style={styles.headerAction}>
        <IconButton
          accessibilityHint="알림 화면으로 이동해요."
          accessibilityLabel={
            hasUnreadNotification ? "새 알림 있음, 알림 열기" : "알림 열기"
          }
          icon={<Bell color={colors.text} size={20} />}
          onPress={() => {
            router.push("/(tabs)/home/notifications");
          }}
          size="lg"
        />
        {hasUnreadNotification ? (
          <View style={styles.notificationUnreadDot} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 76,
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
  headerTitle: {
    color: colors.text,
  },
  notificationUnreadDot: {
    backgroundColor: colors.accent,
    borderColor: colors.primaryForeground,
    borderRadius: borderRadius.pill,
    borderWidth: 2,
    height: 10,
    position: "absolute",
    right: 11,
    top: 11,
    width: 10,
  },
});
