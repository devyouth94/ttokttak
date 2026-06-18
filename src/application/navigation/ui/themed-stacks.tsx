import { Stack } from "expo-router";

import { useAppThemeColors } from "~/shared/theme";

export function ThemedRootStack(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: themeColors.background,
        },
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export function ThemedMainTabStack(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={{
        animation: "default",
        contentStyle: {
          backgroundColor: themeColors.background,
        },
        gestureEnabled: false,
        headerShown: false,
      }}
    />
  );
}

export function ThemedItemsStack(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={{
        animation: "default",
        contentStyle: {
          backgroundColor: themeColors.background,
        },
        headerShown: false,
      }}
    />
  );
}
