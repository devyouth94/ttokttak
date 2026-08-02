import {
  fallbackAppLanguage,
  normalizeAppLanguage,
  resolveAppLanguage,
} from "./language";

describe("표시 언어 선택", () => {
  it("저장된 표시 언어를 기기 언어보다 우선한다", () => {
    expect(
      resolveAppLanguage({ deviceLanguage: "ko-KR", storedLanguage: "en" })
    ).toBe("en");
  });

  it("저장값이 없으면 기기 언어를 사용한다", () => {
    expect(
      resolveAppLanguage({ deviceLanguage: "en-US", storedLanguage: null })
    ).toBe("en");
  });

  it("지원하지 않는 저장값은 기기 언어로 다시 결정한다", () => {
    expect(
      resolveAppLanguage({ deviceLanguage: "en-US", storedLanguage: "fr" })
    ).toBe("en");
  });

  it("지원하지 않는 언어는 한국어 fallback을 사용한다", () => {
    expect(normalizeAppLanguage("ja-JP")).toBe(fallbackAppLanguage);
  });
});
