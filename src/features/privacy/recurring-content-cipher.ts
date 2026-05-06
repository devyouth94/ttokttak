import {
  aesDecryptAsync,
  aesEncryptAsync,
  AESEncryptionKey,
  AESSealedData,
} from "expo-crypto";
import { getItemAsync, setItemAsync } from "expo-secure-store";

export type RecurringItemContentEncryptionMetadata = Record<string, unknown>;

export type EncryptedRecurringItemContent = {
  descriptionCiphertext: string | null;
  keyVersion: number;
  metadata: RecurringItemContentEncryptionMetadata;
  titleCiphertext: string;
};

export type DecryptedRecurringItemContent = {
  description: string | null;
  title: string;
};

export type RecurringItemContentCipher = {
  decryptRecurringItemContent: (
    content: EncryptedRecurringItemContent & { userId: string }
  ) => Promise<DecryptedRecurringItemContent>;
  encryptRecurringItemContent: (content: {
    description: string | null;
    title: string;
    userId: string;
  }) => Promise<EncryptedRecurringItemContent>;
};

type AesGcmMetadata = {
  algorithm: "AES-GCM";
  encoding: "combined-base64";
  keyStorage: "expo-secure-store";
};

const contentKeyVersion = 1;

function getSecureStoreKey(userId: string): string {
  return `ttokttak:user-content-key:v${contentKeyVersion}:${userId}`;
}

async function getOrCreateContentKey(
  userId: string
): Promise<AESEncryptionKey> {
  const secureStoreKey = getSecureStoreKey(userId);
  const storedKey = await getItemAsync(secureStoreKey);

  if (storedKey) {
    return AESEncryptionKey.import(storedKey, "base64");
  }

  const key = await AESEncryptionKey.generate();
  await setItemAsync(secureStoreKey, await key.encoded("base64"));

  return key;
}

async function encryptText(
  value: string,
  key: AESEncryptionKey
): Promise<string> {
  const sealedData = await aesEncryptAsync(
    new TextEncoder().encode(value),
    key
  );
  return sealedData.combined("base64");
}

async function decryptText(
  ciphertext: string,
  key: AESEncryptionKey
): Promise<string> {
  const sealedData = AESSealedData.fromCombined(ciphertext);
  const decrypted = await aesDecryptAsync(sealedData, key);
  return new TextDecoder().decode(decrypted);
}

function assertAesGcmMetadata(
  metadata: RecurringItemContentEncryptionMetadata
): AesGcmMetadata {
  if (
    metadata.algorithm !== "AES-GCM" ||
    metadata.encoding !== "combined-base64" ||
    metadata.keyStorage !== "expo-secure-store"
  ) {
    throw new Error("일정 내용 암호화 메타데이터를 읽을 수 없습니다.");
  }

  return metadata as AesGcmMetadata;
}

export const recurringContentCipher: RecurringItemContentCipher = {
  async decryptRecurringItemContent(content) {
    assertAesGcmMetadata(content.metadata);
    const key = await getOrCreateContentKey(content.userId);

    return {
      description: content.descriptionCiphertext
        ? await decryptText(content.descriptionCiphertext, key)
        : null,
      title: await decryptText(content.titleCiphertext, key),
    };
  },
  async encryptRecurringItemContent({ description, title, userId }) {
    const key = await getOrCreateContentKey(userId);

    return {
      descriptionCiphertext:
        description !== null ? await encryptText(description, key) : null,
      keyVersion: contentKeyVersion,
      metadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "expo-secure-store",
      },
      titleCiphertext: await encryptText(title, key),
    };
  },
};
