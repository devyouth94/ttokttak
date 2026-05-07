import { recurringContentCipher } from "~/features/privacy/recurring-content-cipher";
import {
  getUserContentEncryptionKey,
  upsertUserContentEncryptionKey,
} from "~/features/privacy/user-content-encryption-keys-repository";

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockEncoded = jest.fn();
const mockGenerate = jest.fn();
const mockImport = jest.fn();
const titleCiphertext = "dGl0bGUtY2lwaGVydGV4dA==";
const wrappedContentKey = "d3JhcHBlZC1jb250ZW50LWtleQ==";

jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
}));

jest.mock("expo-crypto", () => ({
  AESEncryptionKey: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    import: (...args: unknown[]) => mockImport(...args),
  },
  AESSealedData: {
    fromCombined: (value: Uint8Array) => ({
      combined: new TextDecoder().decode(value),
    }),
  },
  aesDecryptAsync: jest.fn(
    async (sealedData: { combined: string }, key: { imported: string }) => {
      if (
        sealedData.combined === "title-ciphertext" &&
        key.imported === "wrong-local-content-key"
      ) {
        throw new Error("복호화 실패");
      }

      if (sealedData.combined === "wrapped-content-key") {
        return new TextEncoder().encode("server-content-key");
      }

      return new TextEncoder().encode("복구된 일정");
    }
  ),
  aesEncryptAsync: jest.fn(async () => ({
    combined: () => "ciphertext",
  })),
}));

jest.mock("~/features/privacy/user-content-encryption-keys-repository", () => ({
  getUserContentEncryptionKey: jest.fn(),
  upsertUserContentEncryptionKey: jest.fn(),
}));

