import type { AppLanguage } from "~/i18n/language";

export const colorKeys = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
] as const;

export type ColorKey = (typeof colorKeys)[number];

export const defaultColorKey: ColorKey = "red";

export const colorByKey = {
  blue: { swatchColor: "#9DB7F5" },
  green: { swatchColor: "#9FD4A5" },
  indigo: { swatchColor: "#9EA5E8" },
  orange: { swatchColor: "#F4BE8A" },
  purple: { swatchColor: "#D4A8EA" },
  red: { swatchColor: "#F5A3A3" },
  yellow: { swatchColor: "#E8D86A" },
} as const satisfies Record<ColorKey, { swatchColor: string }>;

const colorLabels = {
  en: {
    blue: "Blue",
    green: "Green",
    indigo: "Indigo",
    orange: "Orange",
    purple: "Purple",
    red: "Red",
    yellow: "Yellow",
  },
  ko: {
    blue: "파랑",
    green: "초록",
    indigo: "남색",
    orange: "주황",
    purple: "보라",
    red: "빨강",
    yellow: "노랑",
  },
} as const satisfies Record<AppLanguage, Record<ColorKey, string>>;

/** 일정 색상의 언어별 이름을 반환한다. */
export function getColorLabel(
  colorKey: ColorKey,
  language: AppLanguage = "ko"
): string {
  return colorLabels[language][colorKey];
}

/** 색상 선택 UI에서 사용하는 색상 목록을 반환한다. */
export function getColorOptions(language: AppLanguage = "ko") {
  return colorKeys.map((value) => ({
    ...colorByKey[value],
    label: getColorLabel(value, language),
    value,
  }));
}
