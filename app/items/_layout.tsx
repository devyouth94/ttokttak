import { Stack } from "expo-router";

import { useThemeColors } from "~/theme/context";

export default function ItemsStackLayout(): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: themeColors.background },
        headerShown: false,
      }}
    />
  );
}
