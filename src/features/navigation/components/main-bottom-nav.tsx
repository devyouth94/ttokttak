import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Href, router, usePathname } from "expo-router";
import {
  CalendarDays,
  House,
  ListTodo,
  Plus,
  Settings2,
} from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { color, spacing } from "~/design-system/tokens";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";

type MainTabKey = "home" | "calendar" | "schedule" | "settings";

type MainTabItem = {
  href: Href;
  icon: typeof House;
  key: MainTabKey;
  label: string;
};

type MainBottomNavItemProps = {
  isActive: boolean;
  item: MainTabItem;
};

const TAB_ITEMS: MainTabItem[] = [
  { href: "/(tabs)/home", icon: House, key: "home", label: "홈" },
  { href: "/(tabs)/schedule", icon: ListTodo, key: "schedule", label: "목록" },
  {
    href: "/(tabs)/calendar",
    icon: CalendarDays,
    key: "calendar",
    label: "캘린더",
  },
  { href: "/(tabs)/settings", icon: Settings2, key: "settings", label: "설정" },
];

function resolveIsActive(pathname: string, key: MainTabKey): boolean {
  if (pathname === "/") {
    return key === "home";
  }

  return pathname === `/${key}` || pathname.startsWith(`/${key}/`);
}

export function MainBottomNav(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

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
        {TAB_ITEMS.slice(0, 2).map((item) => (
          <MainBottomNavItem
            isActive={resolveIsActive(pathname, item.key)}
            item={item}
            key={item.key}
          />
        ))}
        <View pointerEvents="none" style={styles.createSlot} />
        {TAB_ITEMS.slice(2).map((item) => (
          <MainBottomNavItem
            isActive={resolveIsActive(pathname, item.key)}
            item={item}
            key={item.key}
          />
        ))}
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
        <Plus color={color.jetBlack} size={28} />
      </Pressable>
    </View>
  );
}

function MainBottomNavItem({
  isActive,
  item,
}: MainBottomNavItemProps): React.JSX.Element {
  const Icon = item.icon;

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      hitSlop={8}
      onPress={() => {
        if (isActive) {
          router.dismissTo(item.href);
          return;
        }

        router.navigate(item.href);
      }}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={styles.icon}>
        <Icon color={isActive ? color.white : color.gray} size={22} />
      </View>
      <AppText
        numberOfLines={1}
        style={[styles.label, isActive && styles.labelActive]}
        variant="caption"
      >
        {item.label}
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
    backgroundColor: color.jetBlack,
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
    backgroundColor: color.white,
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
    color: color.gray,
    marginTop: spacing.xxs,
    textAlign: "center",
  },
  labelActive: {
    color: color.white,
  },
});
