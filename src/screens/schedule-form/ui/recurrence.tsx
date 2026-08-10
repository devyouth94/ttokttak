import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, TextInput, View } from "react-native";

import type { RecurrenceType } from "~/schedule/rules/recurrence";
import type { ThemeColors } from "~/theme/colors";
import { AppText } from "~/ui/app-text";

import type { ScheduleFormScreenStyles } from "./styles";
import { getRecurrenceView } from "./view";

type Props = {
  intervalError?: string;
  intervalValue: string;
  recurrenceType: RecurrenceType;
  selectedWeekdays: number[];
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  weekdayError?: string;
  onChangeIntervalValue: (value: string) => void;
  onSelectRecurrence: (recurrenceType: RecurrenceType) => void;
  onToggleWeekday: (weekdayValue: number) => void;
};

export function RecurrenceSection({
  intervalError,
  intervalValue,
  recurrenceType,
  selectedWeekdays,
  styles,
  themeColors,
  weekdayError,
  onChangeIntervalValue,
  onSelectRecurrence,
  onToggleWeekday,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [isIntervalFocused, setIsIntervalFocused] = useState(false);

  const {
    isCustom,
    isOnce,
    showsStandaloneWeekdays,
    showsWeekdays,
    weekdaysInsideCustom,
  } = getRecurrenceView(recurrenceType);

  const quickOptions = (
    [
      { label: t("scheduleForm.recurrence.daily"), value: "daily" },
      { label: t("scheduleForm.recurrence.weekly"), value: "weekly" },
      { label: t("scheduleForm.recurrence.monthly"), value: "monthly" },
    ] as const
  ).map((option) => (
    <OptionButton
      key={option.value}
      label={option.label}
      onPress={() => onSelectRecurrence(option.value)}
      selected={recurrenceType === option.value}
      styles={styles}
      variant="primary"
    />
  ));

  const customUnits = (
    [
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
    ] as const
  ).map((option) => (
    <OptionButton
      key={option.value}
      label={option.label}
      onPress={() => onSelectRecurrence(option.value)}
      selected={recurrenceType === option.value}
      styles={styles}
      variant="unit"
    />
  ));

  const weekdays = showsWeekdays && (
    <WeekdaySelector
      error={weekdayError}
      selected={selectedWeekdays}
      styles={styles}
      onToggle={onToggleWeekday}
    />
  );

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
        {t("scheduleForm.sections.recurrence")}
      </AppText>

      <View style={styles.recurrenceSettingsStack}>
        <View style={styles.recurrenceModeTabs}>
          <ModeTab
            label={t("scheduleForm.recurrence.basicTab")}
            onPress={() => onSelectRecurrence("daily")}
            selected={!isCustom}
            styles={styles}
          />
          <ModeTab
            label={t("scheduleForm.recurrence.customTab")}
            onPress={() => onSelectRecurrence("interval_days")}
            selected={isCustom}
            styles={styles}
          />
        </View>

        {isCustom ? (
          <View style={styles.quickRecurrenceContent}>
            <View style={styles.customRecurrenceControlGroup}>
              <AppText style={styles.subFieldLabel} variant="body2">
                {t("scheduleForm.recurrence.intervalLabel")}
              </AppText>
              <View style={styles.customRecurrenceControls}>
                <TextInput
                  accessibilityLabel={t("scheduleForm.recurrence.intervalA11y")}
                  keyboardType="number-pad"
                  onBlur={() => setIsIntervalFocused(false)}
                  onChangeText={onChangeIntervalValue}
                  onFocus={() => setIsIntervalFocused(true)}
                  placeholder="1"
                  placeholderTextColor={themeColors.textMuted}
                  style={[
                    styles.textInput,
                    styles.customRecurrenceInput,
                    isIntervalFocused ? styles.inputFocused : undefined,
                    intervalError ? styles.inputError : undefined,
                  ]}
                  value={intervalValue}
                />

                {customUnits}
              </View>

              {intervalError && (
                <AppText style={styles.fieldError} variant="caption">
                  {intervalError}
                </AppText>
              )}
            </View>

            {weekdaysInsideCustom && weekdays}
          </View>
        ) : (
          <View style={styles.quickRecurrenceContent}>
            <View style={styles.quickRecurrenceGrid}>
              {quickOptions}
              <OptionButton
                label={t("scheduleForm.recurrence.once")}
                onPress={() => onSelectRecurrence("once")}
                selected={isOnce}
                styles={styles}
                variant="primary"
              />
            </View>

            {showsStandaloneWeekdays && weekdays}
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
  styles: ScheduleFormScreenStyles;
  variant: "primary" | "unit";
}): React.JSX.Element {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isPrimary ? styles.primaryRecurrenceChip : undefined,
        styles.quickRecurrenceChip,
        variant === "unit" ? styles.customRecurrenceUnitOption : undefined,
        selected ? styles.quickRecurrenceChipSelected : undefined,
        pressed ? styles.chipPressed : undefined,
      ]}
    >
      <AppText
        style={[
          styles.quickRecurrenceChipText,
          selected ? styles.quickRecurrenceChipTextSelected : undefined,
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
  styles: ScheduleFormScreenStyles;
}): React.JSX.Element {
  return (
    <Pressable
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
  styles: ScheduleFormScreenStyles;
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
