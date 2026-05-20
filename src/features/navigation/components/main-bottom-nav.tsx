import { Pressable, StyleSheet, View } from "react-native";
import { router, usePathname } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  CalendarDays,
  House,
  ListTodo,
  Plus,
  Settings2,
} from "lucide-react-native";

import { pressMainBottomNavRoute } from "~/features/navigation/components/main-bottom-nav.helpers";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";
import { AppText } from "~/shared/ui/app-text";
import { colors, spacing } from "~/shared/ui/tokens";

type MainTabKey = "home" | "calendar" | "schedule" | "settings";

type MainTabItem = {
  icon: typeof House;
  key: MainTabKey;
  label: string;
};

type MainBottomNavItemProps = {
  isActive: boolean;
  item: MainTabItem;
  label: string;
  navigation: BottomTabBarProps["navigation"];
  route: BottomTabBarProps["state"]["routes"][number];
  stateKey: string;
};

type MainBottomNavProps = BottomTabBarProps & {
  isVisible?: boolean;
};

type MainBottomNavRoute = BottomTabBarProps["state"]["routes"][number];
type MainTabRoute = MainBottomNavRoute & { name: MainTabKey };

const MAIN_TAB_KEYS = ["home", "schedule", "calendar", "settings"] as const;

const TAB_ITEMS: Record<MainTabKey, MainTabItem> = {
  calendar: { icon: CalendarDays, key: "calendar", label: "캘린더" },
  home: { icon: House, key: "home", label: "홈" },
  schedule: { icon: ListTodo, key: "schedule", label: "목록" },
  settings: { icon: Settings2, key: "settings", label: "설정" },
};

function isMainTabKey(value: string): value is MainTabKey {
  return MAIN_TAB_KEYS.includes(value as MainTabKey);
}

function isMainTabRoute(route: MainBottomNavRoute): route is MainTabRoute {
  return isMainTabKey(route.name);
}

function resolveTabLabel(
  item: MainTabItem,
  options: BottomTabBarProps["descriptors"][string]["options"]
): string {
  if (typeof options.tabBarLabel === "string") {
    return options.tabBarLabel;
  }

  if (typeof options.title === "string") {
    return options.title;
  }

  return item.label;
}

export function MainBottomNav({
  descriptors,
  insets,
  isVisible = true,
  navigation,
  state,
}: MainBottomNavProps): React.JSX.Element | null {
  const pathname = usePathname();
  const routes = state.routes.filter(isMainTabRoute);

  if (!isVisible) {
    return null;
  }

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
      <View style={styles.panel}>
        {routes.slice(0, 2).map((route) => {
          const item = TAB_ITEMS[route.name];

          return (
            <MainBottomNavItem
              isActive={state.routes[state.index]?.key === route.key}
              item={item}
              key={route.key}
              label={resolveTabLabel(item, descriptors[route.key].options)}
              navigation={navigation}
              route={route}
              stateKey={state.key}
            />
          );
        })}
        <View pointerEvents="none" style={styles.createSlot} />
        {routes.slice(2).map((route) => {
          const item = TAB_ITEMS[route.name];

          return (
            <MainBottomNavItem
              isActive={state.routes[state.index]?.key === route.key}
              item={item}
              key={route.key}
              label={resolveTabLabel(item, descriptors[route.key].options)}
              navigation={navigation}
              route={route}
              stateKey={state.key}
            />
          );
        })}
      </View>
      <Pressable
        accessibilityHint="일정 만들기 화면으로 이동해요."
        accessibilityLabel="일정 추가"
        accessibilityRole="button"
        onPress={() => {
          router.push({
            params: { returnTo: pathname },
            pathname: "/items/new",
          });
        }}
        style={({ pressed }) => [
          styles.createButton,
          pressed && styles.createButtonPressed,
        ]}
      >
        <Plus color={colors.text} size={28} />
      </Pressable>
    </View>
  );
}

function MainBottomNavItem({
  isActive,
  item,
  label,
  navigation,
  route,
  stateKey,
}: MainBottomNavItemProps): React.JSX.Element {
  const Icon = item.icon;

  return (
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
        pressMainBottomNavRoute({
          isFocused: isActive,
          navigation,
          route,
          stateKey,
        });
      }}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={styles.icon}>
        <Icon
          color={isActive ? colors.primaryForeground : colors.textSoft}
          size={22}
        />
      </View>
      <AppText
        numberOfLines={1}
        style={[styles.label, isActive && styles.labelActive]}
        variant="caption"
      >
        {label}
      </AppText>
    </Pressable>
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
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
    color: colors.textSoft,
    marginTop: spacing.xxs,
    textAlign: "center",
  },
  labelActive: {
    color: colors.primaryForeground,
  },
});
