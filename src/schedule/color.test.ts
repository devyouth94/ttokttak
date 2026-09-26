import { colorByKey, nearestColorKey, normalizeColorHex } from "./color";
import { getColorHexLabel } from "./display/color";

describe("일정 색상", () => {
  it("색상 값을 정규화하고 가장 가까운 구버전 프리셋을 찾는다", () => {
    expect(normalizeColorHex("#f4be8a")).toBe("#F4BE8A");
    expect(nearestColorKey("#F5C090")).toBe("orange");
    expect(getColorHexLabel(colorByKey.blue.swatchColor, "ko")).toBe("파랑");
    expect(getColorHexLabel("#123456", "ko")).toBe("사용자 지정");
  });
});
