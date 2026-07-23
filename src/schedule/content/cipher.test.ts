import {
  createContentDecryptor,
  decryptContent,
  encryptContent,
} from "./cipher";
import { getKey, getOrCreateKey, getServerKey, saveWrappedKey } from "./key";

const mockDecrypt = jest.fn();
const mockEncrypt = jest.fn();
const mockFromCombined = jest.fn();

jest.mock("expo-crypto", () => ({
  AESSealedData: {
    fromCombined: (...args: unknown[]) => mockFromCombined(...args),
  },
  aesDecryptAsync: (...args: unknown[]) => mockDecrypt(...args),
  aesEncryptAsync: (...args: unknown[]) => mockEncrypt(...args),
}));

jest.mock("./key", () => ({
  getKey: jest.fn(),
  getOrCreateKey: jest.fn(),
  getServerKey: jest.fn(),
  keyVersion: 1,
  saveWrappedKey: jest.fn(),
}));

const encrypted = {
  descriptionCiphertext: null,
  keyVersion: 1,
  metadata: {
    algorithm: "AES-GCM",
    encoding: "combined-base64",
    keyStorage: "server-wrapped",
  },
  titleCiphertext: "dGl0bGU=",
  userId: "user-1",
};

describe("schedule content", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEncrypt.mockImplementation(async (value: Uint8Array) => ({
      combined: () =>
        new TextDecoder().decode(value) === "일정"
          ? "dGl0bGU="
          : "ZGVzY3JpcHRpb24=",
    }));
    mockFromCombined.mockImplementation((value: Uint8Array) => ({
      value: new TextDecoder().decode(value),
    }));
    mockDecrypt.mockImplementation(
      async (sealed: { value: string }, key: { id: string }) => {
        if (key.id === "wrong") {
          throw new Error("복호화 실패");
        }

        return new TextEncoder().encode(
          sealed.value === "title" ? "일정" : "설명"
        );
      }
    );
    jest.mocked(getOrCreateKey).mockResolvedValue({ id: "good" } as never);
    jest.mocked(getKey).mockResolvedValue({
      encoded: "local-key",
      source: "local",
      value: { id: "good" },
    } as never);
    jest.mocked(getServerKey).mockResolvedValue(null);
    jest.mocked(saveWrappedKey).mockResolvedValue();
  });

  it("제목과 설명을 암복호화하고 지원하지 않는 metadata를 거부한다", async () => {
    const result = await encryptContent({
      description: "설명",
      title: "일정",
      userId: "user-1",
    });

    expect(result).toEqual({
      descriptionCiphertext: "ZGVzY3JpcHRpb24=",
      keyVersion: 1,
      metadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "server-wrapped",
      },
      titleCiphertext: "dGl0bGU=",
    });
    await expect(
      decryptContent({ ...result, userId: "user-1" })
    ).resolves.toEqual({ description: "설명", title: "일정" });
    await expect(
      decryptContent({ ...encrypted, metadata: {}, userId: "user-1" })
    ).rejects.toThrow("일정 내용 암호화 메타데이터를 읽을 수 없습니다.");
  });

  it("기기의 content key가 틀리면 서버 key로 다시 복구한다", async () => {
    jest.mocked(getKey).mockResolvedValue({
      encoded: "wrong-key",
      source: "local",
      value: { id: "wrong" },
    } as never);
    jest.mocked(getServerKey).mockResolvedValue({
      encoded: "server-key",
      source: "server",
      value: { id: "server" },
    } as never);

    await expect(decryptContent(encrypted)).resolves.toEqual({
      description: null,
      title: "일정",
    });
    expect(getServerKey).toHaveBeenCalledWith({
      keyVersion: 1,
      userId: "user-1",
    });
  });

  it("기존 SecureStore metadata를 읽으면 서버 wrapped key를 채운다", async () => {
    await decryptContent({
      ...encrypted,
      metadata: { ...encrypted.metadata, keyStorage: "expo-secure-store" },
    });

    expect(saveWrappedKey).toHaveBeenCalledWith({
      encodedKey: "local-key",
      keyVersion: 1,
      userId: "user-1",
    });
  });

  it("한 목록에서는 같은 content key 조회와 서버 복구를 공유한다", async () => {
    jest.mocked(getKey).mockResolvedValue({
      encoded: "wrong-key",
      source: "local",
      value: { id: "wrong" },
    } as never);
    jest.mocked(getServerKey).mockResolvedValue({
      encoded: "server-key",
      source: "server",
      value: { id: "server" },
    } as never);
    const decrypt = createContentDecryptor();

    await Promise.all([
      decrypt(encrypted),
      decrypt({ ...encrypted, titleCiphertext: "dGl0bGU=" }),
    ]);

    expect(getKey).toHaveBeenCalledTimes(1);
    expect(getServerKey).toHaveBeenCalledTimes(1);
  });
});
