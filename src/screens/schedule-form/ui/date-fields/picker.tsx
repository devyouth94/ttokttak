import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { parse } from "date-fns/parse";

import type { ThemeColors } from "~/theme/colors";
import { useTheme } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

type DateTimePickerFieldProps = {
  accessibilityHint: string;
  accessibilityLabel: string;
  description?: string;
  disabled?: boolean;
  displayValue: string;
  error?: string;
  icon: React.JSX.Element;
  label?: string;
  localValue: string;
  minimumLocalDate?: string;
  mode: "date" | "time";
  onChange: (date: Date) => void;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function DateTimePickerField({
  accessibilityHint,
  accessibilityLabel,
  description,
  disabled = false,
  displayValue,
  error,
  icon,
  label,
  localValue,
  minimumLocalDate,
  mode,
  onChange,
  style,
  title,
}: DateTimePickerFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors: themeColors, resolvedTheme } = useTheme();
  const [draft, setDraft] = useState<Date | null>(null);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const minimumDate = minimumLocalDate
    ? parseLocalValue(minimumLocalDate, "date")
    : undefined;

  function changePicker(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === "ios") {
      if (event.type === "set" && date) {
        setDraft(date);
      }

      return;
    }

    setDraft(null);

    if (event.type === "set" && date) {
      onChange(date);
    }
  }

  function confirmIosPicker(): void {
    if (draft) {
      onChange(draft);
    }

    setDraft(null);
  }

  useEffect(() => {
    if (disabled) {
      setDraft(null);
    }
  }, [disabled]);

  return (
    <View style={[styles.field, style]}>
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
        onPress={() => setDraft(parseLocalValue(localValue, mode))}
        style={({ pressed }) => [
          styles.iconInputShell,
          disabled ? styles.iconInputShellDisabled : undefined,
          error ? styles.inputError : undefined,
          pressed && !disabled ? styles.pressed : undefined,
        ]}
      >
        {icon}
        <AppText style={styles.iconInputValue} variant="body3">
          {displayValue}
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

      {Platform.OS !== "ios" && draft && (
        <DateTimePicker
          accentColor={themeColors.primary}
          initialInputMode={mode === "date" ? "default" : undefined}
          minimumDate={minimumDate}
          mode={mode}
          onChange={changePicker}
          textColor={themeColors.text}
          themeVariant={resolvedTheme}
          value={draft}
        />
      )}

      {Platform.OS === "ios" && draft && (
        <Modal
          animationType="fade"
          onRequestClose={() => setDraft(null)}
          transparent
          visible
        >
          <Pressable
            onPress={() => setDraft(null)}
            style={styles.modalBackdrop}
          >
            <Pressable style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Pressable
                  accessibilityLabel={t("scheduleForm.actions.cancel")}
                  accessibilityRole="button"
                  onPress={() => setDraft(null)}
                  style={({ pressed }) => [
                    styles.modalTextButton,
                    pressed ? styles.actionPressed : undefined,
                  ]}
                >
                  <AppText style={styles.modalCancelText} variant="body2">
                    {t("scheduleForm.actions.cancel")}
                  </AppText>
                </Pressable>
                <AppText style={styles.modalTitle} variant="body2">
                  {title}
                </AppText>
                <Pressable
                  accessibilityLabel={t("scheduleForm.actions.confirm")}
                  accessibilityRole="button"
                  onPress={confirmIosPicker}
                  style={({ pressed }) => [
                    styles.modalTextButton,
                    pressed ? styles.actionPressed : undefined,
                  ]}
                >
                  <AppText style={styles.modalConfirmText} variant="body2">
                    {t("scheduleForm.actions.confirm")}
                  </AppText>
                </Pressable>
              </View>

              <DateTimePicker
                accentColor={themeColors.primary}
                display="spinner"
                minimumDate={minimumDate}
                mode={mode}
                onChange={changePicker}
                textColor={themeColors.text}
                themeVariant={resolvedTheme}
                value={draft}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function parseLocalValue(value: string, mode: "date" | "time"): Date {
  return parse(value, mode === "date" ? "yyyy-MM-dd" : "HH:mm", new Date());
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    actionPressed: {
      opacity: 0.72,
    },
    field: {
      gap: spacing.xs,
    },
    fieldError: {
      color: themeColors.error,
    },
    fieldHelper: {
      color: themeColors.textMuted,
    },
    fieldLabel: {
      color: themeColors.text,
    },
    iconInputShell: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderColor: themeColors.border,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.xxs,
      minHeight: 48,
      paddingHorizontal: spacing.md,
    },
    iconInputShellDisabled: {
      opacity: 0.58,
    },
    iconInputValue: {
      color: themeColors.text,
      flex: 1,
      flexShrink: 1,
    },
    inputError: {
      borderColor: themeColors.error,
    },
    modalBackdrop: {
      backgroundColor: themeColors.scrim,
      flex: 1,
      justifyContent: "flex-end",
    },
    modalCancelText: {
      color: themeColors.textMuted,
    },
    modalCard: {
      backgroundColor: themeColors.background,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      paddingBottom: spacing.lg,
      paddingTop: spacing.sm,
    },
    modalConfirmText: {
      color: themeColors.primary,
      textAlign: "right",
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    modalTextButton: {
      minWidth: 44,
      paddingVertical: spacing.xs,
    },
    modalTitle: {
      color: themeColors.text,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
