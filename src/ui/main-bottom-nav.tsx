import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { router, usePathname } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import {
  CalendarDays,
  House,
  ListTodo,
  Plus,
  Settings2,
} from "lucide-react-native";

import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { spacing } from "~/ui/tokens";

export const MAIN_BOTTOM_NAV_RESERVED_HEIGHT = 92;
const IOS_MAIN_TAB_CONTENT_BOTTOM_INSET = 160;

export function getMainTabContentBottomInset(safeAreaBottom: number): number {
  return Platform.OS === "ios"
    ? IOS_MAIN_TAB_CONTENT_BOTTOM_INSET
    : MAIN_BOTTOM_NAV_RESERVED_HEIGHT + safeAreaBottom;
}

const TAB_ICONS = {
  calendar: CalendarDays,
  home: House,
  schedule: ListTodo,
  settings: Settings2,
} as const;

export function MainBottomNav({
  descriptors,
  insets,
  navigation,
  state,
}: BottomTabBarProps): React.JSX.Element {
  const pathname = usePathname();
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          height: MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom,
        },
      ]}
    >
      <View style={[styles.panel, { backgroundColor: themeColors.primary }]}>
        {state.routes.map((route, index) => {
          const Icon = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
          const isActive = state.routes[state.index]?.key === route.key;
          const options = descriptors[route.key].options;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);

          if (!Icon) {
            return null;
          }

          return (
            <Fragment key={route.key}>
              {index === 2 && (
                <View pointerEvents="none" style={styles.createSlot} />
              )}

              <Pressable
                accessibilityLabel={label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                hitSlop={8}
                onLongPress={() => {
                  navigation.emit({
                    target: route.key,
                    type: "tabLongPress",
                  });
                }}
                onPress={() => {
                  const event = navigation.emit({
                    canPreventDefault: true,
                    target: route.key,
                    type: "tabPress",
                  });

                  if (!isActive && !event.defaultPrevented) {
                    navigation.dispatch({
                      ...CommonActions.navigate(route),
                      target: state.key,
                    });
                  }
                }}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
              >
                <View style={styles.icon}>
                  <Icon
                    color={
                      isActive
                        ? themeColors.primaryForeground
                        : themeColors.textSoft
                    }
                    size={22}
                  />
                </View>
                <AppText
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      color: isActive
                        ? themeColors.primaryForeground
                        : themeColors.textSoft,
                    },
                  ]}
                  variant="caption"
                >
                  {label}
                </AppText>
              </Pressable>
            </Fragment>
          );
        })}
      </View>

      <Pressable
        accessibilityHint={t("navigation.createItemHint")}
        accessibilityLabel={t("navigation.createItemLabel")}
        accessibilityRole="button"
        onPress={() => {
          router.push({
            params: { returnTo: pathname },
            pathname: "/items/new",
          });
        }}
        style={({ pressed }) => [
          styles.createButton,
          { backgroundColor: themeColors.surface },
          pressed && styles.createButtonPressed,
        ]}
      >
        <Plus color={themeColors.text} size={28} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    overflow: "visible",
    position: "absolute",
    right: 0,
  },
  panel: {
    alignItems: "center",
    borderRadius: 30,
    flexDirection: "row",
    height: 60,
    left: 16,
    paddingHorizontal: 8,
    position: "absolute",
    right: 16,
    top: 24,
    zIndex: 2,
  },
  createButton: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    left: "50%",
    position: "absolute",
    top: 30,
    transform: [{ translateX: -24 }],
    width: 48,
    zIndex: 3,
  },
  createButtonPressed: {
    opacity: 0.9,
  },
  createSlot: {
    flex: 0.9,
  },
  item: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  itemPressed: {
    opacity: 0.72,
  },
  icon: {
    alignItems: "center",
    height: 26,
    justifyContent: "center",
    width: 36,
  },
  label: {
    marginTop: spacing.xxs,
    textAlign: "center",
  },
});
