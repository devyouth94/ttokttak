import { useTranslation } from "react-i18next";
import {
  Alert,
  type LayoutChangeEvent,
  Pressable,
  Switch,
  View,
} from "react-native";
import { Info } from "lucide-react-native";

import { useAppLanguage } from "~/i18n/provider";
import { type ColorKey, getColorOptions } from "~/schedule/display/color";
import {
  type AnchorType,
  type RecurrenceType,
  supportsCompletion,
} from "~/schedule/rules/recurrence";
import type { ThemeColors } from "~/theme/colors";
import { AppText } from "~/ui/app-text";
import { SelectMenu, type SelectOption } from "~/ui/select-menu";

import type { ScheduleFormScreenStyles } from "./styles";

export function ColorField({
  selected,
  styles,
  onSelect,
}: {
  selected: ColorKey;
  styles: ScheduleFormScreenStyles;
  onSelect: (color: ColorKey) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const options = getColorOptions(language).map((option) => ({
    accessibilityHint: t("scheduleForm.color.optionHint", {
      color: option.label,
    }),
    label: option.label,
    leading: (
      <View
        style={[styles.colorSwatch, { backgroundColor: option.swatchColor }]}
      />
    ),
    value: option.value,
  })) satisfies SelectOption<ColorKey>[];
  const selectedOption =
    options.find((option) => option.value === selected) ?? options[0]!;

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
        {t("scheduleForm.fields.color")}
      </AppText>
      <SelectMenu
        accessibilityHint={t("scheduleForm.color.menuHint")}
        accessibilityLabel={t("scheduleForm.color.menuLabel", {
          color: selectedOption.label,
        })}
        options={options}
        value={selectedOption.value}
        onChange={onSelect}
      />
    </View>
  );
}

export function ScheduleOptions({
  anchorError,
  anchorType,
  notificationsEnabled,
  recurrenceType,
  styles,
  themeColors,
  onSelectAnchorType,
  onLayout,
  onToggleNotifications,
}: {
  anchorError?: string;
  anchorType: AnchorType;
  notificationsEnabled: boolean;
  recurrenceType: RecurrenceType;
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  onSelectAnchorType: (anchorType: AnchorType) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onToggleNotifications: (value: boolean) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const canUseCompletion = supportsCompletion(recurrenceType);
  const usesCompletion = canUseCompletion && anchorType === "completion_based";

  function toggleCompletion(value: boolean): void {
    if (canUseCompletion) {
      onSelectAnchorType(value ? "completion_based" : "fixed");
    }
  }

  return (
    <View onLayout={onLayout} style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
        {t("scheduleForm.sections.options")}
      </AppText>
      <View style={styles.optionRows}>
        <View style={styles.optionToggleRow}>
          <AppText style={styles.optionToggleLabel} variant="body2">
            {t("scheduleForm.fields.notificationsEnabled")}
          </AppText>
          <Switch
            onValueChange={onToggleNotifications}
            style={styles.optionToggleSwitch}
            thumbColor={themeColors.primaryForeground}
            trackColor={{
              false: themeColors.controlTrack,
              true: themeColors.primary,
            }}
            value={notificationsEnabled}
          />
        </View>

        <View style={styles.optionToggleGroup}>
          <View style={styles.optionToggleRow}>
            <View style={styles.optionToggleLabelGroup}>
              <AppText style={styles.optionToggleLabel} variant="body2">
                {t("scheduleForm.completionBased.title")}
              </AppText>
              <Pressable
                accessibilityHint={t("scheduleForm.completionBased.infoHint")}
                accessibilityLabel={t("scheduleForm.completionBased.infoLabel")}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    t("scheduleForm.completionBased.title"),
                    t("scheduleForm.completionBased.description")
                  )
                }
                style={({ pressed }) => [
                  styles.optionInfoButton,
                  pressed ? styles.inlineActionPressed : undefined,
                ]}
              >
                <Info
                  absoluteStrokeWidth
                  color={themeColors.textSoft}
                  size={16}
                  strokeWidth={1.2}
                />
              </Pressable>
            </View>
            <Switch
              disabled={!canUseCompletion}
              onValueChange={toggleCompletion}
              style={styles.optionToggleSwitch}
              thumbColor={themeColors.primaryForeground}
              trackColor={{
                false: themeColors.controlTrack,
                true: themeColors.primary,
              }}
              value={usesCompletion}
            />
          </View>

          {anchorError && (
            <AppText style={styles.fieldError} variant="caption">
              {anchorError}
            </AppText>
          )}
        </View>
      </View>
    </View>
  );
}
