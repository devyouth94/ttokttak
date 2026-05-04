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
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ArrowLeft, CalendarDays, Clock3, Trash2 } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { useCollapsibleHeader } from "~/design-system/hooks/use-collapsible-header";
import { color, colors } from "~/design-system/tokens";

import { type RecurringItemFormScreenContentProps } from "./recurring-item-form-screen.contracts";
import {
  getRecurringItemFormDisplayValues,
  getRecurringItemFormScreenTitle,
  parseLocalDateToDate,
  parseLocalTimeToDate,
} from "./recurring-item-form-screen.helpers";
import {
  AdvancedOptionsSection,
  IosPickerModal,
  NotificationSection,
  RecurrenceSection,
} from "./recurring-item-form-screen.sections";
import { styles } from "./recurring-item-form-screen.styles";

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
  label: string;
  onPress: () => void;
  value: string;
  variantStyle: object;
};

type FormErrorTarget = "options" | "recurrence" | "schedule" | "title";

type FormSectionOffsets = Partial<Record<FormErrorTarget, number>>;

function getFirstErrorTarget(
  errors: RecurringItemFormScreenContentProps["errors"]
): FormErrorTarget | null {
  if (errors.title) {
    return "title";
  }

  if (errors.interval || errors.weekday) {
    return "recurrence";
  }

  if (errors.startDate || errors.reminderTime) {
    return "schedule";
  }

  if (errors.anchor) {
    return "options";
  }

  return null;
}

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
    firstReminderHelperText,
    reminderTimeDisplayValue,
    startDateDisplayValue,
  } = getRecurringItemFormDisplayValues(values);
  const firstReminderHelperMessage = view.isStartDateEditable
    ? firstReminderHelperText
    : null;
  const minimumStartDate = parseLocalDateToDate(view.minimumStartDateLocal);
  const selectedStartDate = parseLocalDateToDate(
    values.startDateLocal < view.minimumStartDateLocal
      ? view.minimumStartDateLocal
      : values.startDateLocal
  );

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

    const firstErrorTarget = getFirstErrorTarget(errors);

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
            <ScreenHeader
              leftSlot={
                <Pressable
                  accessibilityHint="이전 화면으로 돌아가요."
                  accessibilityLabel="뒤로 가기"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={actions.screen.onBack}
                  style={({ pressed }) => [
                    styles.headerBackButton,
                    pressed && styles.headerButtonPressed,
                  ]}
                >
                  <ArrowLeft color={color.white} size={18} />
                </Pressable>
              }
              onHeightChange={onHeaderHeightChange}
              rightSlot={<View style={styles.headerActionSpacer} />}
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
                      color={color.jetBlack}
                      size={18}
                      strokeWidth={1.2}
                    />
                  }
                  label="시작일"
                  onPress={actions.picker.onOpenDatePicker}
                  value={startDateDisplayValue}
                  variantStyle={styles.dateField}
                />

                <PickerField
                  error={errors.reminderTime}
                  icon={
                    <Clock3
                      absoluteStrokeWidth
                      color={color.jetBlack}
                      size={18}
                      strokeWidth={1.2}
                    />
                  }
                  label="알림 시간"
                  onPress={actions.picker.onOpenTimePicker}
                  value={reminderTimeDisplayValue}
                  variantStyle={styles.timeField}
                />
              </View>

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

              {picker.isTimeVisible ? (
                <DateTimePicker
                  mode="time"
                  onChange={actions.picker.onTimePickerChange}
                  value={parseLocalTimeToDate(values.reminderTimeLocal)}
                />
              ) : null}

              <IosPickerModal
                minimumDate={minimumStartDate}
                mode={picker.iosMode}
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
                    <ActivityIndicator color={color.salmonOrange} />
                  ) : (
                    <Trash2
                      absoluteStrokeWidth
                      color={color.salmonOrange}
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
      <AppText style={styles.fieldLabel} variant="body2">
        {label}
      </AppText>
      <Pressable
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
