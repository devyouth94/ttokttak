import { Stack } from "expo-router";

import { useAppThemeColors } from "~/shared/theme";

import {
  createItemsStackScreenOptions,
  createMainTabStackScreenOptions,
  createRootStackScreenOptions,
  mainTabsRootScreenOptions,
} from "../model/main-navigation-options";

export function ThemedRootStack(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={createRootStackScreenOptions({
        backgroundColor: themeColors.background,
      })}
    >
      <Stack.Screen name="(tabs)" options={mainTabsRootScreenOptions} />
    </Stack>
  );
}

export function ThemedMainTabStack(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={createMainTabStackScreenOptions({
        backgroundColor: themeColors.background,
      })}
    />
  );
}

export function ThemedItemsStack(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={createItemsStackScreenOptions({
        backgroundColor: themeColors.background,
      })}
    />
  );
}
