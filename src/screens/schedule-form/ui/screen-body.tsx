import { useEffect, useMemo, useRef, useState } from "react";
import {
  type FieldErrors,
  useController,
  useFormContext,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trash2 } from "lucide-react-native";

import { useTheme } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { FocusScreenHeader } from "~/ui/focus-screen-header";
import { borderRadius, spacing, typography } from "~/ui/tokens";

import { ColorField } from "./color-field/field";
import { DateFields } from "./date-fields/field";
import { ScheduleOptions } from "./options";
import { RecurrenceSection } from "./recurrence";
import type { ScheduleFormValues } from "../form-values";

type ErrorSection = "options" | "recurrence" | "schedule" | "title";
type SectionOffsets = Partial<Record<ErrorSection, number>>;

export function ScheduleFormBody({
  onBack,
  isDeleting,
  isEdit,
  loadError,
  remove,
  submit,
  today,
}: {
  onBack: () => void;
  isDeleting: boolean;
  isEdit: boolean;
  loadError: string | null;
  remove: () => void;
  submit: () => void;
  today: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const {
    clearErrors,
    control,
    formState: { errors, isSubmitting, submitCount },
  } = useFormContext<ScheduleFormValues>();

  const { field: titleField } = useController({ control, name: "title" });
  const { field: descriptionField } = useController({
    control,
    name: "description",
  });

  const [focusedInput, setFocusedInput] = useState<
    "description" | "title" | null
  >(null);

  const sectionOffsetsRef = useRef<SectionOffsets>({});
  const lastScrolledSubmitRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);

  const screenTitle = isEdit
    ? t("scheduleForm.title.edit")
    : t("scheduleForm.title.create");
  const titleError = errors.title?.message;
  const screenError = errors.root?.message ?? loadError;
  const disabled = isDeleting || isSubmitting;

  function saveSectionOffset(
    target: ErrorSection,
    event: LayoutChangeEvent
  ): void {
    sectionOffsetsRef.current[target] = event.nativeEvent.layout.y;
  }

  // 제출 오류가 처음 발생한 입력으로 화면을 이동시킨다.
  useEffect(() => {
    if (submitCount === 0 || submitCount === lastScrolledSubmitRef.current) {
      return;
    }

    const target = getFirstErrorSection(errors);
    const offset = target ? sectionOffsetsRef.current[target] : undefined;

    if (!target || offset === undefined) {
      return;
    }

    lastScrolledSubmitRef.current = submitCount;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(offset - 8, 0),
      });

      if (target === "title") {
        titleInputRef.current?.focus();
      }
    });
  }, [errors, submitCount]);

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
          <FocusScreenHeader onBack={onBack} title={screenTitle} />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
            {screenError && (
              <View style={styles.errorCard}>
                <AppText style={styles.errorTitle} variant="title">
                  {t("scheduleForm.error.title")}
                </AppText>
                <AppText style={styles.errorText} variant="body">
                  {screenError}
                </AppText>
              </View>
            )}

            <View
              onLayout={(event) => saveSectionOffset("title", event)}
              style={styles.field}
            >
              <AppText style={styles.fieldLabel} variant="body2">
                {t("scheduleForm.fields.title")}
              </AppText>
              <TextInput
                accessibilityLabel={t("scheduleForm.fields.title")}
                ref={titleInputRef}
                onBlur={() => {
                  titleField.onBlur();
                  setFocusedInput(null);
                }}
                onChangeText={(value) => {
                  clearErrors("root");
                  titleField.onChange(value);
                }}
                onFocus={() => setFocusedInput("title")}
                placeholder={t("scheduleForm.placeholders.title")}
                placeholderTextColor={themeColors.textMuted}
                style={[
                  styles.textInput,
                  focusedInput === "title" ? styles.inputFocused : undefined,
                  titleError ? styles.inputError : undefined,
                ]}
                value={titleField.value}
              />
              {titleError && (
                <AppText style={styles.fieldError} variant="caption">
                  {titleError}
                </AppText>
              )}
            </View>

            <View style={styles.field}>
              <AppText style={styles.fieldLabel} variant="body2">
                {t("scheduleForm.fields.description")}
              </AppText>
              <TextInput
                accessibilityLabel={t("scheduleForm.fields.descriptionA11y")}
                multiline
                onBlur={() => {
                  descriptionField.onBlur();
                  setFocusedInput(null);
                }}
                onChangeText={(value) => {
                  clearErrors("root");
                  descriptionField.onChange(value);
                }}
                onFocus={() => setFocusedInput("description")}
                placeholder={t("scheduleForm.placeholders.description")}
                placeholderTextColor={themeColors.textMuted}
                style={[
                  styles.textInput,
                  styles.multilineInput,
                  focusedInput === "description"
                    ? styles.inputFocused
                    : undefined,
                ]}
                textAlignVertical="top"
                value={descriptionField.value}
              />
            </View>

            <View onLayout={(event) => saveSectionOffset("recurrence", event)}>
              <RecurrenceSection />
            </View>

            <View onLayout={(event) => saveSectionOffset("schedule", event)}>
              <DateFields isEdit={isEdit} today={today} />
            </View>

            <ColorField />

            <View onLayout={(event) => saveSectionOffset("options", event)}>
              <ScheduleOptions />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerActions}>
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={submit}
                style={({ pressed }) => [
                  styles.saveButton,
                  isEdit ? styles.editSaveButton : styles.createSaveButton,
                  disabled ? styles.saveButtonDisabled : undefined,
                  pressed && !disabled ? styles.saveButtonPressed : undefined,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={themeColors.primaryForeground} />
                ) : (
                  <AppText style={styles.saveButtonText} variant="body">
                    {isEdit
                      ? t("scheduleForm.actions.update")
                      : t("scheduleForm.actions.save")}
                  </AppText>
                )}
              </Pressable>

              {isEdit && (
                <Pressable
                  accessibilityHint={t("scheduleForm.deleteButton.hint")}
                  accessibilityLabel={t("scheduleForm.deleteButton.label")}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={remove}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    disabled ? styles.saveButtonDisabled : undefined,
                    pressed && !disabled
                      ? styles.deleteButtonPressed
                      : undefined,
                  ]}
                >
                  {isDeleting ? (
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
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getFirstErrorSection(
  errors: FieldErrors<ScheduleFormValues>
): ErrorSection | null {
  if (errors.title) {
    return "title";
  }

  if (errors.intervalValue || errors.weekdayMask) {
    return "recurrence";
  }

  if (
    errors.startDateLocal ||
    errors.reminderTimeLocal ||
    errors.endDateLocal
  ) {
    return "schedule";
  }

  return errors.anchorType ? "options" : null;
}

function createStyles(themeColors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    createSaveButton: {
      width: "100%",
    },
    deleteButton: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderColor: themeColors.accent,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      height: 48,
      justifyContent: "center",
      width: 56,
    },
    deleteButtonPressed: {
      opacity: 0.9,
    },
    editSaveButton: {
      flex: 1,
    },
    errorCard: {
      backgroundColor: themeColors.errorContainer,
      borderRadius: borderRadius.lg,
      gap: spacing.xs,
      padding: spacing.md,
    },
    errorText: {
      color: themeColors.error,
    },
    errorTitle: {
      color: themeColors.error,
    },
    field: {
      gap: spacing.xs,
    },
    fieldError: {
      color: themeColors.error,
    },
    fieldLabel: {
      color: themeColors.text,
    },
    footer: {
      backgroundColor: themeColors.background,
      minHeight: 60,
      paddingBottom: 8,
      paddingHorizontal: spacing.md,
      paddingTop: 8,
    },
    footerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
    },
    inputError: {
      borderColor: themeColors.error,
    },
    inputFocused: {
      borderColor: themeColors.primary,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    multilineInput: {
      minHeight: 108,
      paddingTop: spacing.md,
    },
    safeArea: {
      backgroundColor: themeColors.background,
      flex: 1,
    },
    saveButton: {
      alignItems: "center",
      backgroundColor: themeColors.primary,
      borderRadius: borderRadius.pill,
      height: 48,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonPressed: {
      opacity: 0.9,
    },
    saveButtonText: {
      color: themeColors.primaryForeground,
    },
    screenRoot: {
      flex: 1,
    },
    scrollContent: {
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.md,
    },
    scrollView: {
      flex: 1,
    },
    textInput: {
      backgroundColor: "transparent",
      borderColor: themeColors.border,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      color: themeColors.text,
      fontFamily: typography.fontFamily.body,
      fontSize: typography.size.body3,
      lineHeight: typography.lineHeight.body3,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
  });
}
