import { useMemo, useState } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import {
  type RecurrenceType,
  requiresInterval,
} from "~/schedule/rules/recurrence";
import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { AppTextInput } from "~/ui/app-text-input";
import { borderRadius, spacing } from "~/ui/tokens";

import { WeekdaysField } from "./weekdays-field";
import { getRecurrenceChange, type ScheduleFormValues } from "../form-values";
import { useScheduleFormSetters } from "../use-form-setters";

export function RecurrenceSection(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const { clearErrors, control, getValues } =
    useFormContext<ScheduleFormValues>();
  const { setField } = useScheduleFormSetters();

  const {
    field: intervalField,
    fieldState: { error: intervalError },
  } = useController({ control, name: "intervalValue" });

  const recurrenceType = useWatch({ control, name: "recurrenceType" });

  const [isIntervalFocused, setIsIntervalFocused] = useState(false);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const usesCustomInterval = requiresInterval(recurrenceType);

  const basicRecurrenceOptions = [
    { label: t("scheduleForm.recurrence.daily"), value: "daily" },
    { label: t("scheduleForm.recurrence.weekly"), value: "weekly" },
    { label: t("scheduleForm.recurrence.monthly"), value: "monthly" },
  ] as const;

  const intervalUnitOptions = [
    {
      label: t("scheduleForm.recurrence.unitDays"),
      value: "interval_days",
    },
    {
      label: t("scheduleForm.recurrence.unitWeeks"),
      value: "interval_weeks",
    },
    {
      label: t("scheduleForm.recurrence.unitMonths"),
      value: "interval_months",
    },
  ] as const;

  function selectRecurrence(nextType: RecurrenceType): void {
    const change = getRecurrenceChange(getValues(), nextType);

    setField("anchorType", change.anchorType);
    setField("endDateLocal", change.endDateLocal);
    setField("intervalValue", change.intervalValue);
    setField("recurrenceType", change.recurrenceType);
    setField("weekdayMask", change.weekdayMask);
  }

  function blurInterval(): void {
    intervalField.onBlur();
    setIsIntervalFocused(false);
  }

  function changeInterval(value: string): void {
    clearErrors("root");
    intervalField.onChange(value.replace(/[^0-9]/g, ""));
  }

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
        {t("scheduleForm.sections.recurrence")}
      </AppText>

      <View style={styles.recurrenceSettingsStack}>
        <View style={styles.recurrenceModeTabs}>
          <ModeTab
            label={t("scheduleForm.recurrence.basicTab")}
            onPress={() => selectRecurrence("daily")}
            selected={!usesCustomInterval}
            styles={styles}
          />
          <ModeTab
            label={t("scheduleForm.recurrence.customTab")}
            onPress={() => selectRecurrence("interval_days")}
            selected={usesCustomInterval}
            styles={styles}
          />
        </View>

        {usesCustomInterval ? (
          <View style={styles.quickRecurrenceContent}>
            <View style={styles.customRecurrenceControlGroup}>
              <AppText style={styles.subFieldLabel} variant="body2">
                {t("scheduleForm.recurrence.intervalLabel")}
              </AppText>
              <View style={styles.customRecurrenceControls}>
                <AppTextInput
                  accessibilityLabel={t("scheduleForm.recurrence.intervalA11y")}
                  error={Boolean(intervalError)}
                  focused={isIntervalFocused}
                  keyboardType="number-pad"
                  onBlur={blurInterval}
                  onChangeText={changeInterval}
                  onFocus={() => setIsIntervalFocused(true)}
                  placeholder="1"
                  style={styles.customRecurrenceInput}
                  value={intervalField.value}
                />

                {intervalUnitOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    label={option.label}
                    onPress={() => selectRecurrence(option.value)}
                    selected={recurrenceType === option.value}
                    styles={styles}
                    variant="unit"
                  />
                ))}
              </View>

              {intervalError?.message && (
                <AppText style={styles.fieldError} variant="caption">
                  {intervalError.message}
                </AppText>
              )}
            </View>

            {recurrenceType === "interval_weeks" && <WeekdaysField />}
          </View>
        ) : (
          <View style={styles.quickRecurrenceContent}>
            <View style={styles.quickRecurrenceGrid}>
              {basicRecurrenceOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  label={option.label}
                  onPress={() => selectRecurrence(option.value)}
                  selected={recurrenceType === option.value}
                  styles={styles}
                  variant="primary"
                />
              ))}
              <OptionButton
                label={t("scheduleForm.recurrence.once")}
                onPress={() => selectRecurrence("once")}
                selected={recurrenceType === "once"}
                styles={styles}
                variant="primary"
              />
            </View>

            {recurrenceType === "weekly" && <WeekdaysField />}
          </View>
        )}
      </View>
    </View>
  );
}

type OptionButtonProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
  variant: "primary" | "unit";
};

function OptionButton({
  label,
  onPress,
  selected,
  styles,
  variant,
}: OptionButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.recurrenceOption,
        variant === "unit" ? styles.recurrenceUnitOption : undefined,
        selected ? styles.recurrenceOptionSelected : undefined,
        pressed ? styles.recurrenceOptionPressed : undefined,
      ]}
    >
      <AppText
        style={[
          styles.recurrenceOptionText,
          selected ? styles.recurrenceOptionTextSelected : undefined,
        ]}
        variant="body3"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

type ModeTabProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
};

function ModeTab({
  label,
  onPress,
  selected,
  styles,
}: ModeTabProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => !selected && onPress()}
      style={({ pressed }) => [
        styles.recurrenceModeTab,
        selected ? styles.recurrenceModeTabSelected : undefined,
        pressed && !selected ? styles.recurrenceModeTabPressed : undefined,
      ]}
    >
      <AppText
        style={
          selected
            ? styles.recurrenceModeTabTextSelected
            : styles.recurrenceModeTabText
        }
        variant="body3"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    customRecurrenceControlGroup: {
      gap: spacing.xs,
    },
    customRecurrenceControls: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    customRecurrenceInput: {
      flex: 1,
      height: 36,
      minHeight: 36,
      minWidth: 0,
      paddingVertical: spacing.xxs,
      textAlign: "center",
    },
    field: {
      gap: spacing.xs,
    },
    fieldError: {
      color: themeColors.error,
    },
    fieldLabel: {
      color: themeColors.text,
    },
    quickRecurrenceContent: {
      gap: spacing.xs,
    },
    quickRecurrenceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    recurrenceModeTab: {
      alignItems: "center",
      borderRadius: borderRadius.pill,
      flex: 1,
      height: "100%",
      justifyContent: "center",
    },
    recurrenceModeTabPressed: {
      opacity: 0.88,
    },
    recurrenceModeTabs: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      flexDirection: "row",
      height: 36,
      overflow: "hidden",
    },
    recurrenceModeTabSelected: {
      backgroundColor: themeColors.primary,
    },
    recurrenceModeTabText: {
      color: themeColors.textSoft,
    },
    recurrenceModeTabTextSelected: {
      color: themeColors.primaryForeground,
    },
    recurrenceOption: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderColor: themeColors.primary,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      flex: 1,
      height: 36,
      justifyContent: "center",
      minHeight: 36,
      minWidth: 52,
      paddingHorizontal: spacing.sm,
    },
    recurrenceOptionPressed: {
      opacity: 0.88,
    },
    recurrenceOptionSelected: {
      backgroundColor: themeColors.primary,
    },
    recurrenceOptionText: {
      color: themeColors.text,
    },
    recurrenceOptionTextSelected: {
      color: themeColors.primaryForeground,
    },
    recurrenceSettingsStack: {
      gap: spacing.xs,
    },
    recurrenceUnitOption: {
      minWidth: 0,
    },
    subFieldLabel: {
      color: themeColors.text,
    },
  });
}
