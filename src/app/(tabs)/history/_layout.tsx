import { Stack } from "expo-router";

export default function HistoryStackLayout(): React.JSX.Element {
  return <Stack screenOptions={{ animation: "default", headerShown: false }} />;
}
