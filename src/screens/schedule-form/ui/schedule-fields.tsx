import { useTranslation } from "react-i18next";
import {
  type LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  Switch,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { CalendarDays, Clock3 } from "lucide-react-native";

import { useAppLanguage } from "~/i18n/provider";
import type { ThemeColors } from "~/theme/colors";
import type { ResolvedTheme } from "~/theme/preference";
import { AppText } from "~/ui/app-text";

import type { ScheduleFormScreenStyles } from "./styles";
import { getDisplayValues } from "./view";
import type { useScheduleForm } from "../form";

type Form = ReturnType<typeof useScheduleForm>;

type Props = {
  actions: Form["actions"];
  errors: Form["errors"];
  picker: Form["picker"];
  resolvedTheme: ResolvedTheme;
  state: Form["state"];
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  values: Form["values"];
  onLayout: (event: LayoutChangeEvent) => void;
};

export function ScheduleFields({
  actions,
  errors,
  picker,
  resolvedTheme,
  state,
  styles,
  themeColors,
  values,
  onLayout,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const {
    endDate: endDateDisplay,
    firstReminder,
    reminderTime: reminderTimeDisplay,
    startDate: startDateDisplay,
  } = getDisplayValues(values, language);
  const showsEndDate = values.recurrenceType !== "once";
  const hasEndDate = showsEndDate && values.endDateLocal !== null;
  const pickerTitle =
    picker.iosMode === "time"
      ? t("scheduleForm.picker.reminderTimeTitle")
      : picker.iosDateTarget === "endDate"
        ? t("scheduleForm.picker.endDateTitle")
        : t("scheduleForm.picker.startDateTitle");
  const iosPickerChangeHandler =
    picker.iosMode === "time"
      ? actions.picker.onTimePickerChange
      : picker.iosDateTarget === "endDate"
        ? actions.picker.onEndDatePickerChange
        : actions.picker.onStartDatePickerChange;

  return (
    <View onLayout={onLayout} style={styles.scheduleSettingsGroup}>
      <View style={styles.row}>
        <PickerField
          description={
            state.isEdit ? t("scheduleForm.fields.startDateLocked") : undefined
          }
          disabled={!state.isStartDateEditable}
          error={errors.startDate}
          icon={
            <CalendarDays
              absoluteStrokeWidth
              color={themeColors.text}
              size={18}
              strokeWidth={1.2}
            />
          }
          label={t("scheduleForm.fields.startDate")}
          accessibilityHint={t("scheduleForm.picker.startDateHint")}
          accessibilityLabel={t("scheduleForm.picker.startDateLabel")}
          onPress={actions.picker.onOpenDatePicker}
          styles={styles}
          value={startDateDisplay}
          variantStyle={styles.dateField}
        />

        <PickerField
          error={errors.reminderTime}
          icon={
            <Clock3
              absoluteStrokeWidth
              color={themeColors.text}
              size={18}
              strokeWidth={1.2}
            />
          }
          label={t("scheduleForm.fields.reminderTime")}
          accessibilityHint={t("scheduleForm.picker.reminderTimeHint")}
          accessibilityLabel={t("scheduleForm.picker.reminderTimeLabel")}
          onPress={actions.picker.onOpenTimePicker}
          styles={styles}
          value={reminderTimeDisplay}
          variantStyle={styles.timeField}
        />
      </View>

      {showsEndDate && (
        <EndDateControl
          displayValue={endDateDisplay}
          error={errors.endDate}
          isEnabled={hasEndDate}
          onDisable={actions.recurrence.onDisableEndDate}
          onEnable={actions.recurrence.onEnableEndDate}
          onOpenPicker={actions.picker.onOpenEndDatePicker}
          styles={styles}
          themeColors={themeColors}
        />
      )}

      {state.isStartDateEditable && firstReminder && (
        <AppText style={styles.fieldHelper} variant="caption">
          {firstReminder}
        </AppText>
      )}

      {picker.isStartDateVisible && (
        <DateTimePicker
          accentColor={themeColors.primary}
          initialInputMode="default"
          minimumDate={picker.minimumStartDate}
          mode="date"
          onChange={actions.picker.onStartDatePickerChange}
          textColor={themeColors.text}
          themeVariant={resolvedTheme}
          value={picker.selectedStartDate}
        />
      )}

      {hasEndDate && picker.isEndDateVisible && (
        <DateTimePicker
          accentColor={themeColors.primary}
          initialInputMode="default"
          minimumDate={picker.minimumEndDate}
          mode="date"
          onChange={actions.picker.onEndDatePickerChange}
          textColor={themeColors.text}
          themeVariant={resolvedTheme}
          value={picker.selectedEndDate}
        />
      )}

      {picker.isTimeVisible && (
        <DateTimePicker
          accentColor={themeColors.primary}
          mode="time"
          onChange={actions.picker.onTimePickerChange}
          textColor={themeColors.text}
          themeVariant={resolvedTheme}
          value={picker.selectedReminderTime}
        />
      )}

      <IosPickerModal
        minimumDate={picker.iosMinimumDate}
        mode={picker.iosMode}
        resolvedTheme={resolvedTheme}
        styles={styles}
        themeColors={themeColors}
        title={pickerTitle}
        value={picker.iosValue}
        onChange={iosPickerChangeHandler}
        onClose={actions.picker.onCloseIosPicker}
        onConfirm={actions.picker.onConfirmIosPicker}
      />
    </View>
  );
}

function PickerField({
  accessibilityHint,
  accessibilityLabel,
  description,
  disabled = false,
  error,
  icon,
  label,
  onPress,
  styles,
  value,
  variantStyle,
}: {
  accessibilityHint: string;
  accessibilityLabel: string;
  description?: string;
  disabled?: boolean;
  error?: string;
  icon: React.JSX.Element;
  label?: string;
  onPress: () => void;
  styles: ScheduleFormScreenStyles;
  value: string;
  variantStyle: object;
}): React.JSX.Element {
  return (
    <View style={[styles.field, variantStyle]}>
      {label && (
        <AppText style={styles.fieldLabel} variant="body2">
          {label}
        </AppText>
      )}
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.iconInputShell,
          styles.compactInput,
          disabled ? styles.iconInputShellDisabled : undefined,
          error ? styles.inputError : undefined,
          pressed && !disabled ? styles.pickerFieldPressed : undefined,
        ]}
      >
        {icon}
        <AppText style={styles.iconInputValue} variant="body3">
          {value}
        </AppText>
      </Pressable>
      {description && (
        <AppText style={styles.fieldHelper} variant="caption">
          {description}
        </AppText>
      )}
      {error && (
        <AppText style={styles.fieldError} variant="caption">
          {error}
        </AppText>
      )}
    </View>
  );
}

