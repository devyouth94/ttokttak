import { Stack } from "expo-router";

import { mainTabStackScreenOptions } from "~/features/navigation";

export default function ScheduleStackLayout(): React.JSX.Element {
  return <Stack screenOptions={mainTabStackScreenOptions} />;
}
