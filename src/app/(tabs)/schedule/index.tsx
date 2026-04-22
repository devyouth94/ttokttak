import { StyleSheet, View } from "react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { colors, spacing } from "~/design-system/tokens";

export default function ScheduleTabPage(): React.JSX.Element {
  return (
    <AppScreen contentStyle={styles.screenContent}>
      <ScreenHeader title="일정" />
      <View style={styles.emptyState}>
        <AppText style={styles.emptyTitle} variant="title">
          등록된 일정이 없습니다.
        </AppText>
        <AppText style={styles.emptyDescription}>
          반복 일정을 추가하면 이곳에서 한눈에 볼 수 있습니다.
        </AppText>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  emptyDescription: {
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    textAlign: "center",
  },
  screenContent: {
    flex: 1,
  },
});
