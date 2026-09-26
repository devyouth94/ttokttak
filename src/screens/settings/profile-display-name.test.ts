import {
  getEditableProfileDisplayName,
  validateProfileDisplayName,
} from "./profile-display-name";

describe("settings profile display name", () => {
  it("30자를 넘는 이름은 저장하지 않는다", () => {
    expect(validateProfileDisplayName("가".repeat(30))).toEqual({
      errorMessage: null,
      value: "가".repeat(30),
    });
    expect(validateProfileDisplayName("가".repeat(31))).toEqual({
      errorMessage: "tooLong",
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
