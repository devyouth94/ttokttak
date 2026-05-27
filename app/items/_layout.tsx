import { Stack } from "expo-router";

import { createItemsStackScreenOptions } from "~/application/navigation";
import { useAppThemeColors } from "~/shared/theme/theme-context";

export default function ItemsStackLayout(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={createItemsStackScreenOptions({
        backgroundColor: themeColors.background,
      })}
    />
  );
}
