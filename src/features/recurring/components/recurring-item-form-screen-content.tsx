import { useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
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

import { AppText } from "~/shared/ui/app-text";
import { FocusScreenHeader } from "~/shared/ui/focus-screen-header";
import { colors } from "~/shared/ui/tokens";
import { useCollapsibleHeader } from "~/shared/ui/use-collapsible-header";

import { type RecurringItemFormScreenContentProps } from "./recurring-item-form-screen.contracts";
import {
  type FormErrorTarget,
  getRecurringItemFormDisplayValues,
  getRecurringItemFormEndDateControlState,
  getRecurringItemFormFirstErrorTarget,
  getRecurringItemFormScreenTitle,
} from "./recurring-item-form-screen.helpers";
import {
  AdvancedOptionsSection,
  ColorPickerSection,
  IosPickerModal,
  NotificationSection,
  RecurrenceSection,
} from "./recurring-item-form-screen.sections";
import { styles } from "./recurring-item-form-screen.styles";
import {
  parseLocalDateToDate,
  parseLocalTimeToDate,
} from "./recurring-item-form-state";

type ScreenErrorCardProps = {
  message: string | null;
};

function ScreenErrorCard({
  message,
}: ScreenErrorCardProps): React.JSX.Element | null {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.errorCard}>
      <AppText style={styles.errorTitle} variant="title">
        확인 필요
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
  value: string;
  variantStyle: object;
};

type FormSectionOffsets = Partial<Record<FormErrorTarget, number>>;

