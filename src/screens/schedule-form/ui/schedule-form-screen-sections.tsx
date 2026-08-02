import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Switch,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Info } from "lucide-react-native";

import { useAppLanguage } from "~/i18n/provider";
import { type ColorKey, getColorOptions } from "~/schedule/display/color";
import {
  type AnchorType,
  type RecurrenceType,
  supportsCompletion,
} from "~/schedule/rules/recurrence";
import type { ThemeColors } from "~/theme/colors";
import type { ResolvedTheme } from "~/theme/preference";
import { AppText } from "~/ui/app-text";
import { SelectMenu, type SelectOption } from "~/ui/select-menu";

import type { ScheduleFormScreenStyles } from "./schedule-form-screen-styles";
import {
  getCompletionBasedInfoText,
  getCustomRecurrenceUnitOptions,
  getQuickRecurrenceOptions,
  getRecurrenceSectionState,
  getWeekdayOptions,
} from "../model/schedule-form-screen-model";
import { type CustomRecurrenceUnit } from "../model/schedule-form-state";

type WeekdaySelectorProps = {
  errorMessage?: string;
  selectedDays: number[];
  styles: ScheduleFormScreenStyles;
  onToggle: (weekdayValue: number) => void;
};

type RecurrenceSectionProps = {
  intervalError?: string;
  intervalValue: string;
  recurrenceType: RecurrenceType;
  selectedWeekdays: number[];
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  weekdayError?: string;
  onChangeIntervalValue: (value: string) => void;
  onChangeUnit: (unit: CustomRecurrenceUnit) => void;
  onCloseCustom: () => void;
  onOpenCustom: () => void;
  onSelectRecurrence: (recurrenceType: RecurrenceType) => void;
  onToggleWeekday: (weekdayValue: number) => void;
};

type RecurrenceOptionButtonProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
  styles: ScheduleFormScreenStyles;
  variant?: "default" | "primary" | "unit";
};

type RecurrenceModeTabButtonProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
  styles: ScheduleFormScreenStyles;
};

