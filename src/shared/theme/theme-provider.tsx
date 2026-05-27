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
import {
  completeAppThemePreferenceMutation,
  createAppThemeHydrationState,
  failAppThemePreferenceMutation,
  recordHydratedAppThemePreference,
  startAppThemePreferenceMutation,
} from "./app-theme-hydration";
import { readStoredAppThemePreference } from "./app-theme-storage";
import { AppThemeContext, type AppThemeContextValue } from "./theme-context";

export function AppThemeProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const colorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<AppThemePreference>(fallbackAppThemePreference);
  const themePreferenceRef = useRef(themePreference);
  const hydrationStateRef = useRef(createAppThemeHydrationState());

  useEffect(() => {
    themePreferenceRef.current = themePreference;
  }, [themePreference]);

  useEffect(() => {
    let isMounted = true;

    void resolveInitialAppThemePreference({
      readStoredPreference: readStoredAppThemePreference,
    }).then((initialPreference) => {
      const hydrationResult = recordHydratedAppThemePreference(
        hydrationStateRef.current,
        initialPreference
      );

      hydrationStateRef.current = hydrationResult.nextState;

      if (isMounted && hydrationResult.shouldApplyHydratedPreference) {
        setThemePreferenceState(initialPreference);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemePreference = useCallback(
    async (nextPreference: AppThemePreference) => {
      hydrationStateRef.current = startAppThemePreferenceMutation(
        hydrationStateRef.current
      );

      try {
        await changeAppThemePreference({
          applyPreference: async (preference) => {
            setThemePreferenceState(preference);
          },
          currentPreference: themePreferenceRef.current,
          nextPreference,
        });

        hydrationStateRef.current = completeAppThemePreferenceMutation(
          hydrationStateRef.current
        );
      } catch (error) {
        const failureResult = failAppThemePreferenceMutation(
          hydrationStateRef.current
        );

        hydrationStateRef.current = failureResult.nextState;

        if (failureResult.hydratedPreferenceToRestore) {
          setThemePreferenceState(failureResult.hydratedPreferenceToRestore);
        }

        throw error;
      }
    },
    []
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
