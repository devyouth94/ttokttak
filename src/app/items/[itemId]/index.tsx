import { StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { colors, spacing } from "~/design-system/tokens";

export default function RecurringItemDetailPage(): React.JSX.Element {
  return (
    <AppScreen contentStyle={styles.screenContent}>
      <ScreenHeader
        onBack={() => {
          router.back();
        }}
        title="리마인더 상세"
      />

      <View style={styles.content}>
        <AppText style={styles.message}>상세 화면은 준비 중입니다.</AppText>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  message: {
    color: colors.textMuted,
    textAlign: "center",
  },
  screenContent: {
    gap: spacing.lg,
  },
});
