import { Pressable, StyleSheet, View } from "react-native";
import * as Select from "@rn-primitives/select";
import { Check, ChevronDown } from "lucide-react-native";

import { AppText } from "~/shared/ui/app-text";
import { borderRadius, spacing } from "~/shared/ui/tokens";
import { useThemeColors } from "~/theme/context";

export type SelectOption<Value extends string> = {
  accessibilityHint?: string;
  label: string;
  leading?: React.ReactNode;
  value: Value;
};

type SelectMenuProps<Value extends string> = {
  accessibilityHint: string;
  accessibilityLabel: string;
  align?: "start" | "center" | "end";
  disabled?: boolean;
  options: SelectOption<Value>[];
  value: Value;
  variant?: "compact" | "field";
  onChange: (value: Value) => void;
};

export function SelectMenu<Value extends string>({
  accessibilityHint,
  accessibilityLabel,
  align = "start",
  disabled = false,
  options,
  value,
  variant = "field",
  onChange,
}: SelectMenuProps<Value>): React.JSX.Element {
  const themeColors = useThemeColors();

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0]!;
  const isCompact = variant === "compact";

  return (
    <Select.Root
      disabled={disabled}
      onValueChange={(nextOption) => {
        const nextValue = options.find(
          (option) => option.value === nextOption?.value
        )?.value;

        if (nextValue) {
          onChange(nextValue);
        }
      }}
      value={selectedOption}
    >
      <Select.Trigger asChild>
        <Pressable
          accessibilityHint={accessibilityHint}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.trigger,
            isCompact ? styles.compactTrigger : styles.fieldTrigger,
            {
              borderColor: isCompact ? themeColors.primary : themeColors.border,
            },
            disabled ? styles.disabledTrigger : undefined,
            pressed ? styles.pressed : undefined,
          ]}
        >
          {selectedOption.leading}

          <View
            style={isCompact ? styles.compactTriggerTextSlot : styles.textSlot}
          >
            <AppText
              ellipsizeMode="tail"
              numberOfLines={1}
              style={{ color: themeColors.text }}
              variant={isCompact ? "label" : "body3"}
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
          align={align}
          insets={{
            bottom: spacing.lg,
            left: spacing.md,
            right: spacing.md,
            top: spacing.lg,
          }}
          sideOffset={6}
          style={StyleSheet.flatten([
            isCompact ? styles.compactContent : styles.fieldContent,
            { backgroundColor: themeColors.surface },
          ])}
        >
          {options.map((option) => (
            <Select.Item
              accessibilityHint={option.accessibilityHint}
              key={option.value}
              label={option.label}
              style={[
                styles.item,
                isCompact ? styles.compactItem : styles.fieldItem,
              ]}
              value={option.value}
            >
              {option.leading}
              <View style={styles.textSlot}>
                <AppText
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={{ color: themeColors.text }}
                  variant={isCompact ? "label" : "body3"}
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
  compactContent: {
    borderRadius: borderRadius.lg,
    minWidth: 180,
    padding: spacing.xxs,
  },
  compactItem: {
    gap: spacing.md,
    minHeight: 40,
  },
  compactTrigger: {
    alignSelf: "flex-end",
    borderRadius: borderRadius.pill,
    maxWidth: 210,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  compactTriggerTextSlot: {
    flexShrink: 1,
    minWidth: 0,
  },
  disabledTrigger: {
    opacity: 0.56,
  },
  fieldContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.xxs,
    width: "100%",
  },
  fieldItem: {
    gap: spacing.sm,
    minHeight: 44,
  },
  fieldTrigger: {
    borderRadius: borderRadius.xl,
    minHeight: 48,
    paddingHorizontal: spacing.md,
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
    justifyContent: "space-between",
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
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
});
