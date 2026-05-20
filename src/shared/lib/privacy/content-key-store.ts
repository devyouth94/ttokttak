import { AESEncryptionKey } from "expo-crypto";
import { getItemAsync, setItemAsync } from "expo-secure-store";

import {
  getUserContentEncryptionKey,
  recoverUserContentKey,
  upsertUserContentEncryptionKey,
  wrapUserContentKeyForRecovery,
} from "~/shared/lib/privacy/user-content-encryption-keys-repository";

export type StoredContentKey = {
  encodedKey: string | null;
  key: AESEncryptionKey;
  source: "local" | "server";
};

export const contentKeyVersion = 1;

export function assertSupportedContentKeyVersion(keyVersion: number): void {
  if (keyVersion !== contentKeyVersion) {
    throw new Error("지원하지 않는 내용 암호화 키 버전입니다.");
  }
}

export function getContentKeySecureStoreKey(
  userId: string,
  keyVersion: number
): string {
  return `ttokttak.user-content-key.v${keyVersion}.${userId}`;
}

export async function upsertWrappedContentKey(params: {
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
  const secureStoreKey = getContentKeySecureStoreKey(userId, keyVersion);
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

export async function getServerWrappedContentKey(params: {
  keyVersion: number;
  userId: string;
}): Promise<StoredContentKey | null> {
  const { keyVersion, userId } = params;
  const secureStoreKey = getContentKeySecureStoreKey(userId, keyVersion);
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

export async function getContentKeyForDecrypt(params: {
  keyVersion: number;
  userId: string;
}): Promise<StoredContentKey> {
  const { keyVersion, userId } = params;

  assertSupportedContentKeyVersion(keyVersion);

  const key = await getStoredContentKey({
    keyVersion,
    userId,
  });

  if (!key) {
    throw new Error("내용 암호화 키를 복구할 수 없습니다.");
  }

  return key;
}

export async function getOrCreateContentKeyForEncrypt(
  userId: string
): Promise<AESEncryptionKey> {
  const secureStoreKey = getContentKeySecureStoreKey(userId, contentKeyVersion);
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
