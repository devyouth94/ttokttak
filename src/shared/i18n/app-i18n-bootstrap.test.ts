import { bootstrapAppI18n } from "./app-i18n-bootstrap";

describe("bootstrapAppI18n", () => {
  it("초기 언어 결정과 런타임 적용이 성공하면 해당 언어로 시작한다", async () => {
    const applyLanguage = jest
      .fn<Promise<void>, ["ko" | "en"]>()
      .mockResolvedValue();

    await expect(
      bootstrapAppI18n({
        applyLanguage,
        resolveInitialLanguage: async () => "en",
      })
    ).resolves.toBe("en");

    expect(applyLanguage).toHaveBeenCalledWith("en");
  });

  it("런타임 초기화가 실패하면 한국어 fallback으로 다시 적용한다", async () => {
    const applyLanguage = jest
      .fn<Promise<void>, ["ko" | "en"]>()
      .mockRejectedValueOnce(new Error("초기화 오류"))
      .mockResolvedValueOnce();

    await expect(
      bootstrapAppI18n({
        applyLanguage,
        resolveInitialLanguage: async () => "en",
      })
    ).resolves.toBe("ko");

    expect(applyLanguage).toHaveBeenNthCalledWith(1, "en");
    expect(applyLanguage).toHaveBeenNthCalledWith(2, "ko");
  });

  it("fallback 적용도 실패하면 초기화 실패를 caller에게 돌려준다", async () => {
    const error = new Error("초기화 오류");
    const applyLanguage = jest
      .fn<Promise<void>, ["ko" | "en"]>()
      .mockRejectedValue(error);

    await expect(
      bootstrapAppI18n({
        applyLanguage,
        resolveInitialLanguage: async () => "en",
      })
    ).rejects.toThrow(error);

    expect(applyLanguage).toHaveBeenNthCalledWith(1, "en");
    expect(applyLanguage).toHaveBeenNthCalledWith(2, "ko");
  });
});
