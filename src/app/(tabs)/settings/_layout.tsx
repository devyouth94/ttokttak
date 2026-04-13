import { Stack } from "expo-router";

export default function SettingsStackLayout(): React.JSX.Element {
  return <Stack screenOptions={{ animation: "default", headerShown: false }} />;
}
