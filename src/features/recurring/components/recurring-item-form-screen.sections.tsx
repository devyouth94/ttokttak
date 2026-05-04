import { useState } from "react";
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

import { AppText } from "~/design-system/components/app-text";
import { color, colors } from "~/design-system/tokens";
import {
  type AnchorType,
  type RecurrenceType,
} from "~/features/recurring/domain/types";

import {
  type CustomRecurrenceUnit,
  customRecurrenceUnitOptions,
  getAdvancedOptionsState,
  getCompletionBasedInfoText,
  getRecurrenceSectionState,
  quickRecurrenceOptions,
  weekdayOptions,
} from "./recurring-item-form-screen.helpers";
import { styles } from "./recurring-item-form-screen.styles";

type WeekdaySelectorProps = {
  errorMessage?: string;
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

type RecurrenceModeTabButtonProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
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
      selectedDays={selectedWeekdays}
      onToggle={onToggleWeekday}
    />
  ) : null;

  const customRecurrencePanel = showsCustomRecurrencePanel ? (
    <View style={styles.quickRecurrenceContent}>
      <View style={styles.customRecurrenceControlGroup}>
        <AppText style={styles.subFieldLabel} variant="body2">
          반복 간격
        </AppText>
        <View style={styles.customRecurrenceControls}>
          <TextInput
            accessibilityLabel="간격값"
            keyboardType="number-pad"
            onBlur={() => setIsCustomIntervalFocused(false)}
            onChangeText={onChangeIntervalValue}
            onFocus={() => setIsCustomIntervalFocused(true)}
            placeholder="1"
            placeholderTextColor={colors.textMuted}
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

        {intervalError ? (
          <AppText style={styles.fieldError} variant="caption">
            {intervalError}
          </AppText>
        ) : null}
      </View>

      {showsWeekdaysInsideCustomPanel ? weekdaySelector : null}
    </View>
  ) : null;

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
        반복
      </AppText>

      <View style={styles.recurrenceSettingsStack}>
        <View style={styles.recurrenceModeTabs}>
          <RecurrenceModeTabButton
            label="기본 설정"
            onPress={onCloseCustom}
            selected={!isCustomSelected}
          />

          <RecurrenceModeTabButton
            label="직접 설정"
            onPress={onOpenCustom}
            selected={isCustomSelected}
          />
        </View>

        {isCustomSelected ? (
          customRecurrencePanel
        ) : (
          <View style={styles.quickRecurrenceContent}>
            <View style={styles.quickRecurrenceGrid}>
              {quickRecurrenceButtons}
              <RecurrenceOptionButton
                label="한 번"
                onPress={() => onSelectRecurrence("once")}
                selected={isOnceSelected}
                variant="primary"
              />
            </View>

            {showsStandaloneWeekdaySelector ? weekdaySelector : null}
          </View>
        )}
      </View>
    </View>
  );
}

type WeekdayChipButtonProps = {
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
  onToggle,
}: WeekdaySelectorProps): React.JSX.Element {
  const selectedWeekdaySet = new Set(selectedDays);
  const weekdayButtons = weekdayOptions.map((weekday) => {
    return (
      <WeekdayChipButton
        isSelected={selectedWeekdaySet.has(weekday.value)}
        key={weekday.value}
        label={weekday.label}
        onPress={() => onToggle(weekday.value)}
      />
    );
  });

  return (
    <View style={styles.field}>
      <AppText style={styles.subFieldLabel} variant="body2">
        반복할 요일
      </AppText>
      <View style={styles.weekdayGroup}>{weekdayButtons}</View>
      {errorMessage ? (
        <AppText style={styles.fieldError} variant="caption">
          {errorMessage}
        </AppText>
      ) : null}
    </View>
  );
}

function WeekdayChipButton({
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
  onToggle: (value: boolean) => void;
};

export function NotificationSection({
  enabled,
  onToggle,
}: NotificationSectionProps): React.JSX.Element {
  return (
    <View style={styles.optionToggleRow}>
      <AppText style={styles.optionToggleLabel} variant="body2">
        알림 사용
      </AppText>
      <Switch
        onValueChange={onToggle}
        thumbColor={colors.primaryForeground}
        trackColor={{ false: colors.outlineSoft, true: colors.primary }}
        value={enabled}
      />
    </View>
  );
}

type AdvancedOptionsSectionProps = {
  anchorError?: string;
  anchorType: AnchorType;
  recurrenceType: RecurrenceType;
  onSelectAnchorType: (anchorType: AnchorType) => void;
};

export function AdvancedOptionsSection({
  anchorError,
  anchorType,
  recurrenceType,
  onSelectAnchorType,
}: AdvancedOptionsSectionProps): React.JSX.Element {
  const { isCompletionBasedSwitchEnabled } = getAdvancedOptionsState({
    recurrenceType,
  });

  const isCompletionBasedSelected =
    isCompletionBasedSwitchEnabled && anchorType === "completion_based";

  const handleToggleCompletionBased = (nextValue: boolean): void => {
    if (!isCompletionBasedSwitchEnabled) {
      return;
    }

    onSelectAnchorType(nextValue ? "completion_based" : "fixed");
  };

  const handlePressInfo = (): void => {
    Alert.alert("완료일 기준", getCompletionBasedInfoText());
  };

  return (
    <View style={styles.optionToggleGroup}>
      <View style={styles.optionToggleRow}>
        <View style={styles.optionToggleLabelGroup}>
          <AppText style={styles.optionToggleLabel} variant="body2">
            완료일 기준
          </AppText>
          <Pressable
            accessibilityHint="완료일 기준 설명을 확인해요."
            accessibilityLabel="완료일 기준 설명"
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
              color={color.gray}
              size={16}
              strokeWidth={1.2}
            />
          </Pressable>
        </View>
        <Switch
          disabled={!isCompletionBasedSwitchEnabled}
          onValueChange={handleToggleCompletionBased}
          thumbColor={colors.primaryForeground}
          trackColor={{ false: colors.outlineSoft, true: colors.primary }}
          value={isCompletionBasedSelected}
        />
      </View>

      {anchorError ? (
        <AppText style={styles.fieldError} variant="caption">
          {anchorError}
        </AppText>
      ) : null}
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
              <AppText style={styles.pickerModalCancelText} variant="body2">
                취소
              </AppText>
            </Pressable>
            <AppText style={styles.pickerModalTitle} variant="body2">
              {pickerTitle}
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
                확인
              </AppText>
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
