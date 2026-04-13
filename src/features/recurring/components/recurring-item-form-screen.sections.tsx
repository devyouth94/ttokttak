import {
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
import { Bell, ChevronDown, ChevronUp } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { colors } from "~/design-system/tokens";
import {
  type AnchorType,
  type RecurrenceType,
} from "~/features/recurring/domain/types";

import {
  anchorOptions,
  type CustomRecurrenceUnit,
  customRecurrenceUnitOptions,
  getAdvancedOptionsState,
  getNotificationStatusText,
  getRecurrenceSectionState,
  quickRecurrenceOptions,
  weekdayOptions,
} from "./recurring-item-form-screen.helpers";
import { styles } from "./recurring-item-form-screen.styles";

type WeekdaySelectorProps = {
  errorMessage?: string;
  insidePanel?: boolean;
  selectedDays: number[];
  onToggle: (weekdayValue: number) => void;
};

type RecurrenceSectionProps = {
  intervalError?: string;
  intervalValue: string;
  recurrenceType: RecurrenceType;
  selectedWeekdays: number[];
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
  variant?: "default" | "primary" | "unit";
};

export function RecurrenceSection({
  intervalError,
  intervalValue,
  recurrenceType,
  selectedWeekdays,
  weekdayError,
  onChangeIntervalValue,
  onChangeUnit,
  onCloseCustom,
  onOpenCustom,
  onSelectRecurrence,
  onToggleWeekday,
}: RecurrenceSectionProps): React.JSX.Element {
  const {
    customRecurrenceDescription,
    customUnit,
    isCustomSelected,
    isOnceSelected,
    showsStandaloneWeekdaySelector,
    showsCustomRecurrencePanel,
    showsWeekdaySelector,
    showsWeekdaysInsideCustomPanel,
  } = getRecurrenceSectionState(recurrenceType);

  const quickRecurrenceButtons = quickRecurrenceOptions.map((option) => {
    return (
      <RecurrenceOptionButton
        key={option.value}
        label={option.label}
        onPress={() => onSelectRecurrence(option.value)}
        selected={recurrenceType === option.value}
        variant="primary"
      />
    );
  });

  const customRecurrenceUnitButtons = customRecurrenceUnitOptions.map(
    (option) => {
      return (
        <RecurrenceOptionButton
          key={option.value}
          label={option.label}
          onPress={() => onChangeUnit(option.value)}
          selected={customUnit === option.value}
          variant="unit"
        />
      );
    }
  );

  const weekdaySelector = showsWeekdaySelector ? (
    <WeekdaySelector
      errorMessage={weekdayError}
      insidePanel={showsWeekdaysInsideCustomPanel}
      selectedDays={selectedWeekdays}
      onToggle={onToggleWeekday}
    />
  ) : null;

  const customRecurrencePanel = showsCustomRecurrencePanel ? (
    <View style={styles.customRecurrencePanel}>
      <AppText style={styles.customRecurrenceSectionLabel}>간격 설정</AppText>

      <View style={styles.customRecurrenceComposer}>
        <View style={styles.customRecurrenceCountField}>
          <AppText style={styles.customRecurrenceFieldLabel}>간격값</AppText>
          <TextInput
            accessibilityLabel="간격값"
            keyboardType="number-pad"
            onChangeText={onChangeIntervalValue}
            placeholder="1"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.intervalInput,
              styles.customRecurrenceInput,
              intervalError ? styles.inputError : undefined,
            ]}
            value={intervalValue}
          />
        </View>

        <View style={styles.customRecurrenceUnitField}>
          <AppText style={styles.customRecurrenceFieldLabel}>반복 단위</AppText>
          <View style={styles.customRecurrenceUnits}>
            {customRecurrenceUnitButtons}
          </View>
        </View>
      </View>

      {intervalError ? (
        <AppText style={styles.fieldError}>{intervalError}</AppText>
      ) : null}

      {showsWeekdaysInsideCustomPanel ? (
        <View style={styles.customRecurrenceWeekdaySection}>
          <AppText style={styles.customRecurrenceWeekdayLabel}>
            요일 선택
          </AppText>
          {weekdaySelector}
        </View>
      ) : null}

      <View style={styles.customRecurrenceSentence}>
        <AppText style={styles.customRecurrenceSentenceText}>
          {customRecurrenceDescription}
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onCloseCustom}
        style={({ pressed }) => [
          styles.inlineAction,
          pressed ? styles.inlineActionPressed : undefined,
        ]}
      >
        <AppText style={styles.inlineActionText}>
          빠른 선택으로 돌아가기
        </AppText>
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel}>반복</AppText>

      <View style={styles.quickRecurrenceGrid}>{quickRecurrenceButtons}</View>

      <View style={styles.secondaryRecurrenceRow}>
        <RecurrenceOptionButton
          label="한 번"
          onPress={() => onSelectRecurrence("once")}
          selected={isOnceSelected}
        />

        <RecurrenceOptionButton
          label="직접 설정"
          onPress={onOpenCustom}
          selected={isCustomSelected}
        />
      </View>

      {customRecurrencePanel}

      {showsStandaloneWeekdaySelector ? weekdaySelector : null}
    </View>
  );
}

