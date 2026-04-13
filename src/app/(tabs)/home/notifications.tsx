import { StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { AppScreen } from "~/design-system/components/app-screen";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { spacing } from "~/design-system/tokens";

export default function HomeNotificationsPage(): React.JSX.Element {
  return (
    <AppScreen contentStyle={styles.screenContent}>
      <ScreenHeader
        onBack={() => {
          router.back();
        }}
        title="알림"
      />

      <View style={styles.content} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  screenContent: {
    gap: spacing.lg,
  },
});
