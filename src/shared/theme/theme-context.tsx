import { createContext, useContext } from "react";

import type { AppThemePreference, ResolvedAppTheme } from "./app-theme";
import type { AppThemeColors } from "./app-theme-colors";

export type AppThemeContextValue = {
  colors: AppThemeColors;
  resolvedTheme: ResolvedAppTheme;
  setThemePreference: (preference: AppThemePreference) => Promise<void>;
  themePreference: AppThemePreference;
};

export const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("AppThemeProvider 안에서만 테마를 사용할 수 있습니다.");
  }

  return context;
}

export function useAppThemeColors(): AppThemeColors {
  return useAppTheme().colors;
}
