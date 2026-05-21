import { Stack } from "expo-router";

import { mainTabStackScreenOptions } from "~/application/navigation";

export default function HomeStackLayout(): React.JSX.Element {
  return <Stack screenOptions={mainTabStackScreenOptions} />;
}
