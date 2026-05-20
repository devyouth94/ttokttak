import { Stack } from "expo-router";

import { mainTabStackScreenOptions } from "~/features/navigation";

export default function CalendarStackLayout(): React.JSX.Element {
  return <Stack screenOptions={mainTabStackScreenOptions} />;
}
