import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";

import { borderRadius } from "~/design-system/tokens";

type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = {
  accessibilityHint?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  icon: React.JSX.Element;
  onPress: () => void;
  size?: IconButtonSize;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  accessibilityHint,
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  size = "md",
  style,
}: IconButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[size],
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  lg: {
    height: 48,
    width: 48,
  },
  md: {
    height: 40,
    width: 40,
  },
  sm: {
    height: 32,
    width: 32,
  },
});
