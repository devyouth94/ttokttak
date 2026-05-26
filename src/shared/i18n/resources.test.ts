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
    expect(i18n.t("home.date.today")).toBe("Today");
    expect(i18n.t("home.feed.skipLabel", { title: "Vitamins" })).toBe(
      "Skip Vitamins"
    );
    expect(i18n.t("home.feed.completeLabel", { title: "Vitamins" })).toBe(
      "Complete Vitamins"
    );
    expect(i18n.t("home.feed.errorTitle")).toBe("Could not load items");
    expect(i18n.t("home.feed.sectionCount", { count: 1 })).toBe("1 item");
    expect(i18n.t("home.feed.sectionCount", { count: 2 })).toBe("2 items");
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
    expect(i18n.t("home.date.today")).toBe("오늘");
    expect(i18n.t("home.feed.skipLabel", { title: "비타민" })).toBe(
      "비타민 건너뛰기"
    );
    expect(i18n.t("home.feed.completeLabel", { title: "비타민" })).toBe(
      "비타민 완료"
    );
    expect(i18n.t("home.feed.errorTitle")).toBe("일정을 불러오지 못했어요");
  });
});
