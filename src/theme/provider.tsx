import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { type ThemeColors, themeColors } from "./colors";
import {
  type ResolvedTheme,
  resolveTheme,
  resolveThemePreference,
  type ThemePreference,
} from "./preference";

const THEME_STORAGE_KEY = "ttokttak:theme";

type ThemeContextValue = {
  colors: ThemeColors;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  themePreference: ThemePreference;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const colorScheme = useColorScheme();

  const [themePreference, setPreference] = useState<ThemePreference>("system");

  // 마지막으로 읽거나 저장한 값을 기록해 늦게 끝난 초기 로딩이 사용자 선택을 덮지 않게 한다.
  const storedPreferenceRef = useRef<ThemePreference | null>(null);
  const resolvedTheme = resolveTheme({
    colorScheme,
    preference: themePreference,
  });

  async function setThemePreference(
    nextPreference: ThemePreference
  ): Promise<void> {
    if (storedPreferenceRef.current === nextPreference) {
      return;
    }

    // 저장에 실패하면 현재 화면을 유지하고, 성공한 값만 화면에 적용한다.
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    storedPreferenceRef.current = nextPreference;
    setPreference(nextPreference);
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateTheme(): Promise<void> {
      let initialPreference: ThemePreference;

      try {
        initialPreference = resolveThemePreference(
          await AsyncStorage.getItem(THEME_STORAGE_KEY)
        );
      } catch {
        // 저장소를 읽지 못해도 앱 진입을 막지 않고 기기 설정을 따른다.
        initialPreference = "system";
      }

      if (!isMounted || storedPreferenceRef.current !== null) {
        return;
      }

      storedPreferenceRef.current = initialPreference;
      setPreference(initialPreference);
    }

    void hydrateTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = {
    colors: themeColors[resolvedTheme],
    resolvedTheme,
    setThemePreference,
    themePreference,
  };

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);

  if (!context) {
    throw new Error("ThemeProvider 안에서만 테마를 사용할 수 있습니다.");
  }

  return context;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
