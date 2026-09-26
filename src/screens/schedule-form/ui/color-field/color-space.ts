import { normalizeColorHex } from "~/schedule/color";

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

function hexToRgb(colorHex: string) {
  return {
    blue: Number.parseInt(colorHex.slice(5, 7), 16),
    green: Number.parseInt(colorHex.slice(3, 5), 16),
    red: Number.parseInt(colorHex.slice(1, 3), 16),
  };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
