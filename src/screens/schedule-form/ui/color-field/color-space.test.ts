import { contrastingColor, hexToHsv, hsvToHex } from "./color-space";

it("picker 색상을 RGB와 HSV로 왕복하고 읽기 쉬운 전경색을 고른다", () => {
  expect(hsvToHex(hexToHsv("#3366CC"))).toBe("#3366CC");
  expect(hsvToHex({ hue: 120, saturation: 1, value: 1 })).toBe("#00FF00");
  expect(contrastingColor("#FFFFFF")).toBe("#000000");
  expect(contrastingColor("#000000")).toBe("#FFFFFF");
});
