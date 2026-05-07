import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

type RequestBody =
  | {
      action: "recover";
      keyVersion: number;
    }
  | {
      action: "wrap";
      encodedKey: string;
      keyVersion: number;
    };

type UserContentEncryptionKeyRow = {
  wrap_algorithm: string;
  wrap_metadata: JsonRecord;
  wrapped_key: string;
};

const wrapAlgorithm = "AES-GCM";
const wrapMetadata = {
  encoding: "combined-base64",
  keySource: "edge-secret-v1",
};
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const maxRequestsPerMinute = 12;

function jsonResponse(body: JsonRecord, status = 200): Response {
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function getWrappingKey(): Promise<CryptoKey> {
  const encodedSecret = Deno.env.get("TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64");

  if (!encodedSecret) {
    throw new Error(
      "TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64 is not configured"
    );
  }

  return crypto.subtle.importKey(
    "raw",
    decodeBase64(encodedSecret),
    "AES-GCM",
    false,
    ["decrypt", "encrypt"]
  );
}

async function encryptContentKey(encodedKey: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        iv,
        name: "AES-GCM",
      },
      await getWrappingKey(),
      new TextEncoder().encode(encodedKey)
    )
  );
  const combined = new Uint8Array(iv.length + encrypted.length);

  combined.set(iv, 0);
  combined.set(encrypted, iv.length);

  return encodeBase64(combined);
}

async function decryptContentKey(wrappedKey: string): Promise<string> {
  const combined = decodeBase64(wrappedKey);
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    {
      iv,
      name: "AES-GCM",
    },
    await getWrappingKey(),
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

function getAuthorizationHeader(req: Request): string | null {
  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization;
}

function isRequestBody(value: unknown): value is RequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.action === "recover" &&
    Number.isInteger(candidate.keyVersion)
  ) {
    return true;
  }

  return (
    candidate.action === "wrap" &&
    Number.isInteger(candidate.keyVersion) &&
    typeof candidate.encodedKey === "string" &&
    candidate.encodedKey.length > 0
  );
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const bucket = requestBuckets.get(userId);

  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(userId, {
      count: 1,
      resetAt: now + 60_000,
    });
    return true;
  }

  if (bucket.count >= maxRequestsPerMinute) {
    return false;
  }

  bucket.count += 1;
  return true;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authorization = getAuthorizationHeader(req);

  if (!authorization) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey =
    Deno.env.get("SB_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "server_not_configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  if (!checkRateLimit(user.id)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const body = await req.json().catch(() => null);

  if (!isRequestBody(body)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  console.info("content_key_recovery", {
    action: body.action,
    keyVersion: body.keyVersion,
    userId: user.id,
  });

  if (body.action === "wrap") {
    return jsonResponse({
      wrapAlgorithm,
      wrapMetadata,
      wrappedKey: await encryptContentKey(body.encodedKey),
    });
  }

  const { data, error } = await supabase
    .from("user_content_encryption_keys")
    .select("wrap_algorithm, wrap_metadata, wrapped_key")
    .eq("user_id", user.id)
    .eq("key_version", body.keyVersion)
    .maybeSingle<UserContentEncryptionKeyRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return jsonResponse({ encodedKey: null });
  }

  if (
    data.wrap_algorithm !== wrapAlgorithm ||
    data.wrap_metadata?.keySource !== wrapMetadata.keySource
  ) {
    return jsonResponse({ error: "unsupported_wrapped_key" }, 422);
  }

  return jsonResponse({
    encodedKey: await decryptContentKey(data.wrapped_key),
  });
});
