import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { borderRadius, colors, spacing } from "~/design-system/tokens";

export function AppCard({ children }: PropsWithChildren): React.JSX.Element {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 2,
  },
});
