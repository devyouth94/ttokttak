import {
  getDeleteAccountErrorMessage,
  getNotificationPermissionStatusText,
  getNotificationStatusText,
  getSettingsDisplayName,
  getSettingsErrorMessage,
} from "./settings-screen-model";

const t = (key: string) => key;

describe("settings screen model", () => {
  it("표시 이름은 profile, provider metadata, email, fallback 순서로 고른다", () => {
    expect(
      getSettingsDisplayName({
        email: "user@example.com",
        fallbackName: "이름 없음",
        metadataName: " Provider Name ",
        profileName: " Profile Name ",
      })
    ).toBe("Profile Name");
    expect(
      getSettingsDisplayName({
        email: "user@example.com",
        fallbackName: "이름 없음",
        metadataName: " Provider Name ",
        profileName: " ",
      })
    ).toBe("Provider Name");
    expect(
      getSettingsDisplayName({
        email: "user@example.com",
        fallbackName: "이름 없음",
        metadataName: null,
        profileName: null,
      })
    ).toBe("user@example.com");
    expect(
      getSettingsDisplayName({
        fallbackName: "이름 없음",
        metadataName: null,
        profileName: null,
      })
    ).toBe("이름 없음");
  });

  it("알림 권한 상태 문구를 설정 화면 key로 매핑한다", () => {
    expect(getNotificationPermissionStatusText("granted", t)).toBe(
      "settings.notifications.statusGranted"
    );
    expect(getNotificationPermissionStatusText("denied", t)).toBe(
      "settings.notifications.statusDenied"
    );
    expect(getNotificationPermissionStatusText("unsupported", t)).toBe(
      "settings.notifications.statusUnsupported"
    );
    expect(getNotificationPermissionStatusText("undetermined", t)).toBe(
      "settings.notifications.statusUndetermined"
    );
  });

  it("앱 알림 상태는 허용, 미지원, 거부 세 가지로 요약한다", () => {
    expect(getNotificationStatusText("granted", t)).toBe(
      "settings.notifications.statusGranted"
    );
    expect(getNotificationStatusText("unsupported", t)).toBe(
      "settings.notifications.statusUnsupported"
    );
    expect(getNotificationStatusText("undetermined", t)).toBe(
      "settings.notifications.statusDenied"
    );
  });

  it("계정 삭제 실패는 에러 타입별 사용자 문구로 매핑한다", () => {
    expect(
      getDeleteAccountErrorMessage(
        Object.assign(new Error(), { name: "AppleAuthRequiredError" }),
        t
      )
    ).toBe("settings.accountManagement.deleteError.appleAuthorizationRequired");
    expect(
      getDeleteAccountErrorMessage(
        Object.assign(new Error(), { name: "LoginRequiredError" }),
        t
      )
    ).toBe("settings.accountManagement.deleteError.sessionRequired");
    expect(getDeleteAccountErrorMessage(new Error("boom"), t)).toBe(
      "settings.accountManagement.deleteError.unknown"
    );
  });

  it("알 수 없는 실패도 alert 본문에 넣을 문자열로 바꾼다", () => {
    expect(getSettingsErrorMessage(new Error("저장 실패"))).toBe("저장 실패");
    expect(getSettingsErrorMessage("저장 실패")).toBe("저장 실패");
  });
});
