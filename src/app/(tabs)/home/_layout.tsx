import { Stack } from "expo-router";

export default function HomeStackLayout(): React.JSX.Element {
  return <Stack screenOptions={{ animation: "default", headerShown: false }} />;
}
