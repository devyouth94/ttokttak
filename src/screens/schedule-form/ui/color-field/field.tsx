import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { Check } from "lucide-react-native";

import { useAppLanguage } from "~/i18n/provider";
import { normalizeColorHex } from "~/schedule/color";
import { getColorOptions } from "~/schedule/display/color";
import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

import { contrastingColor } from "./color-space";
import { CustomColorPicker } from "./custom-picker";
import type { ScheduleFormValues } from "../../form-values";
import { useScheduleFormSetters } from "../../use-form-setters";

export function ColorField(): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();
  const { setField } = useScheduleFormSetters();
  const { control } = useFormContext<ScheduleFormValues>();
  const selected = useWatch({ control, name: "colorHex" });

  const [isCustomSelected, setIsCustomSelected] = useState(() => {
    const initialColorHex = normalizeColorHex(selected);
    return !getColorOptions(language).some(
      (option) => option.swatchColor === initialColorHex
    );
  });
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const previousColorHex = useRef(normalizeColorHex(selected));

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const colorHex = normalizeColorHex(selected);
  const colorOptions = getColorOptions(language);
  const selectedPreset = colorOptions.find(
    (option) => option.swatchColor === colorHex
  )?.value;

  function selectColor(nextColor: string): void {
    setField("colorHex", normalizeColorHex(nextColor));
  }

  function selectPresetColor(nextColor: string): void {
    setIsCustomSelected(false);
    selectColor(nextColor);
  }

  function selectCustomColor(nextColor: string): void {
    setIsCustomSelected(true);
    selectColor(nextColor);
  }

  useEffect(() => {
    const didColorChange = previousColorHex.current !== colorHex;
    previousColorHex.current = colorHex;

    if (didColorChange && !isPickerVisible) {
      setIsCustomSelected(selectedPreset === undefined);
    }
  }, [colorHex, isPickerVisible, selectedPreset]);

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel} variant="body2">
        {t("scheduleForm.fields.color")}
      </AppText>

      <View style={styles.presets}>
        {colorOptions.map((option) => {
          const isSelected =
            !isCustomSelected && selectedPreset === option.value;

          return (
            <Pressable
              accessibilityHint={t("scheduleForm.color.optionHint", {
                color: option.label,
              })}
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              key={option.value}
              onPress={() => selectPresetColor(option.swatchColor)}
              style={({ pressed }) => [
                styles.presetButton,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.preset,
                  {
                    backgroundColor: option.swatchColor,
                    borderColor: isSelected
                      ? themeColors.primary
                      : themeColors.border,
                    borderWidth: isSelected ? 3 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {isSelected && (
                  <Check
                    color={contrastingColor(option.swatchColor)}
                    size={16}
                    strokeWidth={3}
                  />
                )}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityHint={t("scheduleForm.color.customOptionHint")}
          accessibilityLabel={t("scheduleForm.color.customOption")}
          accessibilityRole="radio"
          accessibilityState={{ checked: isCustomSelected }}
          onPress={() => setIsPickerVisible(true)}
          style={({ pressed }) => [
            styles.presetButton,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.preset,
              {
                borderColor: isCustomSelected
                  ? themeColors.primary
                  : themeColors.border,
                borderWidth: isCustomSelected ? 3 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Svg
              height="100%"
              pointerEvents="none"
              viewBox="0 0 32 32"
              width="100%"
            >
              <Defs>
                <LinearGradient
                  id="custom-color-base"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor="#FF006E" />
                  <Stop offset="0.35" stopColor="#FF5A00" />
                  <Stop offset="0.68" stopColor="#FFE600" />
                  <Stop offset="1" stopColor="#45E56B" />
                </LinearGradient>
                <RadialGradient
                  cx="100%"
                  cy="0%"
                  fx="100%"
                  fy="0%"
                  id="custom-color-purple"
                  r="100%"
                >
                  <Stop offset="0" stopColor="#8E3DE0" />
                  <Stop offset="1" stopColor="#8E3DE0" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient
                  cx="100%"
                  cy="100%"
                  fx="100%"
                  fy="100%"
                  id="custom-color-blue"
                  r="100%"
                >
                  <Stop offset="0" stopColor="#00A8E8" />
                  <Stop offset="1" stopColor="#00A8E8" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="16" cy="16" fill="url(#custom-color-base)" r="16" />
              <Circle cx="16" cy="16" fill="url(#custom-color-purple)" r="16" />
              <Circle cx="16" cy="16" fill="url(#custom-color-blue)" r="16" />
            </Svg>

            {isCustomSelected && (
              <View pointerEvents="none" style={styles.customCheck}>
                <Check color="#FFFFFF" size={16} strokeWidth={3} />
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <CustomColorPicker
        colorHex={colorHex}
        onChange={selectCustomColor}
        onClose={() => setIsPickerVisible(false)}
        visible={isPickerVisible}
      />
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    customCheck: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    field: {
      gap: spacing.xs,
    },
    fieldLabel: {
      color: themeColors.text,
    },
    preset: {
      alignItems: "center",
      borderRadius: borderRadius.pill,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    presetButton: {
      alignItems: "center",
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    presets: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xxs,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
