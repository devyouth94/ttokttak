import { type RefObject, useMemo, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  type LayoutChangeEvent,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing, typography } from "~/ui/tokens";

import type { ScheduleFormValues } from "../form-values";

type ContentFieldsProps = {
  onTitleLayout: (event: LayoutChangeEvent) => void;
  titleInputRef: RefObject<TextInput | null>;
};

export function ContentFields({
  onTitleLayout,
  titleInputRef,
}: ContentFieldsProps): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const {
    clearErrors,
    control,
    formState: { errors },
  } = useFormContext<ScheduleFormValues>();
  const { field: titleField } = useController({ control, name: "title" });
  const { field: descriptionField } = useController({
    control,
    name: "description",
  });

  const [focusedInput, setFocusedInput] = useState<
    "description" | "title" | null
  >(null);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const titleError = errors.title?.message;

  function changeTitle(value: string): void {
    clearErrors("root");
    titleField.onChange(value);
  }

  function changeDescription(value: string): void {
    clearErrors("root");
    descriptionField.onChange(value);
  }

  return (
    <>
      <View onLayout={onTitleLayout} style={styles.field}>
        <AppText style={styles.fieldLabel} variant="body2">
          {t("scheduleForm.fields.title")}
        </AppText>
        <TextInput
          accessibilityLabel={t("scheduleForm.fields.title")}
          onBlur={() => {
            titleField.onBlur();
            setFocusedInput(null);
          }}
          onChangeText={changeTitle}
          onFocus={() => setFocusedInput("title")}
          placeholder={t("scheduleForm.placeholders.title")}
          placeholderTextColor={themeColors.textMuted}
          ref={titleInputRef}
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
          onChangeText={changeDescription}
          onFocus={() => setFocusedInput("description")}
          placeholder={t("scheduleForm.placeholders.description")}
          placeholderTextColor={themeColors.textMuted}
          style={[
            styles.textInput,
            styles.multilineInput,
            focusedInput === "description" ? styles.inputFocused : undefined,
          ]}
          textAlignVertical="top"
          value={descriptionField.value}
        />
      </View>
    </>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    field: {
      gap: spacing.xs,
    },
    fieldError: {
      color: themeColors.error,
    },
    fieldLabel: {
      color: themeColors.text,
    },
    inputError: {
      borderColor: themeColors.error,
    },
    inputFocused: {
      borderColor: themeColors.primary,
    },
    multilineInput: {
      minHeight: 108,
      paddingTop: spacing.md,
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
