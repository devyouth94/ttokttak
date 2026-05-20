import {
  type AesGcmContentEncryptionMetadata,
  assertAesGcmContentEncryptionMetadata,
  decryptTextWithAesGcm,
  encryptTextWithAesGcm,
} from "~/shared/lib/privacy/aes-gcm-content-cipher";
import {
  contentKeyVersion,
  getContentKeyForDecrypt,
  getOrCreateContentKeyForEncrypt,
  getServerWrappedContentKey,
  type StoredContentKey,
  upsertWrappedContentKey,
} from "~/shared/lib/privacy/content-key-store";

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

async function decryptContentWithKey(params: {
  content: EncryptedRecurringItemContent;
  key: StoredContentKey["key"];
}): Promise<DecryptedRecurringItemContent> {
  const { content, key } = params;

  return {
    description: content.descriptionCiphertext
      ? await decryptTextWithAesGcm(content.descriptionCiphertext, key)
      : null,
    title: await decryptTextWithAesGcm(content.titleCiphertext, key),
  };
}

async function getRecurringContentKeyForDecrypt(params: {
  keyVersion: number;
  userId: string;
}): Promise<StoredContentKey> {
  try {
    return await getContentKeyForDecrypt(params);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message === "내용 암호화 키를 복구할 수 없습니다.") {
      throw new Error("일정 내용 암호화 키를 복구할 수 없습니다.");
    }

    if (error.message === "지원하지 않는 내용 암호화 키 버전입니다.") {
      throw new Error("지원하지 않는 일정 내용 암호화 키 버전입니다.");
    }

    throw error;
  }
}

export const recurringContentCipher: RecurringItemContentCipher = {
  async decryptRecurringItemContent(content) {
    const metadata = assertRecurringItemContentEncryptionMetadata(
      content.metadata
    );
    const storedKey = await getRecurringContentKeyForDecrypt({
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
        description !== null
          ? await encryptTextWithAesGcm(description, key)
          : null,
      keyVersion: contentKeyVersion,
      metadata: {
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "server-wrapped",
      },
      titleCiphertext: await encryptTextWithAesGcm(title, key),
    };
  },
};

function assertRecurringItemContentEncryptionMetadata(
  metadata: RecurringItemContentEncryptionMetadata
): AesGcmContentEncryptionMetadata {
  try {
    return assertAesGcmContentEncryptionMetadata(metadata);
  } catch {
    throw new Error("일정 내용 암호화 메타데이터를 읽을 수 없습니다.");
  }
}
