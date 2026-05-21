import { Stack } from "expo-router";

import { mainTabStackScreenOptions } from "~/application/navigation";

export default function SettingsStackLayout(): React.JSX.Element {
  return <Stack screenOptions={mainTabStackScreenOptions} />;
}
