type JsonRecord = Record<string, unknown>;

export const wrapAlgorithm = "AES-GCM";
export const wrapMetadata = {
  binding: "user-key-version-v1",
  encoding: "combined-base64",
  keySource: "edge-secret-v2",
};

export function isCurrentWrapMetadata(
  metadata: JsonRecord | null | undefined
): boolean {
  return (
    metadata?.keySource === wrapMetadata.keySource &&
    metadata.binding === wrapMetadata.binding
  );
}

export function isLegacyWrapMetadata(
  metadata: JsonRecord | null | undefined
): boolean {
  return metadata?.keySource === legacyWrapKeySource;
}

export async function wrapContentKey(input: {
  encodedKey: string;
  keyVersion: number;
  userId: string;
}): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        additionalData: getAdditionalData(input.userId, input.keyVersion),
        iv,
        name: "AES-GCM",
      },
      await getWrappingKey(),
      new TextEncoder().encode(input.encodedKey)
    )
  );
  const combined = new Uint8Array(
    new ArrayBuffer(iv.length + encrypted.length)
  );

  combined.set(iv, 0);
  combined.set(encrypted, iv.length);

  return encodeBase64(combined);
}

export function unwrapContentKey(input: {
  keyVersion: number;
  userId: string;
  wrappedKey: string;
}): Promise<string> {
  return decryptContentKey({
    additionalData: getAdditionalData(input.userId, input.keyVersion),
    wrappedKey: input.wrappedKey,
  });
}

export function unwrapLegacyContentKey(wrappedKey: string): Promise<string> {
  return decryptContentKey({ wrappedKey });
}

const legacyWrapKeySource = "edge-secret-v1";

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function getWrappingKey(): Promise<CryptoKey> {
  const encodedSecret = Deno.env.get("TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64");

  if (!encodedSecret) {
    throw new Error(
      "TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64 is not configured"
    );
  }

  return crypto.subtle.importKey(
    "raw",
    decodeBase64(encodedSecret).buffer,
    "AES-GCM",
    false,
    ["decrypt", "encrypt"]
  );
}

function getAdditionalData(
  userId: string,
  keyVersion: number
): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(
    JSON.stringify(["ttokttak-content-key", userId, keyVersion])
  );
  const bytes = new Uint8Array(new ArrayBuffer(encoded.length));

  bytes.set(encoded);

  return bytes;
}

async function decryptContentKey(input: {
  additionalData?: Uint8Array<ArrayBuffer>;
  wrappedKey: string;
}): Promise<string> {
  const combined = decodeBase64(input.wrappedKey);
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const algorithm: AesGcmParams = { iv, name: "AES-GCM" };

  if (input.additionalData) {
    algorithm.additionalData = input.additionalData;
  }

  const decrypted = await crypto.subtle.decrypt(
    algorithm,
    await getWrappingKey(),
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
