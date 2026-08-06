import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing, typography } from "~/ui/tokens";

type NameEditorProps = {
  errorMessage: string | null;
  isSaving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
  value: string;
  visible: boolean;
};

export function NameEditor({
  errorMessage,
  isSaving,
  onChange,
  onClose,
  onSave,
  value,
  visible,
}: NameEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View
        style={[styles.modalBackdrop, { backgroundColor: themeColors.scrim }]}
      >
        <View
          style={[styles.nameEditor, { backgroundColor: themeColors.surface }]}
        >
          <AppText variant="body2">{t("settings.nameEditor.title")}</AppText>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSaving}
            maxLength={30}
            onChangeText={onChange}
            placeholder={t("settings.nameEditor.placeholder")}
            placeholderTextColor={themeColors.textSoft}
            style={[
              styles.nameInput,
              {
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            value={value}
          />
          {errorMessage && (
            <AppText style={{ color: themeColors.error }} variant="caption">
              {errorMessage}
            </AppText>
          )}
          <View style={styles.nameEditorActions}>
            <Pressable
              accessibilityLabel={t("settings.nameEditor.cancel")}
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onClose}
              style={({ pressed }) => [
                styles.nameEditorButton,
                styles.nameEditorCancelButton,
                { borderColor: themeColors.border },
                pressed ? styles.rowPressed : undefined,
              ]}
            >
              <AppText style={{ color: themeColors.textMuted }} variant="body3">
                {t("settings.nameEditor.cancel")}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityLabel={t("settings.nameEditor.save")}
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => {
                void onSave();
              }}
              style={({ pressed }) => [
                styles.nameEditorButton,
                { backgroundColor: themeColors.primary },
                pressed ? styles.rowPressed : undefined,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={themeColors.primaryForeground} />
              ) : (
                <AppText
                  style={{ color: themeColors.primaryForeground }}
                  variant="body3"
                >
                  {t("settings.nameEditor.save")}
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  nameEditor: {
    borderRadius: borderRadius.xl,
    gap: spacing.md,
    padding: spacing.lg,
    width: "100%",
  },
  nameEditorActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  nameEditorButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 36,
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: spacing.md,
  },
  nameEditorCancelButton: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  nameInput: {
    backgroundColor: "transparent",
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.body3,
    lineHeight: typography.lineHeight.body3,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    opacity: 0.72,
  },
});
