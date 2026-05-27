import { Stack } from "expo-router";

import { createMainTabStackScreenOptions } from "~/application/navigation";
import { useAppThemeColors } from "~/shared/theme/theme-context";

export default function ScheduleStackLayout(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <Stack
      screenOptions={createMainTabStackScreenOptions({
        backgroundColor: themeColors.background,
      })}
    />
  );
}
