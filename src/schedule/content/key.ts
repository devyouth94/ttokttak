import { AESEncryptionKey } from "expo-crypto";
import { getItemAsync, setItemAsync } from "expo-secure-store";

import {
  findContentKey,
  recoverContentKey,
  saveContentKey,
  wrapContentKey,
} from "../db/content-key";

export type Key = {
  encoded: string | null;
  value: AESEncryptionKey;
  source: "local" | "server";
};

export const keyVersion = 1;

function assertVersion(version: number): void {
  if (version !== keyVersion) {
    throw new Error("지원하지 않는 일정 내용 암호화 키 버전입니다.");
  }
}

function getStoreKey(userId: string, version: number): string {
  return `ttokttak.user-content-key.v${version}.${userId}`;
}

/** content key를 서버 복구용 key로 감싸 저장한다. */
export async function saveWrappedKey(input: {
  encodedKey: string;
  keyVersion: number;
  userId: string;
}): Promise<void> {
  const wrapped = await wrapContentKey({
    encodedKey: input.encodedKey,
    keyVersion: input.keyVersion,
  });

  await saveContentKey({
    keyVersion: input.keyVersion,
    userId: input.userId,
    wrapAlgorithm: wrapped.wrapAlgorithm,
    wrapMetadata: wrapped.wrapMetadata,
    wrappedKey: wrapped.wrappedKey,
  });
}

async function backfillWrappedKey(input: {
  encodedKey: string;
  keyVersion: number;
  userId: string;
}): Promise<void> {
  if (
    await findContentKey({
      keyVersion: input.keyVersion,
      userId: input.userId,
    })
  ) {
    return;
  }

  await saveWrappedKey(input);
}

async function getStoredKey(input: {
  keyVersion: number;
  userId: string;
}): Promise<Key | null> {
  const storeKey = getStoreKey(input.userId, input.keyVersion);
  const encoded = await getItemAsync(storeKey);

  if (!encoded) {
    return getServerKey(input);
  }

  await backfillWrappedKey({ ...input, encodedKey: encoded });

  return {
    encoded,
    source: "local",
    value: await AESEncryptionKey.import(encoded, "base64"),
  };
}

/** 서버에서 content key를 복구하고 기기에 저장한다. */
export async function getServerKey(input: {
  keyVersion: number;
  userId: string;
}): Promise<Key | null> {
  const encoded = await recoverContentKey(input.keyVersion);

  if (!encoded) {
    return null;
  }

  await setItemAsync(getStoreKey(input.userId, input.keyVersion), encoded);

  return {
    encoded,
    source: "server",
    value: await AESEncryptionKey.import(encoded, "base64"),
  };
}

/** 복호화에 사용할 content key를 기기 또는 서버에서 읽는다. */
export async function getKey(input: {
  keyVersion: number;
  userId: string;
}): Promise<Key> {
  assertVersion(input.keyVersion);

  const key = await getStoredKey(input);

  if (!key) {
    throw new Error("일정 내용 암호화 키를 복구할 수 없습니다.");
  }

  return key;
}

/** 암호화에 사용할 content key를 읽거나 새로 만든다. */
export async function getOrCreateKey(
  userId: string
): Promise<AESEncryptionKey> {
  const input = { keyVersion, userId };
  const stored = await getStoredKey(input);

  if (stored) {
    return stored.value;
  }

  const key = await AESEncryptionKey.generate();
  const encodedKey = await key.encoded("base64");

  await saveWrappedKey({ ...input, encodedKey });
  await setItemAsync(getStoreKey(userId, keyVersion), encodedKey);

  return key;
}
