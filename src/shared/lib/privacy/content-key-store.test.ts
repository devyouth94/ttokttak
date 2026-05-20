import {
  getContentKeyForDecrypt,
  getOrCreateContentKeyForEncrypt,
} from "~/shared/lib/privacy/content-key-store";
import {
  getUserContentEncryptionKey,
  recoverUserContentKey,
  upsertUserContentEncryptionKey,
  wrapUserContentKeyForRecovery,
} from "~/shared/lib/privacy/user-content-encryption-keys-repository";

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockEncoded = jest.fn();
const mockGenerate = jest.fn();
const mockImport = jest.fn();

jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
}));

jest.mock("expo-crypto", () => ({
  AESEncryptionKey: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    import: (...args: unknown[]) => mockImport(...args),
  },
}));

jest.mock(
  "~/shared/lib/privacy/user-content-encryption-keys-repository",
  () => ({
    getUserContentEncryptionKey: jest.fn(),
    recoverUserContentKey: jest.fn(),
    upsertUserContentEncryptionKey: jest.fn(),
    wrapUserContentKeyForRecovery: jest.fn(),
  })
);

describe("content key store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemAsync.mockResolvedValue(null);
    mockEncoded.mockResolvedValue("generated-key");
    mockGenerate.mockResolvedValue({ encoded: mockEncoded });
    mockImport.mockImplementation(async (value: string) => ({
      imported: value,
    }));
    jest.mocked(getUserContentEncryptionKey).mockResolvedValue(null);
    jest.mocked(recoverUserContentKey).mockResolvedValue(null);
    jest.mocked(wrapUserContentKeyForRecovery).mockResolvedValue({
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "edge-secret-v1",
      },
      wrappedKey: "edge-wrapped-content-key",
    });
  });

  it("새 content key를 만들 때 서버 복구용 wrapped key를 저장한다", async () => {
    await getOrCreateContentKeyForEncrypt("user-1");

    expect(upsertUserContentEncryptionKey).toHaveBeenCalledWith({
      keyVersion: 1,
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "edge-secret-v1",
      },
      wrappedKey: "edge-wrapped-content-key",
    });
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "ttokttak.user-content-key.v1.user-1",
      "generated-key"
    );
    expect(
      JSON.stringify(jest.mocked(upsertUserContentEncryptionKey).mock.calls)
    ).not.toContain("generated-key");
  });

  it("서버에서 복구한 content key를 기기에 캐시한다", async () => {
    jest.mocked(recoverUserContentKey).mockResolvedValue("server-content-key");

    const storedKey = await getContentKeyForDecrypt({
      keyVersion: 1,
      userId: "user-1",
    });

    expect(storedKey.source).toBe("server");
    expect(mockImport).toHaveBeenCalledWith("server-content-key", "base64");
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "ttokttak.user-content-key.v1.user-1",
      "server-content-key"
    );
  });

  it("복호화할 content key가 없으면 새 key를 만들지 않는다", async () => {
    await expect(
      getContentKeyForDecrypt({
        keyVersion: 1,
        userId: "user-1",
      })
    ).rejects.toThrow("내용 암호화 키를 복구할 수 없습니다.");

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(upsertUserContentEncryptionKey).not.toHaveBeenCalled();
  });
});
