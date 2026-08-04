import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Trash2 } from "lucide-react-native";

import type { ThemeColors } from "~/theme/colors";
import { AppText } from "~/ui/app-text";

import type { ScheduleFormScreenStyles } from "./styles";

type Props = {
  isDeleting: boolean;
  isEdit: boolean;
  isSaving: boolean;
  styles: ScheduleFormScreenStyles;
  themeColors: ThemeColors;
  onDelete: () => void;
  onSubmit: () => void;
};

export function FormActions({
  isDeleting,
  isEdit,
  isSaving,
  styles,
  themeColors,
  onDelete,
  onSubmit,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const disabled = isDeleting || isSaving;

  return (
    <View style={styles.footer}>
      <View style={styles.footerActions}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.saveButton,
            isEdit ? styles.editSaveButton : styles.createSaveButton,
            disabled ? styles.saveButtonDisabled : undefined,
            pressed && !disabled ? styles.saveButtonPressed : undefined,
          ]}
        >
          {isSaving ? (
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
            onPress={onDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              disabled ? styles.saveButtonDisabled : undefined,
              pressed && !disabled ? styles.deleteButtonPressed : undefined,
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
  );
}
