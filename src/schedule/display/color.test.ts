import {
  colorByKey,
  contrastingColor,
  getColorHexLabel,
  hexToHsv,
  hsvToHex,
  nearestColorKey,
  normalizeColorHex,
} from "./color";

describe("일정 색상", () => {
  it("색상 값을 정규화하고 가장 가까운 구버전 프리셋을 찾는다", () => {
    expect(normalizeColorHex("#f4be8a")).toBe("#F4BE8A");
    expect(nearestColorKey("#F5C090")).toBe("orange");
    expect(getColorHexLabel(colorByKey.blue.swatchColor, "ko")).toBe("파랑");
    expect(getColorHexLabel("#123456", "ko")).toBe("사용자 지정");
  });

  it("RGB와 HSV를 왕복하고 읽기 쉬운 전경색을 고른다", () => {
    expect(hsvToHex(hexToHsv("#3366CC"))).toBe("#3366CC");
    expect(hsvToHex({ hue: 120, saturation: 1, value: 1 })).toBe("#00FF00");
    expect(contrastingColor("#FFFFFF")).toBe("#000000");
    expect(contrastingColor("#000000")).toBe("#FFFFFF");
  });
});
