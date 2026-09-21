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

export const defaultColorHex = colorByKey[defaultColorKey].swatchColor;
export const colorHexPattern = /^#[0-9A-F]{6}$/;

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

/** 저장 가능한 대문자 RGB 색상으로 정규화한다. */
export function normalizeColorHex(colorHex: string): string {
  const normalized = colorHex.toUpperCase();

  return colorHexPattern.test(normalized) ? normalized : defaultColorHex;
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

/** 구버전 앱이 표시할 가장 가까운 프리셋 색상을 반환한다. */
export function nearestColorKey(colorHex: string): ColorKey {
  const target = hexToRgb(normalizeColorHex(colorHex));

  return colorKeys.reduce((nearest, candidate) => {
    const nearestRgb = hexToRgb(colorByKey[nearest].swatchColor);
    const candidateRgb = hexToRgb(colorByKey[candidate].swatchColor);

    return colorDistance(target, candidateRgb) <
      colorDistance(target, nearestRgb)
      ? candidate
      : nearest;
  }, defaultColorKey);
}

export function hexToHsv(colorHex: string): {
  hue: number;
  saturation: number;
  value: number;
} {
  const { blue, green, red } = hexToRgb(normalizeColorHex(colorHex));
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta > 0) {
    if (maximum === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (maximum === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: maximum === 0 ? 0 : delta / maximum,
    value: maximum,
  };
}

export function hsvToHex({
  hue,
  saturation,
  value,
}: {
  hue: number;
  saturation: number;
  value: number;
}): string {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp(saturation);
  const v = clamp(value);
  const chroma = v * s;
  const segment = h / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [r, g, b] =
    segment < 1
      ? [chroma, secondary, 0]
      : segment < 2
        ? [secondary, chroma, 0]
        : segment < 3
          ? [0, chroma, secondary]
          : segment < 4
            ? [0, secondary, chroma]
            : segment < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = v - chroma;

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase()
    )
    .join("")}`;
}

/** 색상 위에 표시할 흰색 또는 검은색을 고른다. */
export function contrastingColor(colorHex: string): "#000000" | "#FFFFFF" {
  const { blue, green, red } = hexToRgb(normalizeColorHex(colorHex));

  return red * 0.299 + green * 0.587 + blue * 0.114 > 160
    ? "#000000"
    : "#FFFFFF";
}

/** 색상 선택 UI에서 사용하는 색상 목록을 반환한다. */
export function getColorOptions(language: AppLanguage = "ko") {
  return colorKeys.map((value) => ({
    ...colorByKey[value],
    label: getColorLabel(value, language),
    value,
  }));
}

function hexToRgb(colorHex: string) {
  return {
    blue: Number.parseInt(colorHex.slice(5, 7), 16),
    green: Number.parseInt(colorHex.slice(3, 5), 16),
    red: Number.parseInt(colorHex.slice(1, 3), 16),
  };
}

function colorDistance(
  left: ReturnType<typeof hexToRgb>,
  right: ReturnType<typeof hexToRgb>
): number {
  return (
    (left.red - right.red) ** 2 +
    (left.green - right.green) ** 2 +
    (left.blue - right.blue) ** 2
  );
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
