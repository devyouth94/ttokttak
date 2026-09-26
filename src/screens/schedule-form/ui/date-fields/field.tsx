import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Switch, View } from "react-native";
import { format } from "date-fns/format";
import { CalendarDays, Clock3 } from "lucide-react-native";

import { useAppLanguage } from "~/i18n/provider";
import { formatLocal } from "~/schedule/display/date";
import {
  getFirstReminderDate,
  getStartDateChange,
  type ScheduleFormValues,
} from "~/screens/schedule-form/form-values";
import { useScheduleFormSetters } from "~/screens/schedule-form/use-form-setters";
import { useTheme } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { spacing } from "~/ui/tokens";

import { DateTimePickerField } from "./picker";

export function DateFields({
  isEdit,
  today,
}: {
  isEdit: boolean;
  today: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const { colors: themeColors } = useTheme();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const {
    control,
    formState: { errors },
    getValues,
  } = useFormContext<ScheduleFormValues>();
  const { setField } = useScheduleFormSetters();

  const [
    endDateLocal,
    intervalValue,
    recurrenceType,
    reminderTimeLocal,
    startDateLocal,
    weekdayMask,
  ] = useWatch({
    control,
    name: [
      "endDateLocal",
      "intervalValue",
      "recurrenceType",
      "reminderTimeLocal",
      "startDateLocal",
      "weekdayMask",
    ],
  });

  const showsEndDate = recurrenceType !== "once";
  const hasEndDate = showsEndDate && endDateLocal !== null;
  const minimumStartDateLocal = isEdit ? startDateLocal : today;
  const minimumEndDateLocal = isEdit
    ? startDateLocal > today
      ? startDateLocal
      : today
    : startDateLocal;
  const firstReminderDate = getFirstReminderDate({
    intervalValue,
    recurrenceType,
    startDateLocal,
    weekdayMask,
  });
  const firstReminder = firstReminderDate
    ? t("scheduleForm.firstReminder", {
        date: formatLocal(firstReminderDate, "weekdayDate", language),
      })
    : null;

  function changeStartDate(date: Date): void {
    if (isEdit) {
      return;
    }

    const selectedDate = format(date, "yyyy-MM-dd");
    const change = getStartDateChange(
      getValues(),
      selectedDate,
      minimumStartDateLocal
    );

    setField("endDateLocal", change.endDateLocal);
    setField("startDateLocal", change.startDateLocal);
    setField("weekdayMask", change.weekdayMask);
  }

  function changeEndDate(date: Date): void {
    const selectedDate = format(date, "yyyy-MM-dd");

    setField(
      "endDateLocal",
      selectedDate < minimumEndDateLocal ? minimumEndDateLocal : selectedDate
    );
  }

  return (
    <View style={styles.scheduleSettingsGroup}>
      <View style={styles.row}>
        <DateTimePickerField
          accessibilityHint={t("scheduleForm.picker.startDateHint")}
          accessibilityLabel={t("scheduleForm.picker.startDateLabel")}
          description={
            isEdit ? t("scheduleForm.fields.startDateLocked") : undefined
          }
          disabled={isEdit}
          displayValue={formatLocal(startDateLocal, "fullDate", language)}
          error={errors.startDateLocal?.message}
          icon={
            <CalendarDays
              absoluteStrokeWidth
              color={themeColors.text}
              size={18}
              strokeWidth={1.2}
            />
          }
          label={t("scheduleForm.fields.startDate")}
          minimumLocalDate={minimumStartDateLocal}
          mode="date"
          onChange={changeStartDate}
          style={styles.dateField}
          title={t("scheduleForm.picker.startDateTitle")}
          localValue={
            startDateLocal < minimumStartDateLocal
              ? minimumStartDateLocal
              : startDateLocal
          }
        />

        <DateTimePickerField
          accessibilityHint={t("scheduleForm.picker.reminderTimeHint")}
          accessibilityLabel={t("scheduleForm.picker.reminderTimeLabel")}
          displayValue={formatLocal(reminderTimeLocal, "time", language)}
          error={errors.reminderTimeLocal?.message}
          icon={
            <Clock3
              absoluteStrokeWidth
              color={themeColors.text}
              size={18}
              strokeWidth={1.2}
            />
          }
          label={t("scheduleForm.fields.reminderTime")}
          mode="time"
          onChange={(date) =>
            setField("reminderTimeLocal", format(date, "HH:mm"))
          }
          style={styles.timeField}
          title={t("scheduleForm.picker.reminderTimeTitle")}
          localValue={reminderTimeLocal}
        />
      </View>

      {showsEndDate && (
        <View style={styles.endDateControl}>
          <View style={styles.optionToggleRow}>
            <AppText style={styles.optionToggleLabel} variant="body2">
              {t("scheduleForm.fields.endDate")}
            </AppText>
            <Switch
              accessibilityHint={t("scheduleForm.endDate.toggleHint")}
              accessibilityLabel={t("scheduleForm.endDate.toggleLabel")}
              onValueChange={(enabled) =>
                setField("endDateLocal", enabled ? minimumEndDateLocal : null)
              }
              style={styles.optionToggleSwitch}
              thumbColor={themeColors.primaryForeground}
              trackColor={{
                false: themeColors.controlTrack,
                true: themeColors.primary,
              }}
              value={hasEndDate}
            />
          </View>

          {hasEndDate && endDateLocal && (
            <DateTimePickerField
              accessibilityHint={t("scheduleForm.picker.endDateHint")}
              accessibilityLabel={t("scheduleForm.picker.endDateLabel")}
              displayValue={formatLocal(endDateLocal, "fullDate", language)}
              error={errors.endDateLocal?.message}
              icon={
                <CalendarDays
                  absoluteStrokeWidth
                  color={themeColors.text}
                  size={18}
                  strokeWidth={1.2}
                />
              }
              minimumLocalDate={minimumEndDateLocal}
              mode="date"
              onChange={changeEndDate}
              style={styles.endDateField}
              title={t("scheduleForm.picker.endDateTitle")}
              localValue={
                endDateLocal < minimumEndDateLocal
                  ? minimumEndDateLocal
                  : endDateLocal
              }
            />
          )}
        </View>
      )}

      {!isEdit && firstReminder && (
        <AppText style={styles.fieldHelper} variant="caption">
          {firstReminder}
        </AppText>
      )}
    </View>
  );
}

function createStyles(themeColors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    dateField: {
      flex: 1.1,
    },
    endDateControl: {
      gap: spacing.xs,
    },
    endDateField: {
      width: "100%",
    },
    fieldHelper: {
      color: themeColors.textMuted,
    },
    optionToggleLabel: {
      color: themeColors.textSoft,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    optionToggleRow: {
      alignItems: "center",
      flexDirection: "row",
      height: 40,
      justifyContent: "space-between",
    },
    optionToggleSwitch: {
      transform: Platform.select({
        ios: [{ translateY: 8 }],
        default: undefined,
      }),
    },
    row: {
      flexDirection: "row",
      gap: spacing.xs,
    },
    scheduleSettingsGroup: {
      gap: spacing.xs,
    },
    timeField: {
      flex: 0.9,
    },
  });
}