describe("recurringContentCipher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemAsync.mockResolvedValue(null);
    mockEncoded.mockResolvedValue("generated-key");
    mockGenerate.mockResolvedValue({ encoded: mockEncoded });
    mockImport.mockImplementation(async (value: string) => ({
      imported: value,
    }));
    jest.mocked(getUserContentEncryptionKey).mockResolvedValue(null);
  });

  it("SecureStore key는 iOS에서 허용되는 문자만 사용한다", async () => {
    await recurringContentCipher.encryptRecurringItemContent({
      description: null,
      title: "sim notification test",
      userId: "user-1",
    });

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "ttokttak.user-content-key.v1.user-1",
      "generated-key"
    );
  });

  it("새 content key를 만들 때 서버 복구용 wrapped key를 저장한다", async () => {
    await recurringContentCipher.encryptRecurringItemContent({
      description: "설명",
      title: "일정",
      userId: "user-1",
    });

    expect(upsertUserContentEncryptionKey).toHaveBeenCalledWith({
      keyVersion: 1,
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "app-static-v1",
      },
      wrappedKey: "ciphertext",
    });
    expect(
      JSON.stringify(jest.mocked(upsertUserContentEncryptionKey).mock.calls)
    ).not.toContain("generated-key");
  });

  it("기기에만 있던 기존 content key를 서버 wrapped key로 backfill한다", async () => {
    mockGetItemAsync.mockResolvedValue("local-only-content-key");

    await recurringContentCipher.encryptRecurringItemContent({
      description: null,
      title: "일정",
      userId: "user-1",
    });

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(upsertUserContentEncryptionKey).toHaveBeenCalledWith({
      keyVersion: 1,
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "app-static-v1",
      },
      wrappedKey: "ciphertext",
    });
    expect(
      JSON.stringify(jest.mocked(upsertUserContentEncryptionKey).mock.calls)
    ).not.toContain("local-only-content-key");
  });

  it("새 기기에서 서버 wrapped key로 일정 내용을 복구하고 content key를 기기에 캐시한다", async () => {
    jest.mocked(getUserContentEncryptionKey).mockResolvedValue({
      createdAt: "2026-05-07T00:00:00.000Z",
      keyVersion: 1,
      updatedAt: "2026-05-07T00:00:00.000Z",
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "app-static-v1",
      },
      wrappedKey: wrappedContentKey,
    });

    const content = await recurringContentCipher.decryptRecurringItemContent({
      descriptionCiphertext: null,
      keyVersion: 1,
      metadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "server-wrapped",
      },
      titleCiphertext,
      userId: "user-1",
    });

    expect(content.title).toBe("복구된 일정");
    expect(getUserContentEncryptionKey).toHaveBeenCalledWith({
      keyVersion: 1,
      userId: "user-1",
    });
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "ttokttak.user-content-key.v1.user-1",
      "server-content-key"
    );
  });

  it("기존 expo-secure-store metadata도 서버 wrapped key가 있으면 복구한다", async () => {
    jest.mocked(getUserContentEncryptionKey).mockResolvedValue({
      createdAt: "2026-05-07T00:00:00.000Z",
      keyVersion: 1,
      updatedAt: "2026-05-07T00:00:00.000Z",
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "app-static-v1",
      },
      wrappedKey: wrappedContentKey,
    });

    const content = await recurringContentCipher.decryptRecurringItemContent({
      descriptionCiphertext: null,
      keyVersion: 1,
      metadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "expo-secure-store",
      },
      titleCiphertext,
      userId: "user-1",
    });

    expect(content.title).toBe("복구된 일정");
  });

  it("기존 expo-secure-store 항목을 로컬 key로 복구하면 서버 wrapped key를 갱신한다", async () => {
    mockGetItemAsync.mockResolvedValue("valid-local-content-key");
    jest.mocked(getUserContentEncryptionKey).mockResolvedValue({
      createdAt: "2026-05-07T00:00:00.000Z",
      keyVersion: 1,
      updatedAt: "2026-05-07T00:00:00.000Z",
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "app-static-v1",
      },
      wrappedKey: "wrong-wrapped-content-key",
    });

    const content = await recurringContentCipher.decryptRecurringItemContent({
      descriptionCiphertext: null,
      keyVersion: 1,
      metadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "expo-secure-store",
      },
      titleCiphertext,
      userId: "user-1",
    });

    expect(content.title).toBe("복구된 일정");
    expect(upsertUserContentEncryptionKey).toHaveBeenCalledWith({
      keyVersion: 1,
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "app-static-v1",
      },
      wrappedKey: "ciphertext",
    });
  });

  it("기기에 남은 content key가 틀리면 서버 wrapped key로 다시 복구한다", async () => {
    mockGetItemAsync.mockResolvedValue("wrong-local-content-key");
    jest.mocked(getUserContentEncryptionKey).mockResolvedValue({
      createdAt: "2026-05-07T00:00:00.000Z",
      keyVersion: 1,
      updatedAt: "2026-05-07T00:00:00.000Z",
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {
        encoding: "combined-base64",
        keySource: "app-static-v1",
      },
      wrappedKey: wrappedContentKey,
    });

    const content = await recurringContentCipher.decryptRecurringItemContent({
      descriptionCiphertext: null,
      keyVersion: 1,
      metadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "expo-secure-store",
      },
      titleCiphertext,
      userId: "user-1",
    });

    expect(content.title).toBe("복구된 일정");
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "ttokttak.user-content-key.v1.user-1",
      "server-content-key"
    );
  });

  it("복호화할 content key가 없으면 새 key를 만들지 않고 실패한다", async () => {
    await expect(
      recurringContentCipher.decryptRecurringItemContent({
        descriptionCiphertext: null,
        keyVersion: 1,
        metadata: {
          algorithm: "AES-GCM",
          encoding: "combined-base64",
          keyStorage: "server-wrapped",
        },
        titleCiphertext,
        userId: "user-1",
      })
    ).rejects.toThrow("일정 내용 암호화 키를 복구할 수 없습니다.");

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(upsertUserContentEncryptionKey).not.toHaveBeenCalled();
  });
});
