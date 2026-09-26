import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { useThemeColors } from "~/theme/provider";

import { ScreenHeader } from "./screen-header";
import { borderRadius } from "./tokens";

type FocusScreenHeaderProps = {
  backAccessibilityHint?: string;
  backAccessibilityLabel?: string;
  onBack: () => void;
  rightSlot?: ReactNode;
  title: string;
};

export function FocusScreenHeader({
  backAccessibilityHint,
  backAccessibilityLabel,
  onBack,
  rightSlot,
  title,
}: FocusScreenHeaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  return (
    <ScreenHeader
      leftSlot={
        <Pressable
          accessibilityHint={backAccessibilityHint ?? t("navigation.backHint")}
          accessibilityLabel={
            backAccessibilityLabel ?? t("navigation.backLabel")
          }
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
