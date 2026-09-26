import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Info } from "lucide-react-native";

import { supportsCompletion } from "~/schedule/rules/recurrence";
import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { spacing } from "~/ui/tokens";

import type { ScheduleFormValues } from "../form-values";
import { useScheduleFormSetters } from "../use-form-setters";

export function ScheduleOptions(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const {
    control,
    formState: { errors },
  } = useFormContext<ScheduleFormValues>();

  const { setField } = useScheduleFormSetters();

  const [anchorType, notificationsEnabled, recurrenceType] = useWatch({
    control,
    name: ["anchorType", "notificationsEnabled", "recurrenceType"],
  });

  const canUseCompletion = supportsCompletion(recurrenceType);
  const usesCompletion = canUseCompletion && anchorType === "completion_based";

  function toggleCompletion(value: boolean): void {
    if (!canUseCompletion) {
      return;
    }

    setField("anchorType", value ? "completion_based" : "fixed");
  }

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
        {t("scheduleForm.sections.options")}
      </AppText>
      <View style={styles.optionRows}>
        <View style={styles.optionToggleRow}>
          <AppText style={styles.optionToggleLabel} variant="body2">
            {t("scheduleForm.fields.notificationsEnabled")}
          </AppText>
          <Switch
            onValueChange={(value) => {
              setField("notificationsEnabled", value);
            }}
            style={styles.optionToggleSwitch}
            thumbColor={themeColors.primaryForeground}
            trackColor={{
              false: themeColors.controlTrack,
              true: themeColors.primary,
            }}
            value={notificationsEnabled}
          />
        </View>

        <View style={styles.optionToggleGroup}>
          <View style={styles.optionToggleRow}>
            <View style={styles.optionToggleLabelGroup}>
              <AppText style={styles.optionToggleLabel} variant="body2">
                {t("scheduleForm.completionBased.title")}
              </AppText>
              <Pressable
                accessibilityHint={t("scheduleForm.completionBased.infoHint")}
                accessibilityLabel={t("scheduleForm.completionBased.infoLabel")}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    t("scheduleForm.completionBased.title"),
                    t("scheduleForm.completionBased.description")
                  )
                }
                style={({ pressed }) => [
                  styles.optionInfoButton,
                  pressed ? styles.inlineActionPressed : undefined,
                ]}
              >
                <Info
                  absoluteStrokeWidth
                  color={themeColors.textSoft}
                  size={16}
                  strokeWidth={1.2}
                />
              </Pressable>
            </View>
            <Switch
              disabled={!canUseCompletion}
              onValueChange={toggleCompletion}
              style={styles.optionToggleSwitch}
              thumbColor={themeColors.primaryForeground}
              trackColor={{
                false: themeColors.controlTrack,
                true: themeColors.primary,
              }}
              value={usesCompletion}
            />
          </View>

          {errors.anchorType?.message && (
            <AppText style={styles.fieldError} variant="caption">
              {errors.anchorType.message}
            </AppText>
          )}
        </View>
      </View>
    </View>
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
    inlineActionPressed: {
      opacity: 0.72,
    },
    optionInfoButton: {
      alignItems: "center",
      justifyContent: "center",
    },
    optionRows: {
      gap: spacing.none,
    },
    optionToggleGroup: {
      gap: spacing.xs,
    },
    optionToggleLabel: {
      color: themeColors.textSoft,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    optionToggleLabelGroup: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xxs,
    },
    optionToggleRow: {
      alignItems: "center",
      flexDirection: "row",
      height: 40,
      justifyContent: "space-between",
    },
    optionToggleSwitch: {
      transform: Platform.select({
        ios: [{ translateY: 8 }],
        default: undefined,
      }),
    },
  });
}
