// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node 타입 import를 사용할 수 없어 기존 테스트 패턴을 따른다.
const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

function readHomeUiFile(fileName: string): string {
  return readFileSync(
    `${process.cwd()}/src/screens/home/ui/${fileName}`,
    "utf8"
  );
}

describe("home UI i18n", () => {
  it("날짜 캐러셀은 표시 언어와 번역 key를 사용한다", () => {
    const source = readHomeUiFile("home-date-carousel.tsx");

    expect(source).toContain("useAppLanguage()");
    expect(source).toContain("createHomeDateOptions");
    expect(source).toContain("language");
    expect(source).toContain('t("home.date.optionLabel"');
    expect(source).toContain('t("home.date.returnTodayShort")');
  });

  it("홈 row 액션 접근성 문구는 번역 key를 사용한다", () => {
    const source = readHomeUiFile("home-feed-item-row.tsx");

    expect(source).toContain("useTranslation()");
    expect(source).toContain('t("home.feed.skipLabel"');
    expect(source).toContain('t("home.feed.completeLabel"');
    expect(source).toContain("title: card.item.title");
  });

  it("홈 empty/loading/error 문구는 번역 key를 사용한다", () => {
    const sectionBlock = readHomeUiFile("home-feed-section-block.tsx");
    const errorCard = readHomeUiFile("home-feed-error-card.tsx");
    const loadingPlaceholder = readHomeUiFile("home-loading-placeholder.tsx");

    expect(sectionBlock).toContain('t("home.feed.loading")');
    expect(sectionBlock).toContain('t("home.feed.sectionSummary"');
    expect(errorCard).toContain('t("home.feed.errorTitle")');
    expect(loadingPlaceholder).toContain('t("home.feed.loadingA11yLabel")');
  });
});