type ColorPickerSectionProps = {
  selectedColorKey: ColorKey;
  styles: ScheduleFormScreenStyles;
  onSelectColorKey: (colorKey: ColorKey) => void;
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
  onChangeUnit,
  onCloseCustom,
  onOpenCustom,
  onSelectRecurrence,
  onToggleWeekday,
}: RecurrenceSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const [isCustomIntervalFocused, setIsCustomIntervalFocused] = useState(false);

  const {
    customUnit,
    isCustomSelected,
    isOnceSelected,
    showsStandaloneWeekdaySelector,
    showsCustomRecurrencePanel,
    showsWeekdaySelector,
    showsWeekdaysInsideCustomPanel,
  } = getRecurrenceSectionState(recurrenceType);

  const quickRecurrenceButtons = getQuickRecurrenceOptions(language).map(
    (option) => {
      return (
        <RecurrenceOptionButton
          key={option.value}
          label={option.label}
          onPress={() => onSelectRecurrence(option.value)}
          selected={recurrenceType === option.value}
          styles={styles}
          variant="primary"
        />
      );
    }
  );

  const customRecurrenceUnitButtons = getCustomRecurrenceUnitOptions(
    language
  ).map((option) => {
    return (
      <RecurrenceOptionButton
        key={option.value}
        label={option.label}
        onPress={() => onChangeUnit(option.value)}
        selected={customUnit === option.value}
        styles={styles}
        variant="unit"
      />
    );
  });

  const weekdaySelector = showsWeekdaySelector && (
    <WeekdaySelector
      errorMessage={weekdayError}
      selectedDays={selectedWeekdays}
      styles={styles}
      onToggle={onToggleWeekday}
    />
  );

  const customRecurrencePanel = showsCustomRecurrencePanel && (
    <View style={styles.quickRecurrenceContent}>
      <View style={styles.customRecurrenceControlGroup}>
        <AppText style={styles.subFieldLabel} variant="body2">
          {t("scheduleForm.recurrence.intervalLabel")}
        </AppText>
        <View style={styles.customRecurrenceControls}>
          <TextInput
            accessibilityLabel={t("scheduleForm.recurrence.intervalA11y")}
            keyboardType="number-pad"
            onBlur={() => setIsCustomIntervalFocused(false)}
            onChangeText={onChangeIntervalValue}
            onFocus={() => setIsCustomIntervalFocused(true)}
            placeholder="1"
            placeholderTextColor={themeColors.textMuted}
            style={[
              styles.textInput,
              styles.customRecurrenceInput,
              isCustomIntervalFocused ? styles.inputFocused : undefined,
              intervalError ? styles.inputError : undefined,
            ]}
            value={intervalValue}
          />

          {customRecurrenceUnitButtons}
        </View>

        {intervalError && (
          <AppText style={styles.fieldError} variant="caption">
            {intervalError}
          </AppText>
        )}
      </View>

      {showsWeekdaysInsideCustomPanel && weekdaySelector}
    </View>
  );

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
        {t("scheduleForm.sections.recurrence")}
      </AppText>

      <View style={styles.recurrenceSettingsStack}>
        <View style={styles.recurrenceModeTabs}>
          <RecurrenceModeTabButton
            label={t("scheduleForm.recurrence.basicTab")}
            onPress={onCloseCustom}
            selected={!isCustomSelected}
            styles={styles}
          />

          <RecurrenceModeTabButton
            label={t("scheduleForm.recurrence.customTab")}
            onPress={onOpenCustom}
            selected={isCustomSelected}
            styles={styles}
          />
        </View>

        {isCustomSelected ? (
          customRecurrencePanel
        ) : (
          <View style={styles.quickRecurrenceContent}>
            <View style={styles.quickRecurrenceGrid}>
              {quickRecurrenceButtons}
              <RecurrenceOptionButton
                label={t("scheduleForm.recurrence.once")}
                onPress={() => onSelectRecurrence("once")}
                selected={isOnceSelected}
                styles={styles}
                variant="primary"
              />
            </View>

            {showsStandaloneWeekdaySelector && weekdaySelector}
          </View>
        )}
      </View>
    </View>
  );
}

export function ColorPickerSection({
  selectedColorKey,
  styles,
  onSelectColorKey,
}: ColorPickerSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const colorOptions = getColorOptions(language).map((option) => ({
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
    colorOptions.find((option) => option.value === selectedColorKey) ??
    colorOptions[0]!;

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
        options={colorOptions}
        value={selectedOption.value}
        onChange={onSelectColorKey}
      />
    </View>
  );
}

type WeekdayChipButtonProps = {
  isSelected: boolean;
  label: string;
  styles: ScheduleFormScreenStyles;
  onPress: () => void;
};

function RecurrenceOptionButton({
  label,
  onPress,
  selected,
  styles,
  variant = "default",
}: RecurrenceOptionButtonProps): React.JSX.Element {
  const isPrimary = variant === "primary";
  const usesCompactChip = isPrimary || variant === "unit";
  const textStyle = usesCompactChip
    ? styles.quickRecurrenceChipText
    : styles.chipText;

  const selectedTextStyle = usesCompactChip
    ? styles.quickRecurrenceChipTextSelected
    : styles.chipTextSelected;

  const selectedStyle = usesCompactChip
    ? styles.quickRecurrenceChipSelected
    : styles.chipSelected;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isPrimary ? styles.primaryRecurrenceChip : undefined,
        usesCompactChip ? styles.quickRecurrenceChip : undefined,
        variant === "unit" ? styles.customRecurrenceUnitOption : undefined,
        selected ? selectedStyle : undefined,
        pressed ? styles.chipPressed : undefined,
      ]}
    >
      <AppText
        style={[textStyle, selected ? selectedTextStyle : undefined]}
        variant={usesCompactChip ? "body3" : "body2"}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function RecurrenceModeTabButton({
  label,
  onPress,
  selected,
  styles,
}: RecurrenceModeTabButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => {
        if (!selected) {
          onPress();
        }
      }}
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
  errorMessage,
  selectedDays,
  styles,
  onToggle,
}: WeekdaySelectorProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const selectedWeekdaySet = new Set(selectedDays);
  const weekdayButtons = getWeekdayOptions(language).map((weekday) => {
    return (
      <WeekdayChipButton
        isSelected={selectedWeekdaySet.has(weekday.value)}
        key={weekday.value}
        label={weekday.label}
        styles={styles}
        onPress={() => onToggle(weekday.value)}
      />
    );
  });

  return (
    <View style={styles.field}>
      <AppText style={styles.subFieldLabel} variant="body2">
        {t("scheduleForm.recurrence.weekdayLabel")}
      </AppText>
      <View style={styles.weekdayGroup}>{weekdayButtons}</View>
      {errorMessage && (
        <AppText style={styles.fieldError} variant="caption">
          {errorMessage}
        </AppText>
      )}
    </View>
  );
}

