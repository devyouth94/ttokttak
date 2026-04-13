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

type ScreenHeaderProps = {
  onBack: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function ScreenHeader({
  onBack,
  style,
  title,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <View style={[styles.header, style]}>
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

      <AppText style={styles.title} variant="title">
        {title}
      </AppText>

      <View style={styles.spacer} />
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
    flexDirection: "row",
    height: 60,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  spacer: {
    width: 40,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: 28,
  },
});
