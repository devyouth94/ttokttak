import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Href, router, usePathname } from "expo-router";
import {
  CalendarDays,
  House,
  ListTodo,
  Plus,
  Settings2,
} from "lucide-react-native";

import { borderRadius, colors, spacing } from "~/design-system/tokens";
import { MainTabIcon } from "~/features/navigation/components/main-tab-icon";

type MainTabKey = "home" | "calendar" | "schedule" | "settings";

type MainTabItem = {
  href: Href;
  icon: typeof House;
  key: MainTabKey;
};

const TAB_BAR_HEIGHT = 60;
const TAB_PANEL_TOP_OFFSET = 0;
const CREATE_BUTTON_BOTTOM_OFFSET = TAB_BAR_HEIGHT + spacing.lg;

const TAB_ITEMS: MainTabItem[] = [
  { href: "/(tabs)/home", icon: House, key: "home" },
  { href: "/(tabs)/schedule", icon: ListTodo, key: "schedule" },
  { href: "/(tabs)/calendar", icon: CalendarDays, key: "calendar" },
  { href: "/(tabs)/settings", icon: Settings2, key: "settings" },
];

export function MainBottomNav(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const showCreateButton = pathname === "/home" || pathname === "/schedule";

  return (
    <View
      style={[
        styles.wrapper,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
        },
      ]}
    >
      {Platform.OS === "android" ? (
        <View
          style={[
            styles.panelAmbient,
            {
              bottom: 0,
              top: TAB_PANEL_TOP_OFFSET + 6,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.panel,
          {
            bottom: 0,
            top: TAB_PANEL_TOP_OFFSET,
          },
        ]}
      />
      <View style={styles.content}>
        {TAB_ITEMS.map((item) => {
          const isActive = resolveIsActive(pathname, item.key);

          return (
            <Pressable
              accessibilityLabel={resolveLabel(item.key)}
              accessibilityRole="button"
              key={item.key}
              onPress={() => {
                if (isActive) {
                  router.dismissTo(item.href);
                  return;
                }

                router.navigate(item.href);
              }}
              style={styles.item}
            >
              <View style={styles.iconSlot}>
                <MainTabIcon focused={isActive} icon={item.icon} />
              </View>
            </Pressable>
          );
        })}
      </View>
      {showCreateButton ? (
        <Pressable
          accessibilityLabel="항목 생성"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => {
            router.push({
              params: { returnTo: pathname },
              pathname: "/items/new",
            });
          }}
          style={[
            styles.createButton,
            {
              bottom: insets.bottom + CREATE_BUTTON_BOTTOM_OFFSET,
            },
          ]}
        >
          <Plus color={colors.primaryForeground} size={28} />
        </Pressable>
      ) : null}
    </View>
  );
}

function resolveIsActive(pathname: string, key: MainTabKey): boolean {
  if (pathname === "/") {
    return key === "home";
  }

  return pathname === `/${key}` || pathname.startsWith(`/${key}/`);
}

function resolveLabel(key: MainTabKey): string {
  switch (key) {
    case "home":
      return "홈";
    case "calendar":
      return "캘린더";
    case "schedule":
      return "목록";
    case "settings":
      return "설정";
  }
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    overflow: "visible",
    position: "relative",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    elevation: 10,
    left: 0,
    position: "absolute",
    right: 0,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.04,
    shadowRadius: 18,
  },
  panelAmbient: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    elevation: 18,
    left: -8,
    opacity: 0.9,
    position: "absolute",
    right: -8,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    left: 0,
    paddingHorizontal: 20,
    position: "absolute",
    right: 0,
    top: 0,
  },
  item: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  iconSlot: {
    alignItems: "center",
    height: TAB_BAR_HEIGHT,
    justifyContent: "center",
    width: "100%",
  },
  createButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.outlineSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
    height: 64,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    width: 64,
    zIndex: 2,
    ...Platform.select({
      android: {
        elevation: 2,
        shadowColor: "#000000",
      },
      ios: {
        shadowColor: "#000000",
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
});
