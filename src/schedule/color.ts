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

/** 저장 가능한 대문자 RGB 색상으로 정규화한다. */
export function normalizeColorHex(colorHex: string): string {
  const normalized = colorHex.toUpperCase();

  return colorHexPattern.test(normalized) ? normalized : defaultColorHex;
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
