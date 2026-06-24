import getAppConfig from "./app.config";

describe("app config", () => {
  const originalGoogleIosUrlScheme = process.env.GOOGLE_AUTH_IOS_URL_SCHEME;
  const originalEasBuild = process.env.EAS_BUILD;

  afterEach(() => {
    if (originalGoogleIosUrlScheme === undefined) {
      delete process.env.GOOGLE_AUTH_IOS_URL_SCHEME;
    } else {
      process.env.GOOGLE_AUTH_IOS_URL_SCHEME = originalGoogleIosUrlScheme;
    }

    if (originalEasBuild === undefined) {
      delete process.env.EAS_BUILD;
    } else {
      process.env.EAS_BUILD = originalEasBuild;
    }
  });

  it("Google iOS URL scheme은 config 함수 호출 시점의 환경 변수를 사용한다", () => {
    delete process.env.GOOGLE_AUTH_IOS_URL_SCHEME;

    process.env.GOOGLE_AUTH_IOS_URL_SCHEME =
      "com.googleusercontent.apps.test-ios-url-scheme";

    expect(JSON.stringify(getAppConfig().plugins)).toContain(
      process.env.GOOGLE_AUTH_IOS_URL_SCHEME
    );
  });

  it("일반 config 조회에서는 Google iOS URL scheme placeholder를 사용한다", () => {
    delete process.env.GOOGLE_AUTH_IOS_URL_SCHEME;
    delete process.env.EAS_BUILD;

    expect(JSON.stringify(getAppConfig().plugins)).toContain(
      "com.googleusercontent.apps.missing-google-ios-url-scheme"
    );
  });

  it("EAS build에서는 Google iOS URL scheme 누락을 실패로 처리한다", () => {
    delete process.env.GOOGLE_AUTH_IOS_URL_SCHEME;
    process.env.EAS_BUILD = "true";

    expect(() => getAppConfig()).toThrow(
      "GOOGLE_AUTH_IOS_URL_SCHEME 환경 변수가 필요합니다."
    );
  });

  it("로컬 알림 설정만 유지한다", () => {
    const config = getAppConfig();

    expect(config.android?.googleServicesFile).toBeUndefined();
    expect(JSON.stringify(config.plugins)).not.toContain("expo-notifications");
    expect(JSON.stringify(config.plugins)).toContain(
      "./plugins/with-local-notifications-only"
    );
  });

  it("앱 공개 버전은 config에 명시하고 빌드 번호는 EAS 원격 기준으로 둔다", () => {
    const config = getAppConfig();

    expect(config.version).toBe("1.0.2");
    expect(config.ios?.buildNumber).toBeUndefined();
    expect(config.android?.versionCode).toBeUndefined();
  });
});
