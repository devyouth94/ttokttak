import { forwardRef } from "react";
import type { PressableProps } from "react-native";
import { Pressable, StyleSheet } from "react-native";

import { borderRadius } from "~/design-system/tokens";

type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = Omit<PressableProps, "children" | "style"> & {
  accessibilityLabel: string;
  icon: React.JSX.Element;
  size?: IconButtonSize;
  style?: PressableProps["style"];
};

export const IconButton = forwardRef<
  React.ElementRef<typeof Pressable>,
  IconButtonProps
>(function IconButton(
  {
    accessibilityLabel,
    accessibilityRole = "button",
    accessibilityState,
    disabled = false,
    icon,
    size = "md",
    style,
    ...pressableProps
  },
  ref
): React.JSX.Element {
  const isDisabled = disabled === true;

  return (
    <Pressable
      {...pressableProps}
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: isDisabled }}
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        styles[size],
        isDisabled && styles.buttonDisabled,
        state.pressed && !isDisabled && styles.buttonPressed,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {icon}
    </Pressable>
  );
});

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