function EndDateControl({
  displayValue,
  error,
  isEnabled,
  styles,
  themeColors,
  onDisable,
  onEnable,
  onOpenPicker,
}: {
  displayValue: string | null;
  error?: string;
  isEnabled: boolean;
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  onDisable: () => void;
  onEnable: () => void;
  onOpenPicker: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.endDateControl}>
      <View style={styles.optionToggleRow}>
        <AppText style={styles.optionToggleLabel} variant="body2">
          {t("scheduleForm.fields.endDate")}
        </AppText>
        <Switch
          accessibilityHint={t("scheduleForm.endDate.toggleHint")}
          accessibilityLabel={t("scheduleForm.endDate.toggleLabel")}
          onValueChange={(enabled) => (enabled ? onEnable() : onDisable())}
          style={styles.optionToggleSwitch}
          thumbColor={themeColors.primaryForeground}
          trackColor={{
            false: themeColors.controlTrack,
            true: themeColors.primary,
          }}
          value={isEnabled}
        />
      </View>

      {isEnabled && displayValue && (
        <PickerField
          accessibilityHint={t("scheduleForm.picker.endDateHint")}
          accessibilityLabel={t("scheduleForm.picker.endDateLabel")}
          error={error}
          icon={
            <CalendarDays
              absoluteStrokeWidth
              color={themeColors.text}
              size={18}
              strokeWidth={1.2}
            />
          }
          onPress={onOpenPicker}
          styles={styles}
          value={displayValue}
          variantStyle={styles.endDateField}
        />
      )}
    </View>
  );
}

function IosPickerModal({
  minimumDate,
  mode,
  resolvedTheme,
  styles,
  themeColors,
  title,
  value,
  onChange,
  onClose,
  onConfirm,
}: {
  minimumDate?: Date;
  mode: "date" | "time" | null;
  resolvedTheme: ResolvedTheme;
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  title: string;
  value: Date;
  onChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  onClose: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Platform.OS === "ios" && mode !== null}
    >
      <Pressable onPress={onClose} style={styles.pickerModalBackdrop}>
        <Pressable style={styles.pickerModalCard}>
          <View style={styles.pickerModalHeader}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.pickerModalTextButton,
                pressed ? styles.inlineActionPressed : undefined,
              ]}
            >
              <AppText style={styles.pickerModalCancelText} variant="body2">
                {t("scheduleForm.actions.cancel")}
              </AppText>
            </Pressable>
            <AppText style={styles.pickerModalTitle} variant="body2">
              {title}
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.pickerModalTextButton,
                pressed ? styles.inlineActionPressed : undefined,
              ]}
            >
              <AppText style={styles.pickerModalConfirmText} variant="body2">
                {t("scheduleForm.actions.confirm")}
              </AppText>
            </Pressable>
          </View>

          {mode && (
            <DateTimePicker
              accentColor={themeColors.primary}
              display="spinner"
              minimumDate={mode === "date" ? minimumDate : undefined}
              mode={mode}
              onChange={onChange}
              textColor={themeColors.text}
              themeVariant={resolvedTheme}
              value={value}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
