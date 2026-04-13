import { Stack } from "expo-router";

export default function CalendarStackLayout(): React.JSX.Element {
  return <Stack screenOptions={{ animation: "default", headerShown: false }} />;
}
