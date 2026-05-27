jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

declare const require: (moduleName: string) => unknown;

const AsyncStorage = require("@react-native-async-storage/async-storage") as {
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
};
const { appThemePreferenceStorageKey } =
  require("./app-theme") as typeof import("./app-theme");
const { readStoredAppThemePreference, writeStoredAppThemePreference } =
  require("./app-theme-storage") as typeof import("./app-theme-storage");

describe("app theme preference storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("저장된 테마 preference를 현재 기기 저장소에서 읽는다", async () => {
    AsyncStorage.getItem.mockResolvedValue("dark");

    await expect(readStoredAppThemePreference()).resolves.toBe("dark");

    expect(AsyncStorage.getItem).toHaveBeenCalledWith(
      appThemePreferenceStorageKey
    );
  });

  it("지원하는 테마 preference만 현재 기기 저장소에 쓴다", async () => {
    AsyncStorage.setItem.mockResolvedValue();

    await expect(
      writeStoredAppThemePreference("light")
    ).resolves.toBeUndefined();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      appThemePreferenceStorageKey,
      "light"
    );
  });

  it("지원하지 않는 테마 preference는 저장하지 않는다", async () => {
    AsyncStorage.setItem.mockResolvedValue();

    await expect(
      writeStoredAppThemePreference("sepia" as never)
    ).rejects.toThrow("지원하지 않는 테마입니다.");

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
