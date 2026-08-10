import { useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { FocusScreenHeader } from "~/ui/focus-screen-header";

import { FormActions } from "./form-actions";
import { ColorField, ScheduleOptions } from "./options";
import { RecurrenceSection } from "./recurrence";
import { ScheduleFields } from "./schedule-fields";
import {
  type ScheduleFormScreenStyles,
  useScheduleFormScreenStyles,
} from "./styles";
import { type ErrorTarget, getFirstErrorTarget } from "./view";
import type { useScheduleForm } from "../form";

type Props = ReturnType<typeof useScheduleForm>;

type SectionOffsets = Partial<Record<ErrorTarget, number>>;

export function ScheduleFormScreenContent({
  actions,
  control,
  errors,
  picker,
  state,
  values,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const { colors: themeColors, resolvedTheme } = useTheme();
  const styles = useScheduleFormScreenStyles();

  const [focusedInput, setFocusedInput] = useState<
    "description" | "title" | null
  >(null);
  const sectionOffsetsRef = useRef<SectionOffsets>({});
  const lastScrolledSubmitRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);

  const screenTitle = state.isEdit
    ? t("scheduleForm.title.edit")
    : t("scheduleForm.title.create");

  function saveSectionOffset(
    target: ErrorTarget,
    event: LayoutChangeEvent
  ): void {
    sectionOffsetsRef.current[target] = event.nativeEvent.layout.y;
  }

  // 제출 오류가 처음 발생한 입력으로 화면을 이동시킨다.
  useEffect(() => {
    if (
      state.submitCount === 0 ||
      state.submitCount === lastScrolledSubmitRef.current
    ) {
      return;
    }

    const target = getFirstErrorTarget(errors);
    const offset = target ? sectionOffsetsRef.current[target] : undefined;

    if (!target || offset === undefined) {
      return;
    }

    lastScrolledSubmitRef.current = state.submitCount;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(offset - 8, 0),
      });

      if (target === "title") {
        titleInputRef.current?.focus();
      }
    });
  }, [errors, state.submitCount]);

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
          <FocusScreenHeader
            onBack={actions.screen.onBack}
            title={screenTitle}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
            <ScreenError message={state.error} styles={styles} />

            <View
              onLayout={(event) => saveSectionOffset("title", event)}
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
                      setFocusedInput(null);
                    }}
                    onChangeText={actions.field.onChangeTitle}
                    onFocus={() => setFocusedInput("title")}
                    placeholder={t("scheduleForm.placeholders.title")}
                    placeholderTextColor={themeColors.textMuted}
                    style={[
                      styles.textInput,
                      styles.primaryTextInput,
                      focusedInput === "title"
                        ? styles.inputFocused
                        : undefined,
                      errors.title ? styles.inputError : undefined,
                    ]}
                    value={field.value}
                  />
                )}
              />
              {errors.title && (
                <AppText style={styles.fieldError} variant="caption">
                  {errors.title}
                </AppText>
              )}
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
                      setFocusedInput(null);
                    }}
                    onChangeText={actions.field.onChangeDescription}
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
                    value={field.value}
                  />
                )}
              />
            </View>

            <ColorField
              selected={values.colorKey}
              styles={styles}
              onSelect={actions.field.onSelectColorKey}
            />

            <View onLayout={(event) => saveSectionOffset("recurrence", event)}>
              <RecurrenceSection
                intervalError={errors.interval}
                intervalValue={values.intervalValue}
                recurrenceType={values.recurrenceType}
                selectedWeekdays={values.weekdayMask}
                styles={styles}
                themeColors={themeColors}
                weekdayError={errors.weekday}
                onChangeIntervalValue={actions.recurrence.onChangeIntervalValue}
                onSelectRecurrence={actions.recurrence.onSelectRecurrence}
                onToggleWeekday={actions.recurrence.onToggleWeekday}
              />
            </View>

            <ScheduleFields
              actions={actions}
              errors={errors}
              picker={picker}
              resolvedTheme={resolvedTheme}
              state={state}
              styles={styles}
              themeColors={themeColors}
              values={values}
              onLayout={(event) => saveSectionOffset("schedule", event)}
            />

            <ScheduleOptions
              anchorError={errors.anchor}
              anchorType={values.anchorType}
              notificationsEnabled={values.notificationsEnabled}
              recurrenceType={values.recurrenceType}
              styles={styles}
              themeColors={themeColors}
              onLayout={(event) => saveSectionOffset("options", event)}
              onSelectAnchorType={actions.recurrence.onSelectAnchorType}
              onToggleNotifications={actions.field.onToggleNotifications}
            />
          </ScrollView>

          <FormActions
            isDeleting={state.isDeleting}
            isEdit={state.isEdit}
            isSaving={state.isSaving}
            styles={styles}
            themeColors={themeColors}
            onDelete={actions.screen.onDelete}
            onSubmit={actions.screen.onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ScreenError({
  message,
  styles,
}: {
  message: string | null;
  styles: ScheduleFormScreenStyles;
}): React.JSX.Element | null {
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
