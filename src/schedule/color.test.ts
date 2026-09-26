import { defaultColorHex, nearestColorKey, normalizeColorHex } from "./color";

describe("일정 색상", () => {
  it("색상 값을 정규화하고 가장 가까운 구버전 프리셋을 찾는다", () => {
    expect(normalizeColorHex("#f4be8a")).toBe("#F4BE8A");
    expect(nearestColorKey("#F5C090")).toBe("orange");
    expect(normalizeColorHex("not-a-color")).toBe(defaultColorHex);
    expect(normalizeColorHex("#12345678")).toBe(defaultColorHex);
  });
});
