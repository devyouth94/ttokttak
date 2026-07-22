import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { borderRadius } from "~/shared/ui/tokens";
import { useThemeColors } from "~/theme/context";

import { ScreenHeader } from "./screen-header";

type FocusScreenHeaderProps = {
  backAccessibilityHint?: string;
  backAccessibilityLabel?: string;
  onBack: () => void;
  rightSlot?: ReactNode;
  title: string;
};

export function FocusScreenHeader({
  backAccessibilityHint = "이전 화면으로 돌아가요.",
  backAccessibilityLabel = "뒤로 가기",
  onBack,
  rightSlot,
  title,
}: FocusScreenHeaderProps): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <ScreenHeader
      leftSlot={
        <Pressable
          accessibilityHint={backAccessibilityHint}
          accessibilityLabel={backAccessibilityLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: themeColors.primary },
            pressed && styles.buttonPressed,
          ]}
        >
          <ArrowLeft color={themeColors.primaryForeground} size={18} />
        </Pressable>
      }
      rightSlot={rightSlot ?? <View style={styles.rightActionSpacer} />}
      title={title}
    />
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  rightActionSpacer: {
    height: 48,
    width: 48,
  },
});
