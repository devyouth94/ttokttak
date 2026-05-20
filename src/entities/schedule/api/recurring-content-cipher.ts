import {
  aesDecryptAsync,
  aesEncryptAsync,
  AESEncryptionKey,
  AESSealedData,
} from "expo-crypto";
import { getItemAsync, setItemAsync } from "expo-secure-store";

import {
  getUserContentEncryptionKey,
  recoverUserContentKey,
  upsertUserContentEncryptionKey,
  wrapUserContentKeyForRecovery,
} from "~/shared/lib/privacy/user-content-encryption-keys-repository";

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
  keyStorage: "expo-secure-store" | "server-wrapped";
};

type StoredContentKey = {
  encodedKey: string | null;
  key: AESEncryptionKey;
  source: "local" | "server";
};

const contentKeyVersion = 1;

function assertSupportedKeyVersion(keyVersion: number): void {
  if (keyVersion !== contentKeyVersion) {
    throw new Error("지원하지 않는 일정 내용 암호화 키 버전입니다.");
  }
}

function getSecureStoreKey(userId: string, keyVersion: number): string {
  return `ttokttak.user-content-key.v${keyVersion}.${userId}`;
}

async function upsertWrappedContentKey(params: {
  encodedKey: string;
  keyVersion: number;
  userId: string;
}): Promise<void> {
  const { encodedKey, keyVersion, userId } = params;
  const wrappedContentKey = await wrapUserContentKeyForRecovery({
    encodedKey,
    keyVersion,
  });

  await upsertUserContentEncryptionKey({
    keyVersion,
    userId,
    wrapAlgorithm: wrappedContentKey.wrapAlgorithm,
    wrapMetadata: wrappedContentKey.wrapMetadata,
    wrappedKey: wrappedContentKey.wrappedKey,
  });
}

async function backfillServerWrappedKeyIfNeeded(params: {
  encodedKey: string;
  keyVersion: number;
  userId: string;
}): Promise<void> {
  const { encodedKey, keyVersion, userId } = params;
  const serverKey = await getUserContentEncryptionKey({
    keyVersion,
    userId,
  });

  if (serverKey) {
    return;
  }

  await upsertWrappedContentKey({
    encodedKey,
    keyVersion,
    userId,
  });
}

async function getStoredContentKey(params: {
  keyVersion: number;
  userId: string;
}): Promise<StoredContentKey | null> {
  const { keyVersion, userId } = params;
  const secureStoreKey = getSecureStoreKey(userId, keyVersion);
  const storedKey = await getItemAsync(secureStoreKey);

  if (storedKey) {
    await backfillServerWrappedKeyIfNeeded({
      encodedKey: storedKey,
      keyVersion,
      userId,
    });

    return {
      encodedKey: storedKey,
      key: await AESEncryptionKey.import(storedKey, "base64"),
      source: "local",
    };
  }

  return getServerWrappedContentKey({
    keyVersion,
    userId,
  });
}

async function getServerWrappedContentKey(params: {
  keyVersion: number;
  userId: string;
}): Promise<StoredContentKey | null> {
  const { keyVersion, userId } = params;
  const secureStoreKey = getSecureStoreKey(userId, keyVersion);
  const recoveredKey = await recoverUserContentKey({
    keyVersion,
  });

  if (recoveredKey) {
    await setItemAsync(secureStoreKey, recoveredKey);

    return {
      encodedKey: recoveredKey,
      key: await AESEncryptionKey.import(recoveredKey, "base64"),
      source: "server",
    };
  }

  return null;
}

async function getContentKeyForDecrypt(params: {
  keyVersion: number;
  userId: string;
}): Promise<StoredContentKey> {
  const { keyVersion, userId } = params;

  assertSupportedKeyVersion(keyVersion);

  const key = await getStoredContentKey({
    keyVersion,
    userId,
  });

  if (!key) {
    throw new Error("일정 내용 암호화 키를 복구할 수 없습니다.");
  }

  return key;
}

async function getOrCreateContentKeyForEncrypt(
  userId: string
): Promise<AESEncryptionKey> {
  const secureStoreKey = getSecureStoreKey(userId, contentKeyVersion);
  const storedKey = await getStoredContentKey({
    keyVersion: contentKeyVersion,
    userId,
  });

  if (storedKey) {
    return storedKey.key;
  }

  const key = await AESEncryptionKey.generate();
  const encodedKey = await key.encoded("base64");

  await upsertWrappedContentKey({
    encodedKey,
    keyVersion: contentKeyVersion,
    userId,
  });
  await setItemAsync(secureStoreKey, encodedKey);

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
  const sealedData = AESSealedData.fromCombined(base64ToBytes(ciphertext));
  const decrypted = await aesDecryptAsync(sealedData, key);
  return new TextDecoder().decode(decrypted);
}

function base64ToBytes(value: string): Uint8Array {
  const binaryString = atob(value);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

async function decryptContentWithKey(params: {
  content: EncryptedRecurringItemContent;
  key: AESEncryptionKey;
}): Promise<DecryptedRecurringItemContent> {
  const { content, key } = params;

  return {
    description: content.descriptionCiphertext
      ? await decryptText(content.descriptionCiphertext, key)
      : null,
    title: await decryptText(content.titleCiphertext, key),
  };
}

function assertAesGcmMetadata(
  metadata: RecurringItemContentEncryptionMetadata
): AesGcmMetadata {
  if (
    metadata.algorithm !== "AES-GCM" ||
    metadata.encoding !== "combined-base64" ||
    (metadata.keyStorage !== "server-wrapped" &&
      metadata.keyStorage !== "expo-secure-store")
  ) {
    throw new Error("일정 내용 암호화 메타데이터를 읽을 수 없습니다.");
  }

  return metadata as AesGcmMetadata;
}

export const recurringContentCipher: RecurringItemContentCipher = {
  async decryptRecurringItemContent(content) {
    const metadata = assertAesGcmMetadata(content.metadata);
    const storedKey = await getContentKeyForDecrypt({
      keyVersion: content.keyVersion,
      userId: content.userId,
    });

    try {
      const decryptedContent = await decryptContentWithKey({
        content,
        key: storedKey.key,
      });

      if (
        storedKey.source === "local" &&
        storedKey.encodedKey &&
        metadata.keyStorage === "expo-secure-store"
      ) {
        await upsertWrappedContentKey({
          encodedKey: storedKey.encodedKey,
          keyVersion: content.keyVersion,
          userId: content.userId,
        });
      }

      return decryptedContent;
    } catch (error) {
      if (storedKey.source === "server") {
        throw error;
      }

      const serverKey = await getServerWrappedContentKey({
        keyVersion: content.keyVersion,
        userId: content.userId,
      });

      if (!serverKey) {
        throw error;
      }

      return decryptContentWithKey({
        content,
        key: serverKey.key,
      });
    }
  },
  async encryptRecurringItemContent({ description, title, userId }) {
    const key = await getOrCreateContentKeyForEncrypt(userId);

    return {
      descriptionCiphertext:
        description !== null ? await encryptText(description, key) : null,
      keyVersion: contentKeyVersion,
      metadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "server-wrapped",
      },
      titleCiphertext: await encryptText(title, key),
    };
  },
};
