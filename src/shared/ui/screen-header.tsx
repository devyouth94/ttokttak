import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { useAppThemeColors } from "~/shared/theme";
import { spacing } from "~/shared/ui/tokens";

import { AppText } from "./app-text";

type ScreenHeaderProps = {
  leftSlot?: ReactNode;
  onHeightChange?: (height: number) => void;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: string;
  titleColor?: string;
};

export function ScreenHeader({
  leftSlot,
  onHeightChange,
  rightSlot,
  style,
  title,
  titleColor,
}: ScreenHeaderProps): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <View
      onLayout={({ nativeEvent }) => {
        onHeightChange?.(nativeEvent.layout.height);
      }}
      style={[
        styles.header,
        { backgroundColor: themeColors.background },
        style,
      ]}
    >
      {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}

      <View style={styles.copy}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={leftSlot ? 1 : 2}
          style={[styles.title, { color: titleColor ?? themeColors.text }]}
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
    alignItems: "center",
    flexDirection: "row",
    height: 64,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    width: "100%",
  },
  leftSlot: {
    alignItems: "flex-start",
    marginRight: spacing.md,
    position: "relative",
    zIndex: 20,
  },
  rightSlot: {
    alignItems: "flex-end",
    position: "relative",
    zIndex: 20,
  },
  title: {},
});
