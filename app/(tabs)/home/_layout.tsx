import { Stack } from "expo-router";

import { mainTabStackScreenOptions } from "~/features/navigation";

export default function HomeStackLayout(): React.JSX.Element {
  return <Stack screenOptions={mainTabStackScreenOptions} />;
}
