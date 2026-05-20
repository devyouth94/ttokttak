import { Stack } from "expo-router";

import { mainTabStackScreenOptions } from "~/features/navigation/main-navigation-options";

export default function ScheduleStackLayout(): React.JSX.Element {
  return <Stack screenOptions={mainTabStackScreenOptions} />;
}
