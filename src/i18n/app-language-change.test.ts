jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

declare const require: (moduleName: string) => unknown;

const { persistAppLanguageChange } =
  require("./app-language-change") as typeof import("./app-language-change");

describe("app language change", () => {
  it("같은 표시 언어를 다시 선택하면 저장과 적용을 건너뛴다", async () => {
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

  it("새 표시 언어를 런타임에 적용한 뒤 현재 기기에 저장한다", async () => {
    const calls: string[] = [];
    const applyLanguage = jest.fn<Promise<void>, ["ko" | "en"]>();
    const writeLanguage = jest.fn<Promise<void>, ["ko" | "en"]>();
    applyLanguage.mockImplementation(async (language) => {
      calls.push(`apply:${language}`);
    });
    writeLanguage.mockImplementation(async (language) => {
      calls.push(`write:${language}`);
    });

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
    expect(calls).toEqual(["apply:en", "write:en"]);
  });

  it("저장이 실패하면 런타임 언어를 기존 표시 언어로 되돌린다", async () => {
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

    expect(applyLanguage).toHaveBeenNthCalledWith(1, "en");
    expect(applyLanguage).toHaveBeenNthCalledWith(2, "ko");
  });

  it("런타임 적용이 실패하면 저장하지 않고 기존 표시 언어로 되돌린다", async () => {
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

    expect(writeLanguage).not.toHaveBeenCalled();
    expect(applyLanguage).toHaveBeenNthCalledWith(1, "en");
    expect(applyLanguage).toHaveBeenNthCalledWith(2, "ko");
  });
});
