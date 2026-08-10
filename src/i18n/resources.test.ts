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

describe("표시 언어 리소스", () => {
  it("언어별 변수 치환과 복수형을 제공한다", async () => {
    const english = await createTestI18n("en");
    const korean = await createTestI18n("ko");

    expect([
      english.t("home.feed.skipLabel", { title: "Vitamins" }),
      english.t("home.feed.sectionCount", { count: 1 }),
      english.t("home.feed.sectionCount", { count: 2 }),
      korean.t("home.feed.skipLabel", { title: "비타민" }),
    ]).toEqual(["Skip Vitamins", "1 item", "2 items", "비타민 건너뛰기"]);
  });
});
