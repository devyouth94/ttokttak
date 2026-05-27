import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
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
  type ResolvedAppTheme,
  resolveInitialAppThemePreference,
} from "./app-theme";
import { changeAppThemePreference } from "./app-theme-change";
import { readStoredAppThemePreference } from "./app-theme-storage";

type AppThemeContextValue = {
  resolvedTheme: ResolvedAppTheme;
  setThemePreference: (preference: AppThemePreference) => Promise<void>;
  themePreference: AppThemePreference;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const colorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<AppThemePreference>(fallbackAppThemePreference);
  const themePreferenceRef = useRef(themePreference);
  const didChangePreferenceRef = useRef(false);

  useEffect(() => {
    themePreferenceRef.current = themePreference;
  }, [themePreference]);

  useEffect(() => {
    let isMounted = true;

    void resolveInitialAppThemePreference({
      readStoredPreference: readStoredAppThemePreference,
    }).then((initialPreference) => {
      if (isMounted && !didChangePreferenceRef.current) {
        setThemePreferenceState(initialPreference);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemePreference = useCallback(
    async (nextPreference: AppThemePreference) => {
      didChangePreferenceRef.current = true;

      await changeAppThemePreference({
        applyPreference: async (preference) => {
          setThemePreferenceState(preference);
        },
        currentPreference: themePreferenceRef.current,
        nextPreference,
      });
    },
    []
  );

  const value = useMemo<AppThemeContextValue>(
    () => ({
      resolvedTheme: resolveAppTheme({
        colorScheme,
        preference: themePreference,
      }),
      setThemePreference,
      themePreference,
    }),
    [colorScheme, setThemePreference, themePreference]
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("AppThemeProvider 안에서만 테마를 사용할 수 있습니다.");
  }

  return context;
}
