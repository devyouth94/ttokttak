import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";

import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";

import { AppText } from "./app-text";

type LegacyScreenHeaderProps = {
  leftSlot?: ReactNode;
  onBack?: () => void;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function LegacyScreenHeader({
  leftSlot,
  onBack,
  rightSlot,
  style,
  title,
}: LegacyScreenHeaderProps): React.JSX.Element {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.slot}>
        {leftSlot ??
          (onBack ? (
            <Pressable
              accessibilityHint="이전 화면으로 돌아갑니다."
              accessibilityLabel="뒤로 가기"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <ChevronLeft color={colors.text} size={22} />
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          ))}
      </View>

      <AppText style={styles.title} variant="title">
        {title}
      </AppText>

      <View style={styles.slot}>
        {rightSlot ?? <View style={styles.spacer} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  backButtonPressed: {
    opacity: 0.88,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.dividerOnPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 60,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  slot: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    minWidth: 40,
    zIndex: 1,
  },
  spacer: {
    width: 40,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.title,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.lineHeight.title,
    left: 0,
    position: "absolute",
    right: 0,
    textAlign: "center",
    top: 15,
  },
});
