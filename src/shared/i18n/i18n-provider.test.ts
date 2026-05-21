import { shouldRenderI18nContent } from "./i18n-gate";

describe("shouldRenderI18nContent", () => {
  it("i18n 초기화가 끝나기 전에는 앱 화면을 렌더링하지 않는다", () => {
    expect(shouldRenderI18nContent(false)).toBe(false);
  });

  it("i18n 초기화가 끝나면 앱 화면을 렌더링한다", () => {
    expect(shouldRenderI18nContent(true)).toBe(true);
  });
});
