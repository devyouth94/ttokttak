import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { useThemeColors } from "~/theme/provider";

import { AppText } from "./app-text";
import { spacing } from "./tokens";

type ScreenHeaderProps = {
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: string;
  titleColor?: string;
};

export function ScreenHeader({
  leftSlot,
  rightSlot,
  style,
  title,
  titleColor,
}: ScreenHeaderProps): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: themeColors.background },
        style,
      ]}
    >
      {leftSlot && <View style={styles.leftSlot}>{leftSlot}</View>}

      <View style={styles.copy}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={leftSlot ? 1 : 2}
          style={{ color: titleColor ?? themeColors.text }}
          variant="display"
        >
          {title}
        </AppText>
      </View>

      {rightSlot && <View style={styles.rightSlot}>{rightSlot}</View>}
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
});
