import { Platform, StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { colors } from "~/design-system/tokens";

type MainTabIconProps = {
  focused: boolean;
  icon: LucideIcon;
};

export function MainTabIcon({
  focused,
  icon: Icon,
}: MainTabIconProps): React.JSX.Element {
  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <Icon
        color={focused ? colors.primaryForeground : "#CFCFD4"}
        size={focused ? 18 : 17}
        strokeWidth={2.2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  containerFocused: {
    backgroundColor: "#373535",
    borderRadius: 20,
    height: 40,
    width: 40,
    ...Platform.select({
      android: {
        elevation: 2,
        shadowColor: "#000000",
      },
      ios: {
        shadowColor: "#000000",
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      default: {},
    }),
  },
});
