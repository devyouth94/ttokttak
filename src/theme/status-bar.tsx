import { StatusBar } from "expo-status-bar";

import { useTheme } from "./provider";

export function ThemeStatusBar(): React.JSX.Element {
  const { resolvedTheme } = useTheme();

  return <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />;
}
