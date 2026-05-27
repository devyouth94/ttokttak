import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import {
  type AppThemePreference,
  fallbackAppThemePreference,
  resolveAppTheme,
  resolveInitialAppThemePreference,
} from "./app-theme";
import { changeAppThemePreference } from "./app-theme-change";
import { getAppThemeColors } from "./app-theme-colors";
import { readStoredAppThemePreference } from "./app-theme-storage";
import { AppThemeContext, type AppThemeContextValue } from "./theme-context";

export function AppThemeProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const colorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<AppThemePreference>(fallbackAppThemePreference);
  const didUserChooseThemePreferenceRef = useRef(false);
  const themePreferenceRef = useRef(themePreference);

  const applyThemePreference = useCallback((preference: AppThemePreference) => {
    themePreferenceRef.current = preference;
    setThemePreferenceState(preference);
  }, []);

  useEffect(() => {
    let isMounted = true;

    void resolveInitialAppThemePreference({
      readStoredPreference: readStoredAppThemePreference,
    }).then((initialPreference) => {
      if (isMounted && !didUserChooseThemePreferenceRef.current) {
        applyThemePreference(initialPreference);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [applyThemePreference]);

  const setThemePreference = useCallback(
    async (nextPreference: AppThemePreference) => {
      didUserChooseThemePreferenceRef.current = true;

      await changeAppThemePreference({
        applyPreference: async (preference) => {
          applyThemePreference(preference);
        },
        currentPreference: themePreferenceRef.current,
        nextPreference,
      });
    },
    [applyThemePreference]
  );

  const value = useMemo<AppThemeContextValue>(() => {
    const resolvedTheme = resolveAppTheme({
      colorScheme,
      preference: themePreference,
    });

    return {
      colors: getAppThemeColors(resolvedTheme),
      resolvedTheme,
      setThemePreference,
      themePreference,
    };
  }, [colorScheme, setThemePreference, themePreference]);

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}
