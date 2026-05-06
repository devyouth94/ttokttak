import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "~/design-system/tokens";

type AppScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  safeAreaStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({
  children,
  contentStyle,
  safeAreaStyle,
}: AppScreenProps): React.JSX.Element {
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, safeAreaStyle]}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
