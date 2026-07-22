import { createContext, useContext } from "react";

import type { ThemeColors } from "./colors";
import type { ResolvedTheme, ThemePreference } from "./preference";

type ThemeContextValue = {
  colors: ThemeColors;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  themePreference: ThemePreference;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("ThemeProvider 안에서만 테마를 사용할 수 있습니다.");
  }

  return context;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
