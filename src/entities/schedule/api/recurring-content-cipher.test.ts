import { recurringContentCipher } from "~/entities/schedule/api/recurring-content-cipher";
import { listRecurringItems } from "~/entities/schedule/api/recurring-items-repository";
import {
  createRecurringItemsPersistenceDouble,
  createStoredRecurringItemFixture,
} from "~/entities/schedule/api/repository-test-helpers";
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
const titleCiphertext = "dGl0bGUtY2lwaGVydGV4dA==";

jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
}));
jest.mock("~/supabase", () => ({ supabase: {} }));

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

      return new TextEncoder().encode("복구된 일정");
    }
  ),
  aesEncryptAsync: jest.fn(async () => ({
    combined: () => "ciphertext",
  })),
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
        keySource: "edge-secret-v1",
      },
      wrappedKey: "edge-wrapped-content-key",
    });
    expect(wrapUserContentKeyForRecovery).toHaveBeenCalledWith({
      encodedKey: "generated-key",
      keyVersion: 1,
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
        keySource: "edge-secret-v1",
      },
      wrappedKey: "edge-wrapped-content-key",
    });
    expect(wrapUserContentKeyForRecovery).toHaveBeenCalledWith({
      encodedKey: "local-only-content-key",
      keyVersion: 1,
    });
    expect(
      JSON.stringify(jest.mocked(upsertUserContentEncryptionKey).mock.calls)
    ).not.toContain("local-only-content-key");
  });

  it("새 기기에서 서버 wrapped key로 일정 내용을 복구하고 content key를 기기에 캐시한다", async () => {
    jest.mocked(recoverUserContentKey).mockResolvedValue("server-content-key");

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
    expect(recoverUserContentKey).toHaveBeenCalledWith({
      keyVersion: 1,
    });
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "ttokttak.user-content-key.v1.user-1",
      "server-content-key"
    );
  });

  it("기존 expo-secure-store metadata도 서버 wrapped key가 있으면 복구한다", async () => {
    jest.mocked(recoverUserContentKey).mockResolvedValue("server-content-key");

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
        keySource: "edge-secret-v1",
      },
      wrappedKey: "edge-wrapped-content-key",
    });
  });

  it("기기에 남은 content key가 틀리면 서버 wrapped key로 다시 복구한다", async () => {
    mockGetItemAsync.mockResolvedValue("wrong-local-content-key");
    jest.mocked(recoverUserContentKey).mockResolvedValue("server-content-key");

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

  it("일정 목록마다 같은 로컬 key 조회와 서버 복구를 한 번만 수행한다", async () => {
    mockGetItemAsync.mockResolvedValue("wrong-local-content-key");
    jest.mocked(recoverUserContentKey).mockResolvedValue("server-content-key");
    const firstItem = createStoredRecurringItemFixture({
      contentEncryptionMetadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "server-wrapped",
      },
      titleCiphertext,
    });
    const persistence = createRecurringItemsPersistenceDouble();
    persistence.listItems.mockResolvedValue([
      firstItem,
      createStoredRecurringItemFixture({
        ...firstItem,
        id: "item-2",
        titleCiphertext,
      }),
    ]);

    await listRecurringItems({
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });
    await listRecurringItems({
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(mockGetItemAsync).toHaveBeenCalledTimes(2);
    expect(recoverUserContentKey).toHaveBeenCalledTimes(2);
    expect(mockImport).toHaveBeenCalledTimes(4);
  });

  it("같은 로컬 key의 기존 metadata backfill을 목록마다 한 번만 수행한다", async () => {
    mockGetItemAsync.mockResolvedValue("valid-local-content-key");
    jest.mocked(getUserContentEncryptionKey).mockResolvedValue({
      createdAt: "2026-07-14T00:00:00.000Z",
      keyVersion: 1,
      updatedAt: "2026-07-14T00:00:00.000Z",
      userId: "user-1",
      wrapAlgorithm: "AES-GCM",
      wrapMetadata: {},
      wrappedKey: "existing-wrapped-key",
    });
    const firstItem = createStoredRecurringItemFixture({
      contentEncryptionMetadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "expo-secure-store",
      },
      descriptionCiphertext: null,
      titleCiphertext,
    });
    const persistence = createRecurringItemsPersistenceDouble();
    persistence.listItems.mockResolvedValue([
      firstItem,
      createStoredRecurringItemFixture({
        ...firstItem,
        id: "item-2",
        titleCiphertext,
      }),
    ]);

    await listRecurringItems({
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(upsertUserContentEncryptionKey).toHaveBeenCalledTimes(1);
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
