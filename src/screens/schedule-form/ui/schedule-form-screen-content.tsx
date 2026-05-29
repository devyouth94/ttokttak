import { useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays, Clock3, Trash2 } from "lucide-react-native";

import { useAppLanguage } from "~/shared/i18n";
import type { AppThemeColors } from "~/shared/theme";
import { useAppTheme } from "~/shared/theme";
import { AppText } from "~/shared/ui/app-text";
import { FocusScreenHeader } from "~/shared/ui/focus-screen-header";
import { useCollapsibleHeader } from "~/shared/ui/use-collapsible-header";

import {
  AdvancedOptionsSection,
  ColorPickerSection,
  IosPickerModal,
  NotificationSection,
  RecurrenceSection,
} from "./schedule-form-screen-sections";
import {
  type ScheduleFormScreenStyles,
  useScheduleFormScreenStyles,
} from "./schedule-form-screen-styles";
import { type ScheduleFormScreenContentProps } from "../model/schedule-form-contracts";
import {
  type FormErrorTarget,
  getRecurringItemFormDisplayValues,
  getRecurringItemFormEndDateControlState,
  getRecurringItemFormFirstErrorTarget,
  getScheduleFormScreenTitle,
} from "../model/schedule-form-screen-model";

type ScreenErrorCardProps = {
  message: string | null;
  styles: ScheduleFormScreenStyles;
};

function ScreenErrorCard({
  message,
  styles,
}: ScreenErrorCardProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!message) {
    return null;
  }

  return (
    <View style={styles.errorCard}>
      <AppText style={styles.errorTitle} variant="title">
        {t("scheduleForm.error.title")}
      </AppText>
      <AppText style={styles.errorText} variant="body">
        {message}
      </AppText>
    </View>
  );
}

type SaveButtonContentProps = {
  isEditMode: boolean;
  isSaving: boolean;
  styles: ScheduleFormScreenStyles;
  themeColors: AppThemeColors;
};

type PickerFieldProps = {
  description?: string;
  disabled?: boolean;
  error?: string;
  icon: React.JSX.Element;
  label?: string;
  accessibilityHint: string;
  accessibilityLabel: string;
  onPress: () => void;
  styles: ScheduleFormScreenStyles;
  value: string;
  variantStyle: object;
};

type FormSectionOffsets = Partial<Record<FormErrorTarget, number>>;

