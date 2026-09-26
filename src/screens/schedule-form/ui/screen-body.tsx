import { useEffect, useMemo, useRef } from "react";
import { type FieldErrors, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trash2 } from "lucide-react-native";

import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { FocusScreenHeader } from "~/ui/focus-screen-header";
import { borderRadius, spacing } from "~/ui/tokens";

import { ColorField } from "./color-field/field";
import { ContentFields } from "./content-fields";
import { DateFields } from "./date-fields/field";
import { ScheduleOptions } from "./options";
import { RecurrenceSection } from "./recurrence";
import type { ScheduleFormValues } from "../form-values";

type ErrorSection = "options" | "recurrence" | "schedule" | "title";
type SectionOffsets = Partial<Record<ErrorSection, number>>;

type ScheduleFormBodyProps = {
  isDeleting: boolean;
  isEdit: boolean;
  loadError: string | null;
  onBack: () => void;
  remove: () => void;
  submit: () => void;
  today: string;
};

export function ScheduleFormBody({
  onBack,
  isDeleting,
  isEdit,
  loadError,
  remove,
  submit,
  today,
}: ScheduleFormBodyProps): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const {
    formState: { errors, isSubmitting, submitCount },
  } = useFormContext<ScheduleFormValues>();

  const sectionOffsetsRef = useRef<SectionOffsets>({});
  const lastScrolledSubmitRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const screenTitle = isEdit
    ? t("scheduleForm.title.edit")
    : t("scheduleForm.title.create");
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

            <ContentFields
              onTitleLayout={(event) => saveSectionOffset("title", event)}
              titleInputRef={titleInputRef}
            />

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

function createStyles(themeColors: ThemeColors) {
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
    keyboardAvoidingView: {
      flex: 1,
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
  });
}