function WeekdayChipButton({
  isSelected,
  label,
  styles,
  onPress,
}: WeekdayChipButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.weekdayChip,
        isSelected ? styles.weekdayChipSelected : undefined,
        pressed ? styles.weekdayChipPressed : undefined,
      ]}
    >
      <AppText
        style={
          isSelected ? styles.weekdayChipTextSelected : styles.weekdayChipText
        }
        variant="body3"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

type NotificationSectionProps = {
  enabled: boolean;
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  onToggle: (value: boolean) => void;
};

export function NotificationSection({
  enabled,
  styles,
  themeColors,
  onToggle,
}: NotificationSectionProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.optionToggleRow}>
      <AppText style={styles.optionToggleLabel} variant="body2">
        {t("scheduleForm.fields.notificationsEnabled")}
      </AppText>
      <Switch
        onValueChange={onToggle}
        style={styles.optionToggleSwitch}
        thumbColor={themeColors.primaryForeground}
        trackColor={{
          false: themeColors.controlTrack,
          true: themeColors.primary,
        }}
        value={enabled}
      />
    </View>
  );
}

type AdvancedOptionsSectionProps = {
  anchorError?: string;
  anchorType: AnchorType;
  recurrenceType: RecurrenceType;
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  onSelectAnchorType: (anchorType: AnchorType) => void;
};

export function AdvancedOptionsSection({
  anchorError,
  anchorType,
  recurrenceType,
  styles,
  themeColors,
  onSelectAnchorType,
}: AdvancedOptionsSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const isCompletionBasedSwitchEnabled = supportsCompletion(recurrenceType);

  const isCompletionBasedSelected =
    isCompletionBasedSwitchEnabled && anchorType === "completion_based";

  const handleToggleCompletionBased = (nextValue: boolean): void => {
    if (!isCompletionBasedSwitchEnabled) {
      return;
    }

    onSelectAnchorType(nextValue ? "completion_based" : "fixed");
  };

  const handlePressInfo = (): void => {
    Alert.alert(
      t("scheduleForm.completionBased.title"),
      getCompletionBasedInfoText(language)
    );
  };

  return (
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
            onPress={handlePressInfo}
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
          disabled={!isCompletionBasedSwitchEnabled}
          onValueChange={handleToggleCompletionBased}
          style={styles.optionToggleSwitch}
          thumbColor={themeColors.primaryForeground}
          trackColor={{
            false: themeColors.controlTrack,
            true: themeColors.primary,
          }}
          value={isCompletionBasedSelected}
        />
      </View>

      {anchorError && (
        <AppText style={styles.fieldError} variant="caption">
          {anchorError}
        </AppText>
      )}
    </View>
  );
}

type IosPickerModalProps = {
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
};

export function IosPickerModal({
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
}: IosPickerModalProps): React.JSX.Element {
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
