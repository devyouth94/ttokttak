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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockGenerate.mockResolvedValue({ encoded: jest.fn() });
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

it("로컬 key가 없으면 서버 key를 사용자 저장소에 저장해 사용한다", async () => {
  const storage = new Map<string, string>();
  mockGetItem.mockImplementation(async (id: string) => storage.get(id) ?? null);
  mockSetItem.mockImplementation(async (id: string, value: string) => {
    storage.set(id, value);
  });
  jest.mocked(recoverContentKey).mockResolvedValue("server-key");

  await expect(getOrCreateKey("user-1")).resolves.toEqual({
    value: "server-key",
  });
  expect(mockSetItem).toHaveBeenCalledWith(
    "ttokttak.user-content-key.v1.user-1",
    "server-key"
  );
  expect(mockGenerate).not.toHaveBeenCalled();
});

it.each(["secure-store", "server-lookup", "server-recover"] as const)(
  "%s 일시적 오류는 새 key를 만들지 않고 전달한다",
  async (stage) => {
    const error = new Error(`${stage} 실패`);

    if (stage === "secure-store") {
      mockGetItem.mockRejectedValue(error);
    } else if (stage === "server-lookup") {
      mockGetItem.mockResolvedValue("local-key");
      jest.mocked(findContentKey).mockRejectedValue(error);
    } else {
      jest.mocked(recoverContentKey).mockRejectedValue(error);
    }

    await expect(getOrCreateKey("user-1")).rejects.toBe(error);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(saveContentKey).not.toHaveBeenCalled();
  }
);

it("실제 key 부재와 지원하지 않는 version은 복구 불가로 분류한다", async () => {
  await expect(
    getKey({ keyVersion: 1, userId: "user-1" })
  ).rejects.toBeInstanceOf(ScheduleContentUnrecoverableError);
  await expect(
    getKey({ keyVersion: 2, userId: "user-1" })
  ).rejects.toBeInstanceOf(ScheduleContentUnrecoverableError);
  expect(mockGenerate).not.toHaveBeenCalled();
});
