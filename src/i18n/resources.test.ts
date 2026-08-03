import { createInstance } from "i18next";

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
  it("English 리소스는 핵심 문구, interpolation, plural을 제공한다", async () => {
    const i18n = await createTestI18n("en");

    expect(i18n.t("app.name")).toBe("ttokttak");
    expect(i18n.t("login.googleButton")).toBe("Continue with Google");
    expect(i18n.t("home.feed.skipLabel", { title: "Vitamins" })).toBe(
      "Skip Vitamins"
    );
    expect(i18n.t("home.feed.sectionCount", { count: 1 })).toBe("1 item");
    expect(i18n.t("home.feed.sectionCount", { count: 2 })).toBe("2 items");
  });

  it("한국어 리소스는 핵심 문구와 interpolation을 제공한다", async () => {
    const i18n = await createTestI18n("ko");

    expect(i18n.t("app.name")).toBe("똑딱");
    expect(i18n.t("login.googleButton")).toBe("Google로 로그인");
    expect(i18n.t("home.feed.skipLabel", { title: "비타민" })).toBe(
      "비타민 건너뛰기"
    );
    expect(i18n.t("navigation.createItemLabel")).toBe("일정 추가");
  });
});
