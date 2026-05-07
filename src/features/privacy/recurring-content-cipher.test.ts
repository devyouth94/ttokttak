import { recurringContentCipher } from "~/features/privacy/recurring-content-cipher";

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockEncoded = jest.fn();
const mockGenerate = jest.fn();

jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
}));

jest.mock("expo-crypto", () => ({
  AESEncryptionKey: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    import: jest.fn(),
  },
  AESSealedData: {
    fromCombined: jest.fn(),
  },
  aesDecryptAsync: jest.fn(),
  aesEncryptAsync: jest.fn(async () => ({
    combined: () => "ciphertext",
  })),
}));

describe("recurringContentCipher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemAsync.mockResolvedValue(null);
    mockEncoded.mockResolvedValue("generated-key");
    mockGenerate.mockResolvedValue({ encoded: mockEncoded });
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
});
