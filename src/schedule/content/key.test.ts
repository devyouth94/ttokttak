import { getKey, getOrCreateKey } from "./key";
import {
  findContentKey,
  recoverContentKey,
  saveContentKey,
  wrapContentKey,
} from "./remote-key";
import { ScheduleContentUnrecoverableError } from "../errors";

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockEncoded = jest.fn();
const mockGenerate = jest.fn();
const mockImport = jest.fn();

jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItem(...args),
  setItemAsync: (...args: unknown[]) => mockSetItem(...args),
}));

jest.mock("expo-crypto", () => ({
  AESEncryptionKey: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    import: (...args: unknown[]) => mockImport(...args),
  },
}));

jest.mock("./remote-key", () => ({
  findContentKey: jest.fn(),
  recoverContentKey: jest.fn(),
  saveContentKey: jest.fn(),
  wrapContentKey: jest.fn(),
}));

describe("schedule content key", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockEncoded.mockResolvedValue("generated-key");
    mockGenerate.mockResolvedValue({ encoded: mockEncoded });
    mockImport.mockImplementation(async (value: string) => ({ value }));
    jest.mocked(findContentKey).mockResolvedValue(false);
    jest.mocked(recoverContentKey).mockResolvedValue(null);
    jest.mocked(saveContentKey).mockResolvedValue();
    jest.mocked(wrapContentKey).mockResolvedValue({
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: { encoding: "combined-base64" },
      wrappedKey: "wrapped-key",
    });
  });

  it("새 key를 기기와 서버 복구 경계에 저장한다", async () => {
    await getOrCreateKey("user-1");

    expect(saveContentKey).toHaveBeenCalledWith({
      keyVersion: 1,
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: { encoding: "combined-base64" },
      wrappedKey: "wrapped-key",
    });
    expect(mockSetItem).toHaveBeenCalledWith(
      "ttokttak.user-content-key.v1.user-1",
      "generated-key"
    );
    expect(
      JSON.stringify(jest.mocked(saveContentKey).mock.calls)
    ).not.toContain("generated-key");
  });

  it("서버 복구용 key 저장이 실패하면 기기에 새 key를 남기지 않는다", async () => {
    const error = new Error("서버 저장 실패");
    jest.mocked(saveContentKey).mockRejectedValueOnce(error);
    await expect(getOrCreateKey("user-1")).rejects.toBe(error);
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it("서버에서 복구한 key를 기기에 저장하고 다음 암호화에 재사용한다", async () => {
    const storage = new Map<string, string>();
    mockGetItem.mockImplementation(
      async (id: string) => storage.get(id) ?? null
    );
    mockSetItem.mockImplementation(async (id: string, value: string) => {
      storage.set(id, value);
    });
    jest.mocked(findContentKey).mockResolvedValue(true);
    jest.mocked(recoverContentKey).mockResolvedValue("server-key");

    const key = await getKey({ keyVersion: 1, userId: "user-1" });

    expect(key.source).toBe("server");
    expect(mockImport).toHaveBeenCalledWith("server-key", "base64");
    expect(mockSetItem).toHaveBeenCalledWith(
      "ttokttak.user-content-key.v1.user-1",
      "server-key"
    );
    jest.mocked(recoverContentKey).mockClear();
    await expect(getOrCreateKey("user-1")).resolves.toEqual({
      value: "server-key",
    });
    expect(recoverContentKey).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("지원하지 않는 버전은 조회하지 않고 key가 없으면 새로 만들지 않는다", async () => {
    await expect(
      getKey({ keyVersion: 2, userId: "user-1" })
    ).rejects.toBeInstanceOf(ScheduleContentUnrecoverableError);
    expect(mockGetItem).not.toHaveBeenCalled();
    expect(recoverContentKey).not.toHaveBeenCalled();
    await expect(
      getKey({ keyVersion: 1, userId: "user-1" })
    ).rejects.toBeInstanceOf(ScheduleContentUnrecoverableError);

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(saveContentKey).not.toHaveBeenCalled();
  });
});
