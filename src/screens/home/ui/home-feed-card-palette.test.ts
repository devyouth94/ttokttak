import {
  getHomeFeedSectionCardStyle,
  homeFeedCardPalette,
} from "./home-feed-card-palette";

describe("home feed card palette", () => {
  it("홈 피드 섹션 카드는 테마와 무관한 고정 표현 색상을 사용한다", () => {
    expect(getHomeFeedSectionCardStyle("overdue")).toEqual({
      backgroundColor: "#F8DCD7",
    });
    expect(getHomeFeedSectionCardStyle("selected-date")).toEqual({
      backgroundColor: "#DDEEDD",
    });
    expect(getHomeFeedSectionCardStyle("upcoming")).toEqual({
      backgroundColor: "#F6E8C8",
    });
  });

  it("홈 피드 섹션 카드 위 텍스트와 액션은 고정 표현 팔레트 안에서 읽는다", () => {
    expect(homeFeedCardPalette).toMatchObject({
      actionBorder: "#292B2D",
      divider: "rgba(28, 31, 35, 0.4)",
      mutedText: "#8A9099",
      text: "#1C1F23",
    });
  });
});