export function ScheduleFormScreenContent({
  actions,
  control,
  errors,
  iosPickerChangeHandler,
  picker,
  values,
  view,
}: ScheduleFormScreenContentProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const { colors: themeColors, resolvedTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useScheduleFormScreenStyles();
  const {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle,
  } = useCollapsibleHeader({ hiddenOffset: insets.top });
  const [focusedTextInput, setFocusedTextInput] = useState<
    "description" | "title" | null
  >(null);
  const formSectionOffsetsRef = useRef<FormSectionOffsets>({});
  const lastScrolledSubmitCountRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);

  const screenTitle = getScheduleFormScreenTitle(view.isEditMode, language);
  const {
    endDateDisplayValue,
    firstReminderHelperText,
    reminderTimeDisplayValue,
    startDateDisplayValue,
  } = getRecurringItemFormDisplayValues(values, language);
  const endDateControlState = getRecurringItemFormEndDateControlState(
    values,
    language
  );
  const firstReminderHelperMessage = view.isStartDateEditable
    ? firstReminderHelperText
    : null;
  const iosPickerTitle =
    picker.iosMode === "time"
      ? t("scheduleForm.picker.reminderTimeTitle")
      : picker.iosDateTarget === "endDate"
        ? t("scheduleForm.picker.endDateTitle")
        : t("scheduleForm.picker.startDateTitle");

  function handleSectionLayout(
    target: FormErrorTarget,
    event: LayoutChangeEvent
  ): void {
    formSectionOffsetsRef.current[target] = event.nativeEvent.layout.y;
  }

  useEffect(() => {
    if (
      view.submitCount === 0 ||
      view.submitCount === lastScrolledSubmitCountRef.current
    ) {
      return;
    }

    const firstErrorTarget = getRecurringItemFormFirstErrorTarget(errors);

    if (!firstErrorTarget) {
      return;
    }

    const targetOffset = formSectionOffsetsRef.current[firstErrorTarget];

    if (targetOffset === undefined) {
      return;
    }

    lastScrolledSubmitCountRef.current = view.submitCount;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(targetOffset - headerHeight - 8, 0),
      });

      if (firstErrorTarget === "title") {
        titleInputRef.current?.focus();
      }
    });
  }, [errors, headerHeight, view.submitCount]);

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.screenRoot}>
          <Animated.View style={[styles.headerLayer, headerAnimatedStyle]}>
            <FocusScreenHeader
              onBack={actions.screen.onBack}
              onHeightChange={onHeaderHeightChange}
              title={screenTitle}
            />
          </Animated.View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: headerHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            ref={scrollViewRef}
            scrollEventThrottle={scrollEventThrottle}
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
            <ScreenErrorCard message={view.screenError} styles={styles} />

            <View
              onLayout={(event) => handleSectionLayout("title", event)}
              style={styles.field}
            >
              <AppText style={styles.fieldLabel} variant="body2">
                {t("scheduleForm.fields.title")}
              </AppText>
              <Controller
                control={control}
                name="title"
                render={({ field }) => (
                  <TextInput
                    accessibilityLabel={t("scheduleForm.fields.title")}
                    ref={titleInputRef}
                    onBlur={() => {
                      field.onBlur();
                      setFocusedTextInput(null);
                    }}
                    onChangeText={actions.field.onChangeTitle}
                    onFocus={() => setFocusedTextInput("title")}
                    placeholder={t("scheduleForm.placeholders.title")}
                    placeholderTextColor={themeColors.textMuted}
                    style={[
                      styles.textInput,
                      styles.primaryTextInput,
                      focusedTextInput === "title"
                        ? styles.inputFocused
                        : undefined,
                      errors.title ? styles.inputError : undefined,
                    ]}
                    value={field.value}
                  />
                )}
              />
              {errors.title ? (
                <AppText style={styles.fieldError} variant="caption">
                  {errors.title}
                </AppText>
              ) : null}
            </View>

            <View style={styles.field}>
              <AppText style={styles.fieldLabel} variant="body2">
                {t("scheduleForm.fields.description")}
              </AppText>
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <TextInput
                    accessibilityLabel={t(
                      "scheduleForm.fields.descriptionA11y"
                    )}
                    multiline
                    onBlur={() => {
                      field.onBlur();
                      setFocusedTextInput(null);
                    }}
                    onChangeText={actions.field.onChangeDescription}
                    onFocus={() => setFocusedTextInput("description")}
                    placeholder={t("scheduleForm.placeholders.description")}
                    placeholderTextColor={themeColors.textMuted}
                    style={[
                      styles.textInput,
                      styles.multilineInput,
                      focusedTextInput === "description"
                        ? styles.inputFocused
                        : undefined,
                    ]}
                    textAlignVertical="top"
                    value={field.value}
                  />
                )}
              />
            </View>

            <ColorPickerSection
              selectedColorKey={values.colorKey}
              styles={styles}
              onSelectColorKey={actions.field.onSelectColorKey}
            />

            <View
              onLayout={(event) => handleSectionLayout("recurrence", event)}
            >
              <RecurrenceSection
                intervalError={errors.interval}
                intervalValue={values.intervalValue}
                recurrenceType={values.recurrenceType}
                selectedWeekdays={values.weekdayMask}
                styles={styles}
                themeColors={themeColors}
                weekdayError={errors.weekday}
                onChangeIntervalValue={actions.recurrence.onChangeIntervalValue}
                onChangeUnit={actions.recurrence.onUnitChange}
                onCloseCustom={actions.recurrence.onCloseCustom}
                onOpenCustom={actions.recurrence.onOpenCustom}
                onSelectRecurrence={actions.recurrence.onSelectRecurrence}
                onToggleWeekday={actions.recurrence.onToggleWeekday}
              />
            </View>

            <View
              onLayout={(event) => handleSectionLayout("schedule", event)}
              style={styles.scheduleSettingsGroup}
            >
              <View style={styles.row}>
                <PickerField
                  description={
                    view.isEditMode
                      ? t("scheduleForm.fields.startDateLocked")
                      : undefined
                  }
                  disabled={!view.isStartDateEditable}
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
                  value={startDateDisplayValue}
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
                  accessibilityLabel={t(
                    "scheduleForm.picker.reminderTimeLabel"
                  )}
                  onPress={actions.picker.onOpenTimePicker}
                  styles={styles}
                  value={reminderTimeDisplayValue}
                  variantStyle={styles.timeField}
                />
              </View>

              {endDateControlState.isVisible ? (
                <EndDateControl
                  displayValue={endDateDisplayValue}
                  error={errors.endDate}
                  isEnabled={endDateControlState.isEnabled}
                  onDisable={actions.recurrence.onDisableEndDate}
                  onEnable={actions.recurrence.onEnableEndDate}
                  onOpenPicker={actions.picker.onOpenEndDatePicker}
                  styles={styles}
                  themeColors={themeColors}
                />
              ) : null}

              {firstReminderHelperMessage ? (
                <AppText style={styles.fieldHelper} variant="caption">
                  {firstReminderHelperMessage}
                </AppText>
              ) : null}

              {picker.isStartDateVisible ? (
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
              ) : null}

              {endDateControlState.isEnabled && picker.isEndDateVisible ? (
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
              ) : null}

              {picker.isTimeVisible ? (
                <DateTimePicker
                  accentColor={themeColors.primary}
                  mode="time"
                  onChange={actions.picker.onTimePickerChange}
                  textColor={themeColors.text}
                  themeVariant={resolvedTheme}
                  value={picker.selectedReminderTime}
                />
              ) : null}

              <IosPickerModal
                minimumDate={picker.iosMinimumDate}
                mode={picker.iosMode}
                resolvedTheme={resolvedTheme}
                styles={styles}
                themeColors={themeColors}
                title={iosPickerTitle}
                value={picker.iosValue}
                onChange={iosPickerChangeHandler}
                onClose={actions.picker.onCloseIosPicker}
                onConfirm={actions.picker.onConfirmIosPicker}
              />
            </View>

            <View
              onLayout={(event) => handleSectionLayout("options", event)}
              style={styles.field}
            >
              <AppText style={styles.fieldLabel} variant="body2">
                {t("scheduleForm.sections.options")}
              </AppText>
              <View style={styles.optionRows}>
                <NotificationSection
                  enabled={values.notificationsEnabled}
                  styles={styles}
                  themeColors={themeColors}
                  onToggle={actions.field.onToggleNotifications}
                />

                <AdvancedOptionsSection
                  anchorError={errors.anchor}
                  anchorType={values.anchorType}
                  recurrenceType={values.recurrenceType}
                  styles={styles}
                  themeColors={themeColors}
                  onSelectAnchorType={actions.recurrence.onSelectAnchorType}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerActions}>
              <Pressable
                accessibilityRole="button"
                disabled={view.isDeleting || view.isSaving}
                onPress={actions.screen.onSubmit}
                style={({ pressed }) => [
                  styles.saveButton,
                  view.isEditMode ? styles.editSaveButton : undefined,
                  !view.isEditMode ? styles.createSaveButton : undefined,
                  view.isDeleting || view.isSaving
                    ? styles.saveButtonDisabled
                    : undefined,
                  pressed && !view.isDeleting && !view.isSaving
                    ? styles.saveButtonPressed
                    : undefined,
                ]}
              >
                <SaveButtonContent
                  isEditMode={view.isEditMode}
                  isSaving={view.isSaving}
                  styles={styles}
                  themeColors={themeColors}
                />
              </Pressable>

              {view.isEditMode ? (
                <Pressable
                  accessibilityHint={t("scheduleForm.deleteButton.hint")}
                  accessibilityLabel={t("scheduleForm.deleteButton.label")}
                  accessibilityRole="button"
                  disabled={view.isDeleting || view.isSaving}
                  onPress={actions.screen.onDelete}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    view.isDeleting || view.isSaving
                      ? styles.saveButtonDisabled
                      : undefined,
                    pressed && !view.isDeleting && !view.isSaving
                      ? styles.deleteButtonPressed
                      : undefined,
                  ]}
                >
                  {view.isDeleting ? (
                    <ActivityIndicator color={themeColors.accent} />
                  ) : (
                    <Trash2
                      absoluteStrokeWidth
                      color={themeColors.accent}
                      size={18}
                      strokeWidth={1.2}
                    />
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SaveButtonContent({
  isEditMode,
  isSaving,
  styles,
  themeColors,
}: SaveButtonContentProps): React.JSX.Element {
  const { t } = useTranslation();
  const buttonLabel = isEditMode
    ? t("scheduleForm.actions.update")
    : t("scheduleForm.actions.save");

  if (isSaving) {
    return <ActivityIndicator color={themeColors.primaryForeground} />;
  }

  return (
    <AppText style={styles.saveButtonText} variant="body">
      {buttonLabel}
    </AppText>
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
}: PickerFieldProps): React.JSX.Element {
  return (
    <View style={[styles.field, variantStyle]}>
      {label ? (
        <AppText style={styles.fieldLabel} variant="body2">
          {label}
        </AppText>
      ) : null}
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
      {description ? (
        <AppText style={styles.fieldHelper} variant="caption">
          {description}
        </AppText>
      ) : null}
      {error ? (
        <AppText style={styles.fieldError} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

type EndDateControlProps = {
  displayValue: string | null;
  error?: string;
  isEnabled: boolean;
  styles: ScheduleFormScreenStyles;
  themeColors: AppThemeColors;
  onDisable: () => void;
  onEnable: () => void;
  onOpenPicker: () => void;
};

function EndDateControl({
  displayValue,
  error,
  isEnabled,
  styles,
  themeColors,
  onDisable,
  onEnable,
  onOpenPicker,
}: EndDateControlProps): React.JSX.Element {
  const { t } = useTranslation();
  const handleToggle = (nextValue: boolean): void => {
    if (nextValue) {
      onEnable();
      return;
    }

    onDisable();
  };

  return (
    <View style={styles.endDateControl}>
      <View style={styles.optionToggleRow}>
        <AppText style={styles.optionToggleLabel} variant="body2">
          {t("scheduleForm.fields.endDate")}
        </AppText>
        <Switch
          accessibilityHint={t("scheduleForm.endDate.toggleHint")}
          accessibilityLabel={t("scheduleForm.endDate.toggleLabel")}
          onValueChange={handleToggle}
          style={styles.optionToggleSwitch}
          thumbColor={themeColors.primaryForeground}
          trackColor={{
            false: themeColors.controlTrack,
            true: themeColors.primary,
          }}
          value={isEnabled}
        />
      </View>

      {isEnabled && displayValue ? (
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
      ) : null}
    </View>
  );
}
