import { type RefObject, useMemo, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  type LayoutChangeEvent,
  StyleSheet,
  type TextInput,
  View,
} from "react-native";

import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { AppTextInput } from "~/ui/app-text-input";
import { spacing } from "~/ui/tokens";

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

  function blurTitle(): void {
    titleField.onBlur();
    setFocusedInput(null);
  }

  function blurDescription(): void {
    descriptionField.onBlur();
    setFocusedInput(null);
  }

  return (
    <>
      <View onLayout={onTitleLayout} style={styles.field}>
        <AppText style={styles.fieldLabel} variant="body2">
          {t("scheduleForm.fields.title")}
        </AppText>
        <AppTextInput
          accessibilityLabel={t("scheduleForm.fields.title")}
          error={Boolean(titleError)}
          focused={focusedInput === "title"}
          onBlur={blurTitle}
          onChangeText={changeTitle}
          onFocus={() => setFocusedInput("title")}
          placeholder={t("scheduleForm.placeholders.title")}
          ref={titleInputRef}
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
        <AppTextInput
          accessibilityLabel={t("scheduleForm.fields.descriptionA11y")}
          focused={focusedInput === "description"}
          multiline
          onBlur={blurDescription}
          onChangeText={changeDescription}
          onFocus={() => setFocusedInput("description")}
          placeholder={t("scheduleForm.placeholders.description")}
          style={styles.multilineInput}
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
    multilineInput: {
      minHeight: 108,
      paddingTop: spacing.md,
    },
  });
}
