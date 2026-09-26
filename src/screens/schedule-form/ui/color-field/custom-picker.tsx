import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { hexToHsv, hsvToHex } from "~/schedule/display/color";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

export function CustomColorPicker({
  colorHex,
  onChange,
  onClose,
  visible,
}: {
  colorHex: string;
  onChange: (colorHex: string) => void;
  onClose: () => void;
  visible: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const [hue, setHue] = useState(() => hexToHsv(colorHex).hue);
  const [planeSize, setPlaneSize] = useState({ height: 0, width: 0 });
  const [hueWidth, setHueWidth] = useState(0);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const color = hexToHsv(colorHex);

  function selectSaturationAndValue(event: GestureResponderEvent): void {
    if (!planeSize.width || !planeSize.height) {
      return;
    }

    onChange(
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
    onChange(hsvToHex({ ...color, hue: nextHue }));
  }

  function adjustPlane(actionName: string): void {
    const step = 0.1;

    if (actionName === "increment") {
      onChange(hsvToHex({ ...color, hue, value: color.value + step }));
    } else if (actionName === "decrement") {
      onChange(hsvToHex({ ...color, hue, value: color.value - step }));
    } else if (actionName === "increaseSaturation") {
      onChange(
        hsvToHex({ ...color, hue, saturation: color.saturation + step })
      );
    } else if (actionName === "decreaseSaturation") {
      onChange(
        hsvToHex({ ...color, hue, saturation: color.saturation - step })
      );
    }
  }

  function adjustHue(actionName: string): void {
    const direction = actionName === "increment" ? 1 : -1;
    const nextHue = (hue + direction * 15 + 360) % 360;

    setHue(nextHue);
    onChange(hsvToHex({ ...color, hue: nextHue }));
  }

  useEffect(() => {
    if (color.saturation > 0) {
      setHue(color.hue);
    }
  }, [color.hue, color.saturation]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable style={styles.card}>
          <View style={styles.header}>
            <View style={styles.textButton} />
            <AppText style={styles.title} variant="body2">
              {t("scheduleForm.color.customTitle")}
            </AppText>
            <Pressable
              accessibilityLabel={t("scheduleForm.actions.done")}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.textButton,
                pressed ? styles.actionPressed : undefined,
              ]}
            >
              <AppText style={styles.confirmText} variant="body2">
                {t("scheduleForm.actions.done")}
              </AppText>
            </Pressable>
          </View>

          <View style={styles.content}>
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
                  <LinearGradient id="color-white" x1="0" x2="1" y1="0" y2="0">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                  </LinearGradient>
                  <LinearGradient id="color-black" x1="0" x2="0" y1="0" y2="1">
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
              onLayout={(event) => setHueWidth(event.nativeEvent.layout.width)}
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

function createStyles(themeColors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    actionPressed: {
      opacity: 0.72,
    },
    backdrop: {
      backgroundColor: themeColors.scrim,
      flex: 1,
      justifyContent: "flex-end",
    },
    card: {
      backgroundColor: themeColors.background,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      paddingBottom: spacing.lg,
      paddingTop: spacing.sm,
    },
    confirmText: {
      color: themeColors.primary,
      textAlign: "right",
    },
    content: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
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
    textButton: {
      minWidth: 44,
      paddingVertical: spacing.xs,
    },
    title: {
      color: themeColors.text,
    },
  });
}
