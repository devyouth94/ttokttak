import { Pressable, StyleSheet, View } from "react-native";
import * as Select from "@rn-primitives/select";
import { Check, ChevronDown } from "lucide-react-native";

import { useThemeColors } from "~/theme/provider";

import { AppText } from "./app-text";
import { borderRadius, spacing } from "./tokens";

export type SelectOption<Value extends string> = {
  accessibilityHint?: string;
  label: string;
  value: Value;
};

type SelectMenuProps<Value extends string> = {
  accessibilityHint: string;
  accessibilityLabel: string;
  disabled?: boolean;
  options: SelectOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

export function SelectMenu<Value extends string>({
  accessibilityHint,
  accessibilityLabel,
  disabled = false,
  options,
  value,
  onChange,
}: SelectMenuProps<Value>): React.JSX.Element {
  const themeColors = useThemeColors();

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0]!;

  function changeValue(nextOption: Select.Option | undefined): void {
    const nextValue = options.find(
      (option) => option.value === nextOption?.value
    )?.value;

    if (nextValue) {
      onChange(nextValue);
    }
  }

  return (
    <Select.Root
      disabled={disabled}
      onValueChange={changeValue}
      value={selectedOption}
    >
      <Select.Trigger asChild>
        <Pressable
          accessibilityHint={accessibilityHint}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.trigger,
            { borderColor: themeColors.primary },
            disabled ? styles.disabledTrigger : undefined,
            pressed ? styles.pressed : undefined,
          ]}
        >
          <View style={styles.triggerTextSlot}>
            <AppText
              ellipsizeMode="tail"
              numberOfLines={1}
              style={{ color: themeColors.text }}
              variant="label"
            >
              {selectedOption.label}
            </AppText>
          </View>

          <ChevronDown color={themeColors.text} size={16} />
        </Pressable>
      </Select.Trigger>

      <Select.Portal>
        <Select.Overlay style={StyleSheet.absoluteFill} />

        <Select.Content
          align="end"
          insets={{
            bottom: spacing.lg,
            left: spacing.md,
            right: spacing.md,
            top: spacing.lg,
          }}
          sideOffset={6}
          style={StyleSheet.flatten([
            styles.content,
            { backgroundColor: themeColors.surface },
          ])}
        >
          {options.map((option) => (
            <Select.Item
              accessibilityHint={option.accessibilityHint}
              key={option.value}
              label={option.label}
              style={styles.item}
              value={option.value}
            >
              <View style={styles.textSlot}>
                <AppText
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={{ color: themeColors.text }}
                  variant="label"
                >
                  {option.label}
                </AppText>
              </View>

              <Select.ItemIndicator style={styles.indicator}>
                <Check color={themeColors.text} size={16} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

const styles = StyleSheet.create({
  content: {
    borderRadius: borderRadius.lg,
    minWidth: 180,
    padding: spacing.xxs,
  },
  disabledTrigger: {
    opacity: 0.56,
  },
  indicator: {
    alignItems: "center",
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  item: {
    alignItems: "center",
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
  textSlot: {
    flex: 1,
    minWidth: 0,
  },
  trigger: {
    alignSelf: "flex-end",
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 210,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  triggerTextSlot: {
    flexShrink: 1,
    minWidth: 0,
  },
});
