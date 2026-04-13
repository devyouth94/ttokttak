import { Controller } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { colors } from "~/design-system/tokens";

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
      <AppText style={styles.errorText}>{message}</AppText>
    </View>
  );
}

type SaveButtonContentProps = {
  isEditMode: boolean;
  isSaving: boolean;
};

type PickerFieldProps = {
  error?: string;
  icon: React.JSX.Element;
  label: string;
  onPress: () => void;
  value: string;
  variantStyle: object;
};

export function RecurringItemFormScreenContent({
  actions,
  completionBasedEnabled,
  control,
  errors,
  iosPickerChangeHandler,
  picker,
  values,
  view,
}: RecurringItemFormScreenContentProps): React.JSX.Element {
  const screenTitle = getRecurringItemFormScreenTitle(view.isEditMode);
  const { reminderTimeDisplayValue, startDateDisplayValue } =
    getRecurringItemFormDisplayValues(values);

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScreenHeader onBack={actions.screen.onBack} title={screenTitle} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenErrorCard message={view.screenError} />

          <View style={styles.field}>
            <AppText style={styles.fieldLabel}>항목 이름</AppText>
            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <TextInput
                  accessibilityLabel="제목"
                  onBlur={field.onBlur}
                  onChangeText={actions.field.onChangeTitle}
                  placeholder="예: 아침 영양제 챙기기"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.textInput,
                    styles.primaryTextInput,
                    errors.title ? styles.inputError : undefined,
                  ]}
                  value={field.value}
                />
              )}
            />
            {errors.title ? (
              <AppText style={styles.fieldError}>{errors.title}</AppText>
            ) : null}
          </View>

          <View style={styles.field}>
            <AppText style={styles.fieldLabel}>메모</AppText>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextInput
                  accessibilityLabel="설명"
                  multiline
                  onBlur={field.onBlur}
                  onChangeText={actions.field.onChangeDescription}
                  placeholder="선택 입력"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.textInput, styles.multilineInput]}
                  textAlignVertical="top"
                  value={field.value}
                />
              )}
            />
          </View>

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

          <View style={styles.row}>
            <PickerField
              error={errors.startDate}
              icon={<CalendarDays color={colors.textMuted} size={18} />}
              label="시작일"
              onPress={actions.picker.onOpenDatePicker}
              value={startDateDisplayValue}
              variantStyle={styles.dateField}
            />

            <PickerField
              error={errors.reminderTime}
              icon={<Clock3 color={colors.textMuted} size={18} />}
              label="알림 시간"
              onPress={actions.picker.onOpenTimePicker}
              value={reminderTimeDisplayValue}
              variantStyle={styles.timeField}
            />
          </View>

          {picker.isStartDateVisible ? (
            <DateTimePicker
              initialInputMode="default"
              mode="date"
              onChange={actions.picker.onStartDatePickerChange}
              value={parseLocalDateToDate(values.startDateLocal)}
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
            mode={picker.iosMode}
            value={picker.iosValue}
            onChange={iosPickerChangeHandler}
            onClose={actions.picker.onCloseIosPicker}
            onConfirm={actions.picker.onConfirmIosPicker}
          />

          <NotificationSection
            enabled={values.notificationsEnabled}
            onToggle={actions.field.onToggleNotifications}
          />

          <AdvancedOptionsSection
            anchorError={errors.anchor}
            anchorType={values.anchorType}
            category={values.category}
            completionBasedEnabled={completionBasedEnabled}
            isOpen={view.isAdvancedOpen}
            onCategoryChange={actions.field.onCategoryChange}
            onSelectAnchorType={actions.recurrence.onSelectAnchorType}
            onToggleOpen={actions.recurrence.onToggleAdvanced}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={view.isSaving}
            onPress={actions.screen.onSubmit}
            style={({ pressed }) => [
              styles.saveButton,
              view.isSaving ? styles.saveButtonDisabled : undefined,
              pressed && !view.isSaving ? styles.saveButtonPressed : undefined,
            ]}
          >
            <SaveButtonContent
              isEditMode={view.isEditMode}
              isSaving={view.isSaving}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SaveButtonContent({
  isEditMode,
  isSaving,
}: SaveButtonContentProps): React.JSX.Element {
  const buttonLabel = isEditMode ? "변경 저장" : "리마인더 저장";

  if (isSaving) {
    return <ActivityIndicator color={colors.primaryForeground} />;
  }

  return (
    <View style={styles.saveButtonContent}>
      <CheckCircle2 color={colors.primaryForeground} size={18} />
      <AppText style={styles.saveButtonText}>{buttonLabel}</AppText>
    </View>
  );
}

function PickerField({
  error,
  icon,
  label,
  onPress,
  value,
  variantStyle,
}: PickerFieldProps): React.JSX.Element {
  return (
    <View style={[styles.field, variantStyle]}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[
          styles.iconInputShell,
          styles.compactInput,
          error ? styles.inputError : undefined,
        ]}
      >
        {icon}
        <AppText style={styles.iconInputValue}>{value}</AppText>
      </Pressable>
      {error ? <AppText style={styles.fieldError}>{error}</AppText> : null}
    </View>
  );
}