export function RecurringItemFormScreenContent({
  actions,
  control,
  errors,
  iosPickerChangeHandler,
  picker,
  values,
  view,
}: RecurringItemFormScreenContentProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
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

  const screenTitle = getRecurringItemFormScreenTitle(view.isEditMode);
  const {
    endDateDisplayValue,
    firstReminderHelperText,
    reminderTimeDisplayValue,
    startDateDisplayValue,
  } = getRecurringItemFormDisplayValues(values);
  const endDateControlState = getRecurringItemFormEndDateControlState(values);
  const firstReminderHelperMessage = view.isStartDateEditable
    ? firstReminderHelperText
    : null;
  const minimumEndDate = parseLocalDateToDate(view.minimumEndDateLocal);
  const minimumStartDate = parseLocalDateToDate(view.minimumStartDateLocal);
  const selectedEndDate = parseLocalDateToDate(
    values.endDateLocal && values.endDateLocal >= view.minimumEndDateLocal
      ? values.endDateLocal
      : view.minimumEndDateLocal
  );
  const selectedStartDate = parseLocalDateToDate(
    values.startDateLocal < view.minimumStartDateLocal
      ? view.minimumStartDateLocal
      : values.startDateLocal
  );
  const iosPickerMinimumDate =
    picker.iosDateTarget === "endDate" ? minimumEndDate : minimumStartDate;
  const iosPickerTitle =
    picker.iosMode === "time"
      ? "알림 시간 선택"
      : picker.iosDateTarget === "endDate"
        ? "종료일 선택"
        : "시작일 선택";

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
            <ScreenErrorCard message={view.screenError} />

            <View
              onLayout={(event) => handleSectionLayout("title", event)}
              style={styles.field}
            >
              <AppText style={styles.fieldLabel} variant="body2">
                제목
              </AppText>
              <Controller
                control={control}
                name="title"
                render={({ field }) => (
                  <TextInput
                    accessibilityLabel="제목"
                    ref={titleInputRef}
                    onBlur={() => {
                      field.onBlur();
                      setFocusedTextInput(null);
                    }}
                    onChangeText={actions.field.onChangeTitle}
                    onFocus={() => setFocusedTextInput("title")}
                    placeholder="예: 아침 영양제 챙기기"
                    placeholderTextColor={colors.textMuted}
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
                메모
              </AppText>
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <TextInput
                    accessibilityLabel="설명"
                    multiline
                    onBlur={() => {
                      field.onBlur();
                      setFocusedTextInput(null);
                    }}
                    onChangeText={actions.field.onChangeDescription}
                    onFocus={() => setFocusedTextInput("description")}
                    placeholder="선택 입력"
                    placeholderTextColor={colors.textMuted}
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
                      ? "시작일은 생성 후 변경할 수 없습니다."
                      : undefined
                  }
                  disabled={!view.isStartDateEditable}
                  error={errors.startDate}
                  icon={
                    <CalendarDays
                      absoluteStrokeWidth
                      color={colors.text}
                      size={18}
                      strokeWidth={1.2}
                    />
                  }
                  label="시작일"
                  accessibilityHint="일정의 시작일을 선택해요."
                  accessibilityLabel="시작일 선택"
                  onPress={actions.picker.onOpenDatePicker}
                  value={startDateDisplayValue}
                  variantStyle={styles.dateField}
                />

                <PickerField
                  error={errors.reminderTime}
                  icon={
                    <Clock3
                      absoluteStrokeWidth
                      color={colors.text}
                      size={18}
                      strokeWidth={1.2}
                    />
                  }
                  label="알림 시간"
                  accessibilityHint="알림 시간을 선택해요."
                  accessibilityLabel="알림 시간 선택"
                  onPress={actions.picker.onOpenTimePicker}
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
                />
              ) : null}

              {firstReminderHelperMessage ? (
                <AppText style={styles.fieldHelper} variant="caption">
                  {firstReminderHelperMessage}
                </AppText>
              ) : null}

              {picker.isStartDateVisible ? (
                <DateTimePicker
                  initialInputMode="default"
                  minimumDate={minimumStartDate}
                  mode="date"
                  onChange={actions.picker.onStartDatePickerChange}
                  value={selectedStartDate}
                />
              ) : null}

              {endDateControlState.isEnabled && picker.isEndDateVisible ? (
                <DateTimePicker
                  initialInputMode="default"
                  minimumDate={minimumEndDate}
                  mode="date"
                  onChange={actions.picker.onEndDatePickerChange}
                  value={selectedEndDate}
                />
              ) : null}

              {picker.isTimeVisible ? (
                <DateTimePicker
                  mode="time"
                  onChange={actions.picker.onTimePickerChange}
                  value={parseLocalTimeToDate(values.reminderTimeLocal)}
                />
              ) : null}

              <IosPickerModal
                minimumDate={iosPickerMinimumDate}
                mode={picker.iosMode}
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
                옵션
              </AppText>
              <View style={styles.optionRows}>
                <NotificationSection
                  enabled={values.notificationsEnabled}
                  onToggle={actions.field.onToggleNotifications}
                />

                <AdvancedOptionsSection
                  anchorError={errors.anchor}
                  anchorType={values.anchorType}
                  recurrenceType={values.recurrenceType}
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
                />
              </Pressable>

              {view.isEditMode ? (
                <Pressable
                  accessibilityHint="이 일정을 삭제합니다."
                  accessibilityLabel="일정 삭제"
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
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Trash2
                      absoluteStrokeWidth
                      color={colors.accent}
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
}: SaveButtonContentProps): React.JSX.Element {
  const buttonLabel = isEditMode ? "수정" : "저장";

  if (isSaving) {
    return <ActivityIndicator color={colors.primaryForeground} />;
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
  onDisable: () => void;
  onEnable: () => void;
  onOpenPicker: () => void;
};

function EndDateControl({
  displayValue,
  error,
  isEnabled,
  onDisable,
  onEnable,
  onOpenPicker,
}: EndDateControlProps): React.JSX.Element {
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
          종료일
        </AppText>
        <Switch
          accessibilityHint="반복 일정의 종료일 설정을 켜거나 꺼요."
          accessibilityLabel="종료일 사용"
          onValueChange={handleToggle}
          style={styles.optionToggleSwitch}
          thumbColor={colors.primaryForeground}
          trackColor={{ false: colors.dividerOnPrimary, true: colors.primary }}
          value={isEnabled}
        />
      </View>

      {isEnabled && displayValue ? (
        <PickerField
          accessibilityHint="반복 일정의 종료일을 선택해요."
          accessibilityLabel="종료일 선택"
          error={error}
          icon={
            <CalendarDays
              absoluteStrokeWidth
              color={colors.text}
              size={18}
              strokeWidth={1.2}
            />
          }
          onPress={onOpenPicker}
          value={displayValue}
          variantStyle={styles.endDateField}
        />
      ) : null}
    </View>
  );
}
