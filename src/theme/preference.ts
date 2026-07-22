import type { ColorSchemeName } from "react-native";

export type ResolvedTheme = "light" | "dark";
export type ThemePreference = "system" | ResolvedTheme;

/** 저장값이 없거나 알 수 없는 값이면 안전한 기본값인 시스템 설정을 사용한다. */
export function resolveThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** 사용자 선택과 기기 설정을 바탕으로 실제 적용할 테마를 결정한다. */
export function resolveTheme({
  colorScheme,
  preference,
}: {
  colorScheme: ColorSchemeName | null | undefined;
  preference: ThemePreference;
}): ResolvedTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  // 시스템 설정에서는 다크 모드만 명시적으로 구분하고 나머지는 라이트 모드로 처리한다.
  return colorScheme === "dark" ? "dark" : "light";
}
