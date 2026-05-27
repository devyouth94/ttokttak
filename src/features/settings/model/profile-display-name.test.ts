import {
  getEditableProfileDisplayName,
  normalizeProfileDisplayName,
  validateProfileDisplayName,
} from "./profile-display-name";

describe("settings profile display name", () => {
  it("앞뒤 공백을 제거한 이름을 저장 값으로 사용한다", () => {
    expect(normalizeProfileDisplayName("  홍길동  ")).toBe("홍길동");
  });

  it("공백만 있는 이름은 저장하지 않는다", () => {
    expect(validateProfileDisplayName("   ")).toEqual({
      errorMessage: "이름을 입력해 주세요.",
      value: null,
    });
  });

  it("30자를 넘는 이름은 저장하지 않는다", () => {
    expect(validateProfileDisplayName("가".repeat(31))).toEqual({
      errorMessage: "이름은 30자 이하로 입력해 주세요.",
      value: null,
    });
  });

  it("English 표시 언어에서는 English 검증 문구를 반환한다", () => {
    expect(validateProfileDisplayName("   ", "en")).toEqual({
      errorMessage: "Enter a name.",
      value: null,
    });
  });

  it("이메일 fallback은 수정 입력의 기본 이름으로 사용하지 않는다", () => {
    expect(
      getEditableProfileDisplayName({
        email: "user@example.com",
        metadataName: null,
        profileName: "user@example.com",
      })
    ).toBe("");
  });
});
