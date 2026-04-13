import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { borderRadius, colors, spacing } from "~/design-system/tokens";

export function AppCard({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <View style={styles.shadowWrapper}>
      <View style={styles.contentWrapper}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  shadowWrapper: {
    marginHorizontal: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
});
