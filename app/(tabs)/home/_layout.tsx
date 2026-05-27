import { Stack } from "expo-router";

import { createMainTabStackScreenOptions } from "~/application/navigation";
import { useAppThemeColors } from "~/shared/theme";

export default function HomeStackLayout(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={createMainTabStackScreenOptions({
        backgroundColor: themeColors.background,
      })}
    />
  );
}
