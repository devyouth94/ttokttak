import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppThemeColors } from "~/shared/theme";

type AppScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  safeAreaStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({
  children,
  contentStyle,
  safeAreaStyle,
}: AppScreenProps): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        styles.safeArea,
        { backgroundColor: themeColors.background },
        safeAreaStyle,
      ]}
    >
      <View
        style={[
          styles.content,
          { backgroundColor: themeColors.background },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