type WeekdayChipButtonProps = {
  insidePanel: boolean;
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

function RecurrenceOptionButton({
  label,
  onPress,
  selected,
  variant = "default",
}: RecurrenceOptionButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        variant === "primary" ? styles.primaryRecurrenceChip : undefined,
        variant === "unit" ? styles.unitChip : undefined,
        variant === "unit" ? styles.customRecurrenceUnitChip : undefined,
        variant === "unit" ? styles.customRecurrenceUnitOption : undefined,
        selected ? styles.chipSelected : undefined,
        pressed ? styles.chipPressed : undefined,
      ]}
    >
      <AppText style={selected ? styles.chipTextSelected : styles.chipText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function WeekdaySelector({
  errorMessage,
  insidePanel = false,
  selectedDays,
  onToggle,
}: WeekdaySelectorProps): React.JSX.Element {
  const selectedWeekdaySet = new Set(selectedDays);
  const weekdayButtons = weekdayOptions.map((weekday) => {
    return (
      <WeekdayChipButton
        insidePanel={insidePanel}
        isSelected={selectedWeekdaySet.has(weekday.value)}
        key={weekday.value}
        label={weekday.label}
        onPress={() => onToggle(weekday.value)}
      />
    );
  });

  return (
    <View style={styles.field}>
      <AppText style={styles.subFieldLabel}>반복할 요일</AppText>
      <View style={styles.weekdayGroup}>{weekdayButtons}</View>
      {errorMessage ? (
        <AppText style={styles.fieldError}>{errorMessage}</AppText>
      ) : null}
    </View>
  );
}

function WeekdayChipButton({
  insidePanel,
  isSelected,
  label,
  onPress,
}: WeekdayChipButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.weekdayChip,
        insidePanel ? styles.weekdayChipInsideCustomPanel : undefined,
        isSelected ? styles.weekdayChipSelected : undefined,
        pressed ? styles.weekdayChipPressed : undefined,
      ]}
    >
      <AppText
        style={
          isSelected ? styles.weekdayChipTextSelected : styles.weekdayChipText
        }
      >
        {label}
      </AppText>
    </Pressable>
  );
}

type NotificationSectionProps = {
  enabled: boolean;
  onToggle: (value: boolean) => void;
};

export function NotificationSection({
  enabled,
  onToggle,
}: NotificationSectionProps): React.JSX.Element {
  const notificationStatusText = getNotificationStatusText(enabled);

  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationIconWrap}>
        <Bell color={colors.text} size={18} />
      </View>
      <View style={styles.notificationCopy}>
        <AppText style={styles.notificationTitle}>알림</AppText>
        <AppText style={styles.notificationSubtitle}>
          소리 및 배너 {notificationStatusText}
        </AppText>
      </View>
      <View style={styles.notificationSwitchWrap}>
        <Switch
          onValueChange={onToggle}
          thumbColor={colors.primaryForeground}
          trackColor={{ false: colors.outlineSoft, true: colors.primary }}
          value={enabled}
        />
      </View>
    </View>
  );
}

type AdvancedOptionsSectionProps = {
  anchorError?: string;
  anchorType: AnchorType;
  category: string;
  completionBasedEnabled: boolean;
  isOpen: boolean;
  recurrenceType: RecurrenceType;
  onCategoryChange: (value: string) => void;
  onSelectAnchorType: (anchorType: AnchorType) => void;
  onToggleOpen: () => void;
};

type AnchorOptionButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
};

function AnchorOptionButton({
  disabled,
  label,
  onPress,
  selected,
}: AnchorOptionButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.anchorOption,
        selected ? styles.anchorOptionSelected : undefined,
        disabled ? styles.anchorOptionDisabled : undefined,
        pressed && !disabled ? styles.anchorOptionPressed : undefined,
      ]}
    >
      <AppText
        style={
          selected ? styles.anchorOptionTitleSelected : styles.anchorOptionTitle
        }
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function AdvancedOptionsSection({
  anchorError,
  anchorType,
  category,
  completionBasedEnabled,
  isOpen,
  recurrenceType,
  onCategoryChange,
  onSelectAnchorType,
  onToggleOpen,
}: AdvancedOptionsSectionProps): React.JSX.Element {
  const {
    anchorDescription,
    showsAnchorOptions,
    showsCompletionBasedHelper,
    showsCompletionBasedOption,
  } = getAdvancedOptionsState({
    anchorType,
    completionBasedEnabled,
    recurrenceType,
  });
  const anchorOptionButtons = anchorOptions
    .filter(
      (option) =>
        option.value === "fixed" ||
        (option.value === "completion_based" && showsCompletionBasedOption)
    )
    .map((option) => {
      const disabled =
        option.value === "completion_based" && !completionBasedEnabled;

      return (
        <AnchorOptionButton
          disabled={disabled}
          key={option.value}
          label={option.label}
          onPress={() => onSelectAnchorType(option.value)}
          selected={anchorType === option.value}
        />
      );
    });

  const advancedContent = isOpen ? (
    <View style={styles.advancedContent}>
      <View style={styles.field}>
        <AppText style={styles.subFieldLabel}>카테고리</AppText>
        <TextInput
          accessibilityLabel="카테고리"
          onChangeText={onCategoryChange}
          placeholder="예: 건강, 집안일"
          placeholderTextColor={colors.textMuted}
          style={styles.textInput}
          value={category}
        />
      </View>

      {showsAnchorOptions ? (
        <View style={styles.field}>
          <AppText style={styles.subFieldLabel}>다음 일정 계산 방식</AppText>
          <View style={styles.anchorCard}>{anchorOptionButtons}</View>
          <AppText style={styles.anchorDescription}>
            {anchorDescription}
          </AppText>
          {showsCompletionBasedHelper ? (
            <AppText style={styles.advancedHelperText}>
              현재 반복 규칙에서는 완료 기준 계산을 지원하지 않습니다.
            </AppText>
          ) : null}
          {anchorError ? (
            <AppText style={styles.fieldError}>{anchorError}</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggleOpen}
        style={({ pressed }) => [
          styles.advancedToggle,
          pressed ? styles.inlineActionPressed : undefined,
        ]}
      >
        <AppText style={styles.fieldLabel}>고급 옵션</AppText>
        {isOpen ? (
          <ChevronUp color={colors.textMuted} size={18} />
        ) : (
          <ChevronDown color={colors.textMuted} size={18} />
        )}
      </Pressable>

      {advancedContent}
    </View>
  );
}

type IosPickerModalProps = {
  minimumDate?: Date;
  mode: "date" | "time" | null;
  value: Date;
  onChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function IosPickerModal({
  minimumDate,
  mode,
  value,
  onChange,
  onClose,
  onConfirm,
}: IosPickerModalProps): React.JSX.Element {
  const pickerTitle = mode === "date" ? "시작일 선택" : "알림 시간 선택";

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
              <AppText style={styles.pickerModalCancelText}>취소</AppText>
            </Pressable>
            <AppText style={styles.pickerModalTitle}>{pickerTitle}</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.pickerModalTextButton,
                pressed ? styles.inlineActionPressed : undefined,
              ]}
            >
              <AppText style={styles.pickerModalConfirmText}>확인</AppText>
            </Pressable>
          </View>

          {mode ? (
            <DateTimePicker
              display="spinner"
              minimumDate={mode === "date" ? minimumDate : undefined}
              mode={mode}
              onChange={onChange}
              value={value}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
