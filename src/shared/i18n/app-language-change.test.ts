jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

declare const require: (moduleName: string) => unknown;

const { persistAppLanguageChange } =
  require("./app-language-change") as typeof import("./app-language-change");

describe("app language change", () => {
  it("같은 앱 표시 언어를 다시 선택하면 저장과 적용을 건너뛴다", async () => {
    const applyLanguage = jest.fn();
    const writeLanguage = jest.fn();

    const result = await persistAppLanguageChange({
      applyLanguage,
      currentLanguage: "ko",
      nextLanguage: "ko",
      writeLanguage,
    });

    expect(result).toEqual({
      didChange: false,
      language: "ko",
    });
    expect(writeLanguage).not.toHaveBeenCalled();
    expect(applyLanguage).not.toHaveBeenCalled();
  });

  it("새 앱 표시 언어를 현재 기기에 저장한 뒤 런타임 언어로 적용한다", async () => {
    const applyLanguage = jest.fn(async () => undefined);
    const writeLanguage = jest.fn(async () => undefined);

    const result = await persistAppLanguageChange({
      applyLanguage,
      currentLanguage: "ko",
      nextLanguage: "en",
      writeLanguage,
    });

    expect(result).toEqual({
      didChange: true,
      language: "en",
    });
    expect(writeLanguage).toHaveBeenCalledWith("en");
    expect(applyLanguage).toHaveBeenCalledWith("en");
  });

  it("저장이 실패하면 기존 앱 표시 언어를 유지하고 런타임 언어를 바꾸지 않는다", async () => {
    const applyLanguage = jest.fn(async () => undefined);
    const writeLanguage = jest.fn(async () => {
      throw new Error("저장 실패");
    });

    await expect(
      persistAppLanguageChange({
        applyLanguage,
        currentLanguage: "ko",
        nextLanguage: "en",
        writeLanguage,
      })
    ).rejects.toThrow("저장 실패");

    expect(applyLanguage).not.toHaveBeenCalled();
  });

  it("런타임 적용이 실패하면 저장값과 런타임 언어를 기존 값으로 되돌린다", async () => {
    const applyLanguage = jest
      .fn<Promise<void>, ["ko" | "en"]>()
      .mockRejectedValueOnce(new Error("적용 실패"))
      .mockResolvedValueOnce(undefined);
    const writeLanguage = jest.fn(async () => undefined);

    await expect(
      persistAppLanguageChange({
        applyLanguage,
        currentLanguage: "ko",
        nextLanguage: "en",
        writeLanguage,
      })
    ).rejects.toThrow("적용 실패");

    expect(writeLanguage).toHaveBeenNthCalledWith(1, "en");
    expect(writeLanguage).toHaveBeenNthCalledWith(2, "ko");
    expect(applyLanguage).toHaveBeenNthCalledWith(1, "en");
    expect(applyLanguage).toHaveBeenNthCalledWith(2, "ko");
  });
});
