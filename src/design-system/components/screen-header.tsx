import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { color, spacing } from "~/design-system/tokens";

import { AppText } from "./app-text";

type ScreenHeaderProps = {
  onHeightChange?: (height: number) => void;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: string;
  titleColor?: string;
};

export function ScreenHeader({
  onHeightChange,
  rightSlot,
  style,
  title,
  titleColor = color.jetBlack,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <View
      onLayout={({ nativeEvent }) => {
        onHeightChange?.(nativeEvent.layout.height);
      }}
      style={[styles.header, style]}
    >
      <View style={styles.copy}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={2}
          style={[styles.title, { color: titleColor }]}
          variant="display"
        >
          {title}
        </AppText>
      </View>

      {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    alignItems: "flex-start",
    backgroundColor: color.white,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    width: "100%",
  },
  rightSlot: {
    alignItems: "flex-end",
    position: "relative",
    zIndex: 20,
  },
  title: {
    color: color.jetBlack,
  },
});
