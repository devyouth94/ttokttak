import { useMemo, useState } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  type RecurrenceType,
  requiresInterval,
} from "~/schedule/rules/recurrence";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing, typography } from "~/ui/tokens";

import { getRecurrenceChange, type ScheduleFormValues } from "../form-values";
import { useScheduleFormSetters } from "../use-form-setters";

export function RecurrenceSection(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const {
    clearErrors,
    control,
    formState: { errors },
    getValues,
  } = useFormContext<ScheduleFormValues>();
  const { setField } = useScheduleFormSetters();

  const {
    field: intervalField,
    fieldState: { error: intervalError },
  } = useController({ control, name: "intervalValue" });

  const [recurrenceType, weekdayMask] = useWatch({
    control,
    name: ["recurrenceType", "weekdayMask"],
  });

  const [isIntervalFocused, setIsIntervalFocused] = useState(false);

  const usesCustomInterval = requiresInterval(recurrenceType);
  const weekdayError = errors.weekdayMask?.message;

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

  function toggleWeekday(weekday: number): void {
    setField(
      "weekdayMask",
      weekdayMask.includes(weekday)
        ? weekdayMask.filter((value) => value !== weekday)
        : [...weekdayMask, weekday]
    );
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
                <TextInput
                  accessibilityLabel={t("scheduleForm.recurrence.intervalA11y")}
                  keyboardType="number-pad"
                  onBlur={() => {
                    intervalField.onBlur();
                    setIsIntervalFocused(false);
                  }}
                  onChangeText={(value) => {
                    clearErrors("root");
                    intervalField.onChange(value.replace(/[^0-9]/g, ""));
                  }}
                  onFocus={() => setIsIntervalFocused(true)}
                  placeholder="1"
                  placeholderTextColor={themeColors.textMuted}
                  style={[
                    styles.textInput,
                    styles.customRecurrenceInput,
                    isIntervalFocused ? styles.inputFocused : undefined,
                    intervalError ? styles.inputError : undefined,
                  ]}
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

            {recurrenceType === "interval_weeks" && (
              <WeekdaySelector
                error={weekdayError}
                selected={weekdayMask}
                styles={styles}
                onToggle={toggleWeekday}
              />
            )}
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

            {recurrenceType === "weekly" && (
              <WeekdaySelector
                error={weekdayError}
                selected={weekdayMask}
                styles={styles}
                onToggle={toggleWeekday}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function OptionButton({
  label,
  onPress,
  selected,
  styles,
  variant,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
  variant: "primary" | "unit";
}): React.JSX.Element {
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

function ModeTab({
  label,
  onPress,
  selected,
  styles,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
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

function WeekdaySelector({
  error,
  selected,
  styles,
  onToggle,
}: {
  error?: string;
  selected: number[];
  styles: ReturnType<typeof createStyles>;
  onToggle: (weekday: number) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const selectedDays = new Set(selected);
  const options = [
    { label: t("scheduleForm.recurrence.weekdayMon"), value: 1 },
    { label: t("scheduleForm.recurrence.weekdayTue"), value: 2 },
    { label: t("scheduleForm.recurrence.weekdayWed"), value: 3 },
    { label: t("scheduleForm.recurrence.weekdayThu"), value: 4 },
    { label: t("scheduleForm.recurrence.weekdayFri"), value: 5 },
    { label: t("scheduleForm.recurrence.weekdaySat"), value: 6 },
    { label: t("scheduleForm.recurrence.weekdaySun"), value: 0 },
  ];

  return (
    <View style={styles.field}>
      <AppText style={styles.subFieldLabel} variant="body2">
        {t("scheduleForm.recurrence.weekdayLabel")}
      </AppText>
      <View style={styles.weekdayGroup}>
        {options.map((weekday) => {
          const isSelected = selectedDays.has(weekday.value);

          return (
            <Pressable
              accessibilityLabel={weekday.label}
              accessibilityRole="button"
              key={weekday.value}
              onPress={() => onToggle(weekday.value)}
              style={({ pressed }) => [
                styles.weekdayChip,
                isSelected ? styles.weekdayChipSelected : undefined,
                pressed ? styles.weekdayChipPressed : undefined,
              ]}
            >
              <AppText
                style={
                  isSelected
                    ? styles.weekdayChipTextSelected
                    : styles.weekdayChipText
                }
                variant="body3"
              >
                {weekday.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {error && (
        <AppText style={styles.fieldError} variant="caption">
          {error}
        </AppText>
      )}
    </View>
  );
}

function createStyles(themeColors: ReturnType<typeof useThemeColors>) {
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
    inputError: {
      borderColor: themeColors.error,
    },
    inputFocused: {
      borderColor: themeColors.primary,
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
    textInput: {
      backgroundColor: "transparent",
      borderColor: themeColors.border,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      color: themeColors.text,
      fontFamily: typography.fontFamily.body,
      fontSize: typography.size.body3,
      lineHeight: typography.lineHeight.body3,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    weekdayChip: {
      alignItems: "center",
      aspectRatio: 1,
      backgroundColor: "transparent",
      borderColor: themeColors.primary,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
    },
    weekdayChipPressed: {
      opacity: 0.88,
    },
    weekdayChipSelected: {
      backgroundColor: themeColors.primary,
    },
    weekdayChipText: {
      color: themeColors.text,
    },
    weekdayChipTextSelected: {
      color: themeColors.primaryForeground,
    },
    weekdayGroup: {
      flexDirection: "row",
      gap: 4,
    },
  });
}
