import type { ExpoConfig } from "expo/config";

function loadAppConfig(): () => ExpoConfig {
  const appConfigModule = require("./app.config") as {
    default: () => ExpoConfig;
  };

  return appConfigModule.default;
}

describe("app config", () => {
  const envKey = "GOOGLE_AUTH_IOS_URL_SCHEME";
  const originalGoogleIosUrlScheme = process.env[envKey];

  afterEach(() => {
    jest.resetModules();

    if (originalGoogleIosUrlScheme === undefined) {
      delete process.env[envKey];
      return;
    }

    process.env[envKey] = originalGoogleIosUrlScheme;
  });

  it("Google iOS URL scheme은 config 함수 호출 시점의 환경 변수를 사용한다", () => {
    delete process.env[envKey];
    jest.resetModules();

    const getAppConfig = loadAppConfig();
    process.env[envKey] =
      "com.googleusercontent.apps.test-ios-url-scheme";

    expect(JSON.stringify(getAppConfig().plugins)).toContain(
      process.env[envKey]
    );
  });
});
