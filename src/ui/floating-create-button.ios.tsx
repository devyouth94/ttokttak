import { useTranslation } from "react-i18next";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Button, Host } from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  background,
  buttonStyle,
  controlSize,
  foregroundColor,
  frame,
  glassEffect,
  labelStyle,
  shapes,
} from "@expo/ui/swift-ui/modifiers";

import { useThemeColors } from "~/theme/provider";
import { spacing } from "~/ui/tokens";

const isLiquidGlassAvailable =
  Number.parseInt(String(Platform.Version), 10) >= 26;

export function FloatingCreateButton(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const themeColors = useThemeColors();

  return (
    <Host
      matchContents
      style={[
        styles.host,
        {
          bottom: insets.bottom + 96,
          right: spacing.md + spacing.xxs,
        },
      ]}
    >
      <Button
        label={t("navigation.createItemLabel")}
        modifiers={[
          buttonStyle("plain"),
          controlSize("extraLarge"),
          frame({ height: 48, width: 48 }),
          ...(isLiquidGlassAvailable
            ? [
                glassEffect({
                  glass: {
                    interactive: true,
                    tint: themeColors.primary,
                    variant: "regular",
                  },
                  shape: "circle",
                }),
              ]
            : [background(themeColors.primary, shapes.circle())]),
          foregroundColor(themeColors.primaryForeground),
          labelStyle("iconOnly"),
          accessibilityHint(t("navigation.createItemHint")),
        ]}
        onPress={() => {
          router.push({
            params: { returnTo: pathname },
            pathname: "/items/new",
          });
        }}
        systemImage="plus"
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    zIndex: 1,
  },
});
