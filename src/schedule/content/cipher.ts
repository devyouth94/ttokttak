import {
  aesDecryptAsync,
  aesEncryptAsync,
  type AESEncryptionKey,
  AESSealedData,
} from "expo-crypto";

import {
  getKey,
  getOrCreateKey,
  getServerKey,
  type Key,
  keyVersion,
  saveWrappedKey,
} from "./key";
import { ScheduleContentUnrecoverableError } from "../errors";

type EncryptedContent = {
  descriptionCiphertext: string | null;
  keyVersion: number;
  metadata: Record<string, unknown>;
  titleCiphertext: string;
};

type DecryptedContent = {
  description: string | null;
  title: string;
};

type Metadata = {
  algorithm: "AES-GCM";
  encoding: "combined-base64";
  keyStorage: "expo-secure-store" | "server-wrapped";
};

/** 일정 제목과 설명을 암호화한다. */
export async function encryptContent(input: {
  description: string | null;
  title: string;
  userId: string;
}): Promise<EncryptedContent> {
  const key = await getOrCreateKey(input.userId);

  return {
    descriptionCiphertext:
      input.description !== null
        ? await encryptText(input.description, key)
        : null,
    keyVersion,
    metadata: {
      algorithm: "AES-GCM",
      encoding: "combined-base64",
      keyStorage: "server-wrapped",
    },
    titleCiphertext: await encryptText(input.title, key),
  };
}

/** 일정 제목과 설명을 복호화한다. */
export function decryptContent(
  content: EncryptedContent & { userId: string }
): Promise<DecryptedContent> {
  return decrypt(content, getKey, getServerKey, saveWrappedKey);
}

/** 한 목록 안에서 같은 content key 조회를 공유하는 복호화 함수를 만든다. */
export function createContentDecryptor(): typeof decryptContent {
  const keys = new Map<string, Promise<Key>>();
  const serverKeys = new Map<string, Promise<Key | null>>();
  const wrappedKeys = new Map<string, Promise<void>>();

  return (content) => {
    const id = JSON.stringify([content.userId, content.keyVersion]);

    return decrypt(
      content,
      (input) => getSharedPromise(keys, id, () => getKey(input)),
      (input) => getSharedPromise(serverKeys, id, () => getServerKey(input)),
      (input) => getSharedPromise(wrappedKeys, id, () => saveWrappedKey(input))
    );
  };
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from([...atob(value)], (char) => char.charCodeAt(0));
}

async function encryptText(value: string, key: AESEncryptionKey) {
  const sealed = await aesEncryptAsync(new TextEncoder().encode(value), key);

  return sealed.combined("base64");
}

async function decryptText(ciphertext: string, key: AESEncryptionKey) {
  const sealed = AESSealedData.fromCombined(base64ToBytes(ciphertext));
  const decrypted = await aesDecryptAsync(sealed, key);

  return new TextDecoder().decode(decrypted);
}

function assertMetadata(metadata: Record<string, unknown>): Metadata {
  if (
    metadata.algorithm !== "AES-GCM" ||
    metadata.encoding !== "combined-base64" ||
    (metadata.keyStorage !== "server-wrapped" &&
      metadata.keyStorage !== "expo-secure-store")
  ) {
    throw new ScheduleContentUnrecoverableError(
      "일정 내용 암호화 메타데이터를 읽을 수 없습니다."
    );
  }

  return metadata as Metadata;
}

async function decryptWithKey(
  content: EncryptedContent,
  key: Key["value"]
): Promise<DecryptedContent> {
  return {
    description: content.descriptionCiphertext
      ? await decryptText(content.descriptionCiphertext, key)
      : null,
    title: await decryptText(content.titleCiphertext, key),
  };
}

async function decrypt(
  content: EncryptedContent & { userId: string },
  loadKey: typeof getKey,
  loadServerKey: typeof getServerKey,
  storeWrappedKey: typeof saveWrappedKey
): Promise<DecryptedContent> {
  const metadata = assertMetadata(content.metadata);
  const input = {
    keyVersion: content.keyVersion,
    userId: content.userId,
  };
  const key = await loadKey(input);
  let decrypted: DecryptedContent;

  try {
    decrypted = await decryptWithKey(content, key.value);
  } catch {
    if (key.source === "server") {
      throw new ScheduleContentUnrecoverableError();
    }

    const serverKey = await loadServerKey(input);

    if (!serverKey) {
      throw new ScheduleContentUnrecoverableError();
    }

    try {
      return await decryptWithKey(content, serverKey.value);
    } catch {
      throw new ScheduleContentUnrecoverableError();
    }
  }

  if (
    key.source === "local" &&
    key.encoded &&
    metadata.keyStorage === "expo-secure-store"
  ) {
    await storeWrappedKey({ ...input, encodedKey: key.encoded });
  }

  return decrypted;
}

function getSharedPromise<Value>(
  promises: Map<string, Promise<Value>>,
  key: string,
  load: () => Promise<Value>
): Promise<Value> {
  const promise = promises.get(key) ?? load();
  promises.set(key, promise);
  return promise;
}
