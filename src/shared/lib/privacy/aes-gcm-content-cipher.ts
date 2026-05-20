import {
  aesDecryptAsync,
  aesEncryptAsync,
  type AESEncryptionKey,
  AESSealedData,
} from "expo-crypto";

export type AesGcmContentEncryptionMetadata = {
  algorithm: "AES-GCM";
  encoding: "combined-base64";
  keyStorage: "expo-secure-store" | "server-wrapped";
};

export async function encryptTextWithAesGcm(
  value: string,
  key: AESEncryptionKey
): Promise<string> {
  const sealedData = await aesEncryptAsync(
    new TextEncoder().encode(value),
    key
  );

  return sealedData.combined("base64");
}

export async function decryptTextWithAesGcm(
  ciphertext: string,
  key: AESEncryptionKey
): Promise<string> {
  const sealedData = AESSealedData.fromCombined(base64ToBytes(ciphertext));
  const decrypted = await aesDecryptAsync(sealedData, key);

  return new TextDecoder().decode(decrypted);
}

export function base64ToBytes(value: string): Uint8Array {
  const binaryString = atob(value);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

export function assertAesGcmContentEncryptionMetadata(
  metadata: Record<string, unknown>
): AesGcmContentEncryptionMetadata {
  if (
    metadata.algorithm !== "AES-GCM" ||
    metadata.encoding !== "combined-base64" ||
    (metadata.keyStorage !== "server-wrapped" &&
      metadata.keyStorage !== "expo-secure-store")
  ) {
    throw new Error("암호화 메타데이터를 읽을 수 없습니다.");
  }

  return metadata as AesGcmContentEncryptionMetadata;
}
