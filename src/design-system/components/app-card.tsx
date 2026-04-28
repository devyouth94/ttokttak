import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Platform, StyleSheet, View } from "react-native";

import {
  borderRadius,
  colors,
  elevation,
  spacing,
} from "~/design-system/tokens";

type AppCardProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  shadowStyle?: StyleProp<ViewStyle>;
}>;

export function AppCard({
  children,
  contentStyle,
  shadowStyle,
}: AppCardProps): React.JSX.Element {
  return (
    <View style={[styles.shadowWrapper, shadowStyle]}>
      <View style={[styles.contentWrapper, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    padding: spacing.lg,
    ...Platform.select({
      android: {
        elevation: elevation.floating.android,
      },
      ios: {
        shadowColor: elevation.floating.shadowColor,
        shadowOffset: elevation.floating.shadowOffset,
        shadowOpacity: elevation.floating.shadowOpacity,
        shadowRadius: elevation.floating.shadowRadius,
      },
      default: {},
    }),
  },
  shadowWrapper: {
    marginHorizontal: 2,
  },
});
