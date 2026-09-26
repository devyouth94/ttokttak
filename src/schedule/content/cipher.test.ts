import { decryptContent } from "./cipher";
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

beforeEach(() => {
  jest.clearAllMocks();
  mockFromCombined.mockReturnValue({});
  mockDecrypt.mockImplementation(async (_sealed, key: { id: string }) => {
    if (key.id.startsWith("wrong")) {
      throw new Error("복호화 실패");
    }

    return new TextEncoder().encode("일정");
  });
  jest.mocked(getKey).mockResolvedValue({
    encoded: "local-key",
    source: "local",
    value: { id: "local" },
  } as never);
  jest.mocked(getServerKey).mockResolvedValue(null);
  jest.mocked(saveWrappedKey).mockResolvedValue();
});

it("로컬 key 복호화 실패 뒤 서버 key로 한 번 복구한다", async () => {
  jest.mocked(getKey).mockResolvedValue({
    encoded: "wrong-local-key",
    source: "local",
    value: { id: "wrong-local" },
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
  expect(getServerKey).toHaveBeenCalledTimes(1);
  expect(mockDecrypt).toHaveBeenCalledTimes(2);
});

it("서버 key 복구의 일시적 오류를 복구 불가로 바꾸지 않는다", async () => {
  const error = new Error("서버 key 복구 실패");
  jest.mocked(getKey).mockResolvedValue({
    encoded: "wrong-local-key",
    source: "local",
    value: { id: "wrong-local" },
  } as never);
  jest.mocked(getServerKey).mockRejectedValue(error);

  await expect(decryptContent(encrypted)).rejects.toBe(error);
});

it.each([
  ["실제 key 부재", null],
  [
    "복구한 key로도 복호화 불가",
    {
      encoded: "wrong-server-key",
      source: "server",
      value: { id: "wrong-server" },
    },
  ],
] as const)("%s는 복구 불가로 분류한다", async (_label, serverKey) => {
  jest.mocked(getKey).mockResolvedValue({
    encoded: "wrong-local-key",
    source: "local",
    value: { id: "wrong-local" },
  } as never);
  jest.mocked(getServerKey).mockResolvedValue(serverKey as never);

  await expect(decryptContent(encrypted)).rejects.toBeInstanceOf(
    ScheduleContentUnrecoverableError
  );
  expect(getServerKey).toHaveBeenCalledTimes(1);
});

it("지원하지 않는 metadata는 key I/O 전에 복구 불가로 분류한다", async () => {
  await expect(
    decryptContent({ ...encrypted, metadata: { algorithm: "unknown" } })
  ).rejects.toBeInstanceOf(ScheduleContentUnrecoverableError);
  expect(getKey).not.toHaveBeenCalled();
  expect(getServerKey).not.toHaveBeenCalled();
});
