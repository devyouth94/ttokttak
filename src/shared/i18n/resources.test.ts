import { createInstance } from "i18next";

import { resolveAppLanguage } from "./app-language";
import { appI18nResources } from "./resources";

async function createTestI18n(language: "ko" | "en") {
  const i18n = createInstance();

  await i18n.init({
    fallbackLng: "ko",
    lng: language,
    resources: appI18nResources,
    supportedLngs: ["ko", "en"],
  });

  return i18n;
}

describe("app i18n resources", () => {
  it("로그인 전 화면은 기기 언어 English에서 English 문구로 시작한다", async () => {
    const language = resolveAppLanguage({
      deviceLocales: [{ languageCode: "en", languageTag: "en-US" }],
      storedLanguage: null,
    });
    const i18n = await createTestI18n(language);

    expect(i18n.t("app.name")).toBe("ttokttak");
    expect(i18n.t("login.googleButton")).toBe("Continue with Google");
    expect(i18n.t("login.legalTerms")).toBe("Terms of Service");
    expect(i18n.t("login.legalPrivacy")).toBe("Privacy Policy");
    expect(i18n.t("login.legalSuffix")).toBe("");
    expect(i18n.t("navigation.tabs.home")).toBe("Home");
    expect(i18n.t("navigation.createItemLabel")).toBe("Add item");
  });

  it("기존 한국어 로그인과 shell 문구를 유지한다", async () => {
    const i18n = await createTestI18n("ko");

    expect(i18n.t("app.name")).toBe("똑딱");
    expect(i18n.t("login.googleButton")).toBe("Google로 로그인");
    expect(i18n.t("login.legalTerms")).toBe("이용약관");
    expect(i18n.t("login.legalPrivacy")).toBe("개인정보처리방침");
    expect(i18n.t("login.legalSuffix")).toBe("에 동의하게 됩니다.");
    expect(i18n.t("navigation.tabs.home")).toBe("홈");
    expect(i18n.t("navigation.createItemLabel")).toBe("일정 추가");
  });
});
