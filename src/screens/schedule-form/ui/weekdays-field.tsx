import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

import type { ScheduleFormValues } from "../form-values";
import { useScheduleFormSetters } from "../use-form-setters";

export function WeekdaysField(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const {
    control,
    formState: { errors },
  } = useFormContext<ScheduleFormValues>();
  const { setField } = useScheduleFormSetters();
  const selected = useWatch({ control, name: "weekdayMask" });

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
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

  function toggleWeekday(weekday: number): void {
    setField(
      "weekdayMask",
      selected.includes(weekday)
        ? selected.filter((value) => value !== weekday)
        : [...selected, weekday]
    );
  }

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
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
              onPress={() => toggleWeekday(weekday.value)}
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
      {errors.weekdayMask?.message && (
        <AppText style={styles.fieldError} variant="caption">
          {errors.weekdayMask.message}
        </AppText>
      )}
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    field: {
      gap: spacing.xs,
    },
    fieldError: {
      color: themeColors.error,
    },
    fieldLabel: {
      color: themeColors.text,
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
