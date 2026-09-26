import { createContentDecryptor, decryptContent } from "./cipher";
import { getKey, getServerKey, saveWrappedKey } from "./key";
import { ScheduleContentUnrecoverableError } from "../errors";

const mockDecrypt = jest.fn();
const mockFromCombined = jest.fn();

jest.mock("expo-crypto", () => ({
  AESSealedData: {
    fromCombined: (...args: unknown[]) => mockFromCombined(...args),
  },
  aesDecryptAsync: (...args: unknown[]) => mockDecrypt(...args),
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
    jest.mocked(getKey).mockResolvedValue({
      encoded: "local-key",
      source: "local",
      value: { id: "good" },
    } as never);
    jest.mocked(getServerKey).mockResolvedValue(null);
    jest.mocked(saveWrappedKey).mockResolvedValue();
  });

  it("지원하지 않는 metadata는 키를 조회하기 전에 거부한다", async () => {
    await expect(
      decryptContent({ ...encrypted, metadata: {} })
    ).rejects.toBeInstanceOf(ScheduleContentUnrecoverableError);
    expect(getKey).not.toHaveBeenCalled();
    expect(mockDecrypt).not.toHaveBeenCalled();
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

  it("서버 key 복구 오류를 그대로 전파한다", async () => {
    const error = new Error("서버 key 복구 실패");
    jest.mocked(getKey).mockResolvedValue({
      encoded: "wrong-key",
      source: "local",
      value: { id: "wrong" },
    } as never);
    jest.mocked(getServerKey).mockRejectedValue(error);

    await expect(decryptContent(encrypted)).rejects.toBe(error);
  });

  it.each([false, true])(
    "서버 key가 없거나 틀리면 복구 불가로 분류한다: 존재=%s",
    async (exists) => {
      jest.mocked(getKey).mockResolvedValue({
        encoded: "wrong-key",
        source: "local",
        value: { id: "wrong" },
      } as never);
      jest.mocked(getServerKey).mockResolvedValue(
        exists
          ? ({
              encoded: "wrong-server-key",
              source: "server",
              value: { id: "wrong" },
            } as never)
          : null
      );

      await expect(decryptContent(encrypted)).rejects.toBeInstanceOf(
        ScheduleContentUnrecoverableError
      );
    }
  );

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

  it("복호화 key 캐시는 사용자와 버전이 다른 내용을 섞지 않는다", async () => {
    jest.mocked(getKey).mockImplementation(
      async ({ userId, keyVersion }) =>
        ({
          source: "local",
          encoded: null,
          value: { id: `${userId}:${keyVersion}` },
        }) as never
    );
    mockDecrypt.mockImplementation(async (_sealed, key: { id: string }) =>
      new TextEncoder().encode(key.id)
    );
    const decrypt = createContentDecryptor();
    const contents = [
      { ...encrypted, userId: "A", keyVersion: 1 },
      { ...encrypted, userId: "B", keyVersion: 1 },
      { ...encrypted, userId: "A", keyVersion: 2 },
    ];
    const results = await Promise.all(contents.map(decrypt));
    expect(results.map(({ title }) => title)).toEqual(["A:1", "B:1", "A:2"]);
  });
});
