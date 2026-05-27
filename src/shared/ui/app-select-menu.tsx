import { Pressable, StyleSheet, View } from "react-native";
import * as Select from "@rn-primitives/select";
import { Check, ChevronDown } from "lucide-react-native";

import { useAppThemeColors } from "~/shared/theme/theme-context";
import { borderRadius, spacing } from "~/shared/ui/tokens";

import { AppText } from "./app-text";

export type AppSelectMenuOption<Value extends string> = {
  accessibilityHint?: string;
  label: string;
  leading?: React.ReactNode;
  value: Value;
};

type AppSelectMenuVariant = "compact" | "field";

type AppSelectMenuProps<Value extends string> = {
  accessibilityHint: string;
  accessibilityLabel: string;
  align?: "start" | "center" | "end";
  isDisabled?: boolean;
  options: AppSelectMenuOption<Value>[];
  value: Value;
  variant?: AppSelectMenuVariant;
  onChange: (value: Value) => void;
};

export function AppSelectMenu<Value extends string>({
  accessibilityHint,
  accessibilityLabel,
  align = "start",
  isDisabled = false,
  options,
  value,
  variant = "field",
  onChange,
}: AppSelectMenuProps<Value>): React.JSX.Element {
  const themeColors = useAppThemeColors();
  const selectedOption = getSelectedOption(options, value);
  const isCompact = variant === "compact";

  return (
    <Select.Root
      onValueChange={(nextOption) => {
        const nextValue = getOptionValue(options, nextOption?.value);

        if (nextValue && !isDisabled) {
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
          disabled={isDisabled}
          style={({ pressed }) => [
            styles.trigger,
            isCompact ? styles.compactTrigger : styles.fieldTrigger,
            {
              borderColor: isCompact
                ? themeColors.primary
                : themeColors.dividerOnPrimary,
            },
            isDisabled ? styles.disabledTrigger : undefined,
            pressed
              ? isCompact
                ? styles.compactPressed
                : styles.fieldPressed
              : undefined,
          ]}
        >
          {selectedOption.leading}
          <View
            style={isCompact ? styles.compactTriggerTextSlot : styles.textSlot}
          >
            <AppText
              ellipsizeMode="tail"
              numberOfLines={1}
              style={[styles.text, { color: themeColors.text }]}
              variant={isCompact ? "label" : "body3"}
            >
              {selectedOption.label}
            </AppText>
          </View>
          <ChevronDown color={themeColors.text} size={16} />
        </Pressable>
      </Select.Trigger>

      <Select.Portal>
        <Select.Overlay closeOnPress style={styles.overlay} />
        <Select.Content
          align={align}
          avoidCollisions
          insets={{
            bottom: spacing.lg,
            left: spacing.md,
            right: spacing.md,
            top: spacing.lg,
          }}
          side="bottom"
          sideOffset={6}
          style={StyleSheet.flatten([
            isCompact ? styles.compactContent : styles.fieldContent,
            { backgroundColor: themeColors.surface },
          ])}
        >
          {options.map((option) => (
            <Select.Item
              accessibilityHint={option.accessibilityHint}
              closeOnPress
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
                  style={[styles.text, { color: themeColors.text }]}
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

function getSelectedOption<Value extends string>(
  options: AppSelectMenuOption<Value>[],
  value: Value
): AppSelectMenuOption<Value> {
  return options.find((option) => option.value === value) ?? options[0]!;
}

function getOptionValue<Value extends string>(
  options: AppSelectMenuOption<Value>[],
  value: string | undefined
): Value | null {
  const option = options.find((candidate) => candidate.value === value);

  return option?.value ?? null;
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
  compactPressed: {
    opacity: 0.72,
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
  fieldPressed: {
    opacity: 0.88,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  text: {},
  textSlot: {
    flex: 1,
    minWidth: 0,
  },
  trigger: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
});
