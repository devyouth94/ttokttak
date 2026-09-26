import type { AppLanguage } from "~/i18n/language";

import {
  colorByKey,
  type ColorKey,
  colorKeys,
  normalizeColorHex,
} from "../color";

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

const customColorLabels = {
  en: "Custom",
  ko: "사용자 지정",
} as const satisfies Record<AppLanguage, string>;

/** 일정 색상의 언어별 이름을 반환한다. */
export function getColorLabel(
  colorKey: ColorKey,
  language: AppLanguage = "ko"
): string {
  return colorLabels[language][colorKey];
}

/** 정확히 일치하는 프리셋 또는 사용자 지정 색상 이름을 반환한다. */
export function getColorHexLabel(
  colorHex: string,
  language: AppLanguage = "ko"
): string {
  const normalized = normalizeColorHex(colorHex);
  const preset = colorKeys.find(
    (colorKey) => colorByKey[colorKey].swatchColor === normalized
  );

  return preset ? getColorLabel(preset, language) : customColorLabels[language];
}

/** 색상 선택 UI에서 사용하는 색상 목록을 반환한다. */
export function getColorOptions(language: AppLanguage = "ko") {
  return colorKeys.map((value) => ({
    ...colorByKey[value],
    label: getColorLabel(value, language),
    value,
  }));
}
