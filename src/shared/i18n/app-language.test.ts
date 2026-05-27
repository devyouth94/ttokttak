import {
  fallbackAppLanguage,
  normalizeAppLanguage,
  resolveAppLanguage,
  resolveInitialAppLanguage,
} from "./app-language";

describe("resolveAppLanguage", () => {
  it("저장된 표시 언어가 있으면 기기 언어보다 우선한다", () => {
    const language = resolveAppLanguage({
      deviceLocales: [{ languageCode: "ko", languageTag: "ko-KR" }],
      storedLanguage: "en",
    });

    expect(language).toBe("en");
  });

  it("저장값이 없고 기기 언어가 영어이면 English로 시작한다", () => {
    const language = resolveAppLanguage({
      deviceLocales: [{ languageCode: "en", languageTag: "en-US" }],
      storedLanguage: null,
    });

    expect(language).toBe("en");
  });

  it("기기 languageCode가 없고 languageTag만 영어여도 English로 시작한다", () => {
    const language = resolveAppLanguage({
      deviceLocales: [{ languageCode: null, languageTag: "en" }],
      storedLanguage: null,
    });

    expect(language).toBe("en");
  });

  it("저장값이 없고 기기 언어가 영어가 아니면 한국어로 시작한다", () => {
    const language = resolveAppLanguage({
      deviceLocales: [{ languageCode: "ja", languageTag: "ja-JP" }],
      storedLanguage: null,
    });

    expect(language).toBe("ko");
  });

  it("지원하지 않는 저장값은 기기 언어 기준으로 다시 결정한다", () => {
    const language = resolveAppLanguage({
      deviceLocales: [{ languageCode: "en", languageTag: "en-US" }],
      storedLanguage: "fr",
    });

    expect(language).toBe("en");
  });
});

describe("normalizeAppLanguage", () => {
  it("지원하는 언어 tag는 표시 언어로 정규화한다", () => {
    expect(normalizeAppLanguage("en-US")).toBe("en");
  });

  it("지원하지 않는 언어는 fallback 표시 언어로 정규화한다", () => {
    expect(normalizeAppLanguage("ja-JP")).toBe(fallbackAppLanguage);
  });
});

describe("resolveInitialAppLanguage", () => {
  it("초기 언어 결정 중 오류가 나면 한국어 fallback을 사용한다", async () => {
    await expect(
      resolveInitialAppLanguage({
        getDeviceLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
        readStoredLanguage: async () => {
          throw new Error("저장소 오류");
        },
      })
    ).resolves.toBe(fallbackAppLanguage);
  });
});
