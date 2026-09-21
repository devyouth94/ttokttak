import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { Check } from "lucide-react-native";

import { useAppLanguage } from "~/i18n/provider";
import {
  contrastingColor,
  getColorOptions,
  hexToHsv,
  hsvToHex,
  normalizeColorHex,
} from "~/schedule/display/color";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

import type { ScheduleFormScreenStyles } from "./styles";

export function ColorField({
  selected,
  styles: screenStyles,
  onSelect,
}: {
  selected: string;
  styles: ScheduleFormScreenStyles;
  onSelect: (colorHex: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();
  const colorHex = normalizeColorHex(selected);
  const color = hexToHsv(colorHex);
  const colorOptions = getColorOptions(language);
  const selectedPreset = colorOptions.find(
    (option) => option.swatchColor === colorHex
  )?.value;
  const [hue, setHue] = useState(color.hue);
  const [isCustomSelected, setIsCustomSelected] = useState(
    selectedPreset === undefined
  );
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [planeSize, setPlaneSize] = useState({ height: 0, width: 0 });
  const [hueWidth, setHueWidth] = useState(0);
  const previousColorHex = useRef(colorHex);

  useEffect(() => {
    if (color.saturation > 0) {
      setHue(color.hue);
    }
  }, [color.hue, color.saturation]);

  useEffect(() => {
    const didColorChange = previousColorHex.current !== colorHex;
    previousColorHex.current = colorHex;

    if (didColorChange && !isPickerVisible) {
      setIsCustomSelected(selectedPreset === undefined);
    }
  }, [colorHex, isPickerVisible, selectedPreset]);

  function selectCustomColor(nextColor: string): void {
    setIsCustomSelected(true);
    onSelect(nextColor);
  }

  function selectSaturationAndValue(event: GestureResponderEvent): void {
    if (!planeSize.width || !planeSize.height) {
      return;
    }

    selectCustomColor(
      hsvToHex({
        hue,
        saturation: ratio(event.nativeEvent.locationX, planeSize.width),
        value: 1 - ratio(event.nativeEvent.locationY, planeSize.height),
      })
    );
  }

  function selectHue(event: GestureResponderEvent): void {
    if (!hueWidth) {
      return;
    }

    const nextHue = ratio(event.nativeEvent.locationX, hueWidth) * 360;
    setHue(nextHue);
    selectCustomColor(hsvToHex({ ...color, hue: nextHue }));
  }

  function adjustPlane(actionName: string): void {
    const step = 0.1;

    if (actionName === "increment") {
      selectCustomColor(hsvToHex({ ...color, hue, value: color.value + step }));
    } else if (actionName === "decrement") {
      selectCustomColor(hsvToHex({ ...color, hue, value: color.value - step }));
    } else if (actionName === "increaseSaturation") {
      selectCustomColor(
        hsvToHex({ ...color, hue, saturation: color.saturation + step })
      );
    } else if (actionName === "decreaseSaturation") {
      selectCustomColor(
        hsvToHex({ ...color, hue, saturation: color.saturation - step })
      );
    }
  }

  function adjustHue(actionName: string): void {
    const direction = actionName === "increment" ? 1 : -1;
    const nextHue = (hue + direction * 15 + 360) % 360;

    setHue(nextHue);
    selectCustomColor(hsvToHex({ ...color, hue: nextHue }));
  }

  return (
    <View style={screenStyles.field}>
      <AppText style={screenStyles.fieldLabel} variant="body2">
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
              onPress={() => {
                setIsCustomSelected(false);
                onSelect(option.swatchColor);
              }}
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

      <Modal
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
        transparent
        visible={isPickerVisible}
      >
        <Pressable
          onPress={() => setIsPickerVisible(false)}
          style={screenStyles.pickerModalBackdrop}
        >
          <Pressable style={screenStyles.pickerModalCard}>
            <View style={screenStyles.pickerModalHeader}>
              <View style={screenStyles.pickerModalTextButton} />
              <AppText style={screenStyles.pickerModalTitle} variant="body2">
                {t("scheduleForm.color.customTitle")}
              </AppText>
              <Pressable
                accessibilityLabel={t("scheduleForm.actions.done")}
                accessibilityRole="button"
                onPress={() => setIsPickerVisible(false)}
                style={({ pressed }) => [
                  screenStyles.pickerModalTextButton,
                  pressed ? screenStyles.inlineActionPressed : undefined,
                ]}
              >
                <AppText
                  style={screenStyles.pickerModalConfirmText}
                  variant="body2"
                >
                  {t("scheduleForm.actions.done")}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.pickerContent}>
              <View
                accessible
                accessibilityActions={[
                  { name: "increment" },
                  { name: "decrement" },
                  {
                    label: t("scheduleForm.color.increaseSaturation"),
                    name: "increaseSaturation",
                  },
                  {
                    label: t("scheduleForm.color.decreaseSaturation"),
                    name: "decreaseSaturation",
                  },
                ]}
                accessibilityLabel={t("scheduleForm.color.planeLabel")}
                accessibilityRole="adjustable"
                accessibilityValue={{
                  text: t("scheduleForm.color.planeValue", {
                    brightness: Math.round(color.value * 100),
                    saturation: Math.round(color.saturation * 100),
                  }),
                }}
                onAccessibilityAction={(event) =>
                  adjustPlane(event.nativeEvent.actionName)
                }
                onLayout={(event) => setPlaneSize(event.nativeEvent.layout)}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={selectSaturationAndValue}
                onResponderMove={selectSaturationAndValue}
                onResponderTerminationRequest={() => false}
                onStartShouldSetResponder={() => true}
                style={[
                  styles.plane,
                  {
                    backgroundColor: hsvToHex({
                      hue,
                      saturation: 1,
                      value: 1,
                    }),
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Svg height="100%" pointerEvents="none" width="100%">
                  <Defs>
                    <LinearGradient
                      id="color-white"
                      x1="0"
                      x2="1"
                      y1="0"
                      y2="0"
                    >
                      <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                      <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                    </LinearGradient>
                    <LinearGradient
                      id="color-black"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                      <Stop offset="1" stopColor="#000000" stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  <Rect fill="url(#color-white)" height="100%" width="100%" />
                  <Rect fill="url(#color-black)" height="100%" width="100%" />
                </Svg>
                <View
                  pointerEvents="none"
                  style={[
                    styles.planeHandle,
                    {
                      backgroundColor: colorHex,
                      left: markerPosition(
                        color.saturation * planeSize.width,
                        planeSize.width,
                        12
                      ),
                      top: markerPosition(
                        (1 - color.value) * planeSize.height,
                        planeSize.height,
                        12
                      ),
                    },
                  ]}
                />
              </View>

              <View
                accessible
                accessibilityActions={[
                  { name: "increment" },
                  { name: "decrement" },
                ]}
                accessibilityLabel={t("scheduleForm.color.hueLabel")}
                accessibilityRole="adjustable"
                accessibilityValue={{
                  min: 0,
                  max: 360,
                  now: Math.round(hue),
                }}
                onAccessibilityAction={(event) =>
                  adjustHue(event.nativeEvent.actionName)
                }
                onLayout={(event) =>
                  setHueWidth(event.nativeEvent.layout.width)
                }
                onMoveShouldSetResponder={() => true}
                onResponderGrant={selectHue}
                onResponderMove={selectHue}
                onResponderTerminationRequest={() => false}
                onStartShouldSetResponder={() => true}
                style={[styles.hue, { borderColor: themeColors.border }]}
              >
                <Svg height="100%" pointerEvents="none" width="100%">
                  <Defs>
                    <LinearGradient id="color-hue" x1="0" x2="1" y1="0" y2="0">
                      <Stop offset="0" stopColor="#FF0000" />
                      <Stop offset="0.167" stopColor="#FFFF00" />
                      <Stop offset="0.333" stopColor="#00FF00" />
                      <Stop offset="0.5" stopColor="#00FFFF" />
                      <Stop offset="0.667" stopColor="#0000FF" />
                      <Stop offset="0.833" stopColor="#FF00FF" />
                      <Stop offset="1" stopColor="#FF0000" />
                    </LinearGradient>
                  </Defs>
                  <Rect fill="url(#color-hue)" height="100%" width="100%" />
                </Svg>
                <View
                  pointerEvents="none"
                  style={[
                    styles.hueHandle,
                    {
                      backgroundColor: hsvToHex({
                        hue,
                        saturation: 1,
                        value: 1,
                      }),
                      left: markerPosition((hue / 360) * hueWidth, hueWidth, 6),
                    },
                  ]}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ratio(value: number, total: number): number {
  return Math.min(1, Math.max(0, value / total));
}

function markerPosition(value: number, total: number, radius: number): number {
  if (total <= radius * 2) {
    return total / 2;
  }

  return Math.min(total - radius, Math.max(radius, value));
}

const styles = StyleSheet.create({
  customCheck: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  hue: {
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 28,
    overflow: "hidden",
  },
  hueHandle: {
    borderColor: "#FFFFFF",
    borderRadius: borderRadius.pill,
    borderWidth: 3,
    height: 28,
    marginLeft: -6,
    position: "absolute",
    top: -1,
    width: 12,
  },
  plane: {
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 156,
    overflow: "hidden",
  },
  planeHandle: {
    borderColor: "#FFFFFF",
    borderRadius: borderRadius.pill,
    borderWidth: 3,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    position: "absolute",
    width: 24,
  },
  pickerContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
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
