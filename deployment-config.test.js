const mockExistingBlockList = /existing-module\.js$/;

jest.mock("@sentry/react-native/metro", () => ({
  getSentryExpoConfig: () => ({
    resolver: { blockList: mockExistingBlockList },
  }),
}));

const originalNoDotenv = process.env.EXPO_NO_DOTENV;

afterEach(() => {
  if (originalNoDotenv === undefined) {
    delete process.env.EXPO_NO_DOTENV;
  } else {
    process.env.EXPO_NO_DOTENV = originalNoDotenv;
  }
  jest.resetModules();
});

it("dotenv 파일만 차단하고 기존 Metro blockList를 보존한다", () => {
  process.env.EXPO_NO_DOTENV = "1";

  const config = require("./metro.config.js");
  const blockList = [config.resolver.blockList].flat();
  const isBlocked = (path) => blockList.some((pattern) => pattern.test(path));

  expect(blockList).toContain(mockExistingBlockList);
  expect(isBlocked("/repo/.env")).toBe(true);
  expect(isBlocked("/repo/.env.local")).toBe(true);
  expect(isBlocked("/repo/.env.production.local")).toBe(true);
  expect(isBlocked("/repo/src/env.ts")).toBe(false);
  expect(isBlocked("/repo/src/schedule.ts")).toBe(false);
});

it("production EAS profile은 운영 환경에서 dotenv 로드를 끈다", () => {
  const eas = require("./eas.json");

  expect(eas.build.production.environment).toBe("production");
  expect(eas.build.production.env.EXPO_NO_DOTENV).toBe("1");
});
