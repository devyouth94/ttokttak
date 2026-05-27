jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

declare const require: (moduleName: string) => unknown;

const { persistAppThemePreferenceChange } =
  require("./app-theme-change") as typeof import("./app-theme-change");

describe("app theme preference change", () => {
  it("같은 테마를 다시 선택하면 저장과 적용을 건너뛴다", async () => {
    const applyPreference = jest.fn();
    const writePreference = jest.fn();

    const result = await persistAppThemePreferenceChange({
      applyPreference,
      currentPreference: "system",
      nextPreference: "system",
      writePreference,
    });

    expect(result).toEqual({
      didChange: false,
      preference: "system",
    });
    expect(writePreference).not.toHaveBeenCalled();
    expect(applyPreference).not.toHaveBeenCalled();
  });

  it("새 테마를 런타임에 적용한 뒤 현재 기기에 저장한다", async () => {
    const calls: string[] = [];
    const applyPreference = jest.fn<
      Promise<void>,
      ["system" | "light" | "dark"]
    >();
    const writePreference = jest.fn<
      Promise<void>,
      ["system" | "light" | "dark"]
    >();
    applyPreference.mockImplementation(async (preference) => {
      calls.push(`apply:${preference}`);
    });
    writePreference.mockImplementation(async (preference) => {
      calls.push(`write:${preference}`);
    });

    const result = await persistAppThemePreferenceChange({
      applyPreference,
      currentPreference: "system",
      nextPreference: "dark",
      writePreference,
    });

    expect(result).toEqual({
      didChange: true,
      preference: "dark",
    });
    expect(writePreference).toHaveBeenCalledWith("dark");
    expect(applyPreference).toHaveBeenCalledWith("dark");
    expect(calls).toEqual(["apply:dark", "write:dark"]);
  });

  it("저장이 실패하면 런타임 테마를 기존 preference로 되돌린다", async () => {
    const applyPreference = jest.fn(async () => undefined);
    const writePreference = jest.fn(async () => {
      throw new Error("저장 실패");
    });

    await expect(
      persistAppThemePreferenceChange({
        applyPreference,
        currentPreference: "system",
        nextPreference: "dark",
        writePreference,
      })
    ).rejects.toThrow("저장 실패");

    expect(applyPreference).toHaveBeenNthCalledWith(1, "dark");
    expect(applyPreference).toHaveBeenNthCalledWith(2, "system");
  });

  it("성공한 변경 이후 다음 변경이 실패하면 직전 성공 preference로 되돌린다", async () => {
    const applyPreference = jest.fn(async () => undefined);
    const writePreference = jest.fn(async () => {
      throw new Error("저장 실패");
    });

    await expect(
      persistAppThemePreferenceChange({
        applyPreference,
        currentPreference: "dark",
        nextPreference: "system",
        writePreference,
      })
    ).rejects.toThrow("저장 실패");

    expect(applyPreference).toHaveBeenNthCalledWith(1, "system");
    expect(applyPreference).toHaveBeenNthCalledWith(2, "dark");
  });

  it("런타임 적용이 실패하면 저장하지 않고 기존 preference로 되돌린다", async () => {
    const applyPreference = jest
      .fn<Promise<void>, ["system" | "light" | "dark"]>()
      .mockRejectedValueOnce(new Error("적용 실패"))
      .mockResolvedValueOnce(undefined);
    const writePreference = jest.fn(async () => undefined);

    await expect(
      persistAppThemePreferenceChange({
        applyPreference,
        currentPreference: "system",
        nextPreference: "dark",
        writePreference,
      })
    ).rejects.toThrow("적용 실패");

    expect(writePreference).not.toHaveBeenCalled();
    expect(applyPreference).toHaveBeenNthCalledWith(1, "dark");
    expect(applyPreference).toHaveBeenNthCalledWith(2, "system");
  });
});
