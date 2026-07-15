import { createClient, type User } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type AppleIdentity = {
  id?: string;
  identity_data?: JsonRecord | null;
  provider?: string;
  provider_id?: string;
};
type AppleTokenResponse = {
  access_token?: string;
  error?: string;
  id_token?: string;
  refresh_token?: string;
};
type AppleTokenRevokeResult = {
  appleSubject: string | null;
  ok: boolean;
};

const deleteAccountRequestBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();
const maxDeleteAccountRequestsPerMinute = 3;

function jsonResponse(body: JsonRecord, status = 200): Response {
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function getAuthorizationHeader(req: Request): string | null {
  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization;
}

function isConfirmedRequestBody(
  value: unknown
): value is { appleAuthorizationCode?: string; confirm: true } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as Record<string, unknown>).confirm === true &&
    (typeof (value as Record<string, unknown>).appleAuthorizationCode ===
      "string" ||
      (value as Record<string, unknown>).appleAuthorizationCode === undefined)
  );
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string): string | null {
  const base64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  try {
    return atob(paddedBase64);
  } catch {
    return null;
  }
}

function getJwtPayload(jwt: string): JsonRecord | null {
  const [, encodedPayload] = jwt.split(".");

  if (!encodedPayload) {
    return null;
  }

  const payload = base64UrlDecode(encodedPayload);

  if (!payload) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(payload);

    return parsedPayload && typeof parsedPayload === "object"
      ? (parsedPayload as JsonRecord)
      : null;
  } catch {
    return null;
  }
}

function getAppleSubjectFromIdToken(
  idToken: string | undefined
): string | null {
  if (!idToken) {
    return null;
  }

  const payload = getJwtPayload(idToken);
  const subject = payload?.sub;

  return typeof subject === "string" && subject ? subject : null;
}

function isAppleProvider(value: unknown): boolean {
  return value === "apple";
}

function isAppleAccount(user: User): boolean {
  const appMetadata = user.app_metadata;
  const provider = appMetadata?.provider;
  const providers = appMetadata?.providers;
  const identities = user.identities;

  return (
    isAppleProvider(provider) ||
    (Array.isArray(providers) && providers.some(isAppleProvider)) ||
    (Array.isArray(identities) &&
      identities.some((identity) => {
        if (!identity || typeof identity !== "object") {
          return false;
        }

        return isAppleProvider(identity.provider);
      }))
  );
}

function getAppleIdentitySubjects(user: User): string[] {
  const identities = user.identities;

  if (!Array.isArray(identities)) {
    return [];
  }

  return identities.flatMap((identity) => {
    if (!identity || typeof identity !== "object") {
      return [];
    }

    const identityRecord: AppleIdentity = identity;

    if (!isAppleProvider(identityRecord.provider)) {
      return [];
    }

    const identityData =
      identityRecord.identity_data &&
      typeof identityRecord.identity_data === "object"
        ? (identityRecord.identity_data as JsonRecord)
        : null;
    const candidates = [
      identityRecord.provider_id,
      identityRecord.id,
      identityData?.sub,
    ];

    return candidates.filter(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.length > 0
    );
  });
}

function isMatchingAppleSubject({
  appleSubject,
  user,
}: {
  appleSubject: string | null;
  user: User;
}): boolean {
  if (!appleSubject) {
    return false;
  }

  const appleIdentitySubjects = getAppleIdentitySubjects(user);

  return appleIdentitySubjects.includes(appleSubject);
}

function checkDeleteAccountRateLimit(userId: string): boolean {
  const now = Date.now();
  const bucket = deleteAccountRequestBuckets.get(userId);

  if (!bucket || bucket.resetAt <= now) {
    deleteAccountRequestBuckets.set(userId, {
      count: 1,
      resetAt: now + 60_000,
    });
    return true;
  }

  if (bucket.count >= maxDeleteAccountRequestsPerMinute) {
    return false;
  }

  bucket.count += 1;
  return true;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalizedPem = pem.replaceAll("\\n", "\n");
  const base64 = normalizedPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function createAppleClientSecret({
  clientId,
  keyId,
  privateKey,
  teamId,
}: {
  clientId: string;
  keyId: string;
  privateKey: string;
  teamId: string;
}): Promise<string> {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };
  const payload = {
    aud: "https://appleid.apple.com",
    exp: nowInSeconds + 60 * 10,
    iat: nowInSeconds,
    iss: teamId,
    sub: clientId,
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    {
      hash: "SHA-256",
      name: "ECDSA",
    },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function revokeAppleAuthorizationCode(
  authorizationCode: string
): Promise<AppleTokenRevokeResult> {
  const teamId = Deno.env.get("APPLE_TEAM_ID");
  const keyId = Deno.env.get("APPLE_KEY_ID");
  const clientId = Deno.env.get("APPLE_CLIENT_ID");
  const privateKey = Deno.env.get("APPLE_PRIVATE_KEY");

  if (!teamId || !keyId || !clientId || !privateKey) {
    return { appleSubject: null, ok: false };
  }

  const clientSecret = await createAppleClientSecret({
    clientId,
    keyId,
    privateKey,
    teamId,
  });
  const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!tokenResponse.ok) {
    return { appleSubject: null, ok: false };
  }

  const tokenBody = (await tokenResponse
    .json()
    .catch(() => null)) as AppleTokenResponse | null;
  const appleSubject = getAppleSubjectFromIdToken(tokenBody?.id_token);
  const token = tokenBody?.refresh_token ?? tokenBody?.access_token;
  const tokenTypeHint = tokenBody?.refresh_token
    ? "refresh_token"
    : "access_token";

  if (!token) {
    return { appleSubject, ok: false };
  }

  const revokeResponse = await fetch("https://appleid.apple.com/auth/revoke", {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokenTypeHint,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  return { appleSubject, ok: revokeResponse.ok };
}

export async function handleDeleteAccountRequest(
  req: Request
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authorization = getAuthorizationHeader(req);

  if (!authorization) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const body = await req.json().catch(() => null);

  if (!isConfirmedRequestBody(body)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey =
    Deno.env.get("SB_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "server_not_configured" }, 500);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  if (!checkDeleteAccountRateLimit(user.id)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const shouldRevokeAppleToken = isAppleAccount(user);

  if (shouldRevokeAppleToken && !body.appleAuthorizationCode) {
    return jsonResponse({ error: "apple_authorization_required" }, 400);
  }

  if (shouldRevokeAppleToken && body.appleAuthorizationCode) {
    const revokeResult = await revokeAppleAuthorizationCode(
      body.appleAuthorizationCode
    );

    if (!revokeResult.ok) {
      return jsonResponse({ error: "apple_revoke_failed" }, 502);
    }

    if (
      !isMatchingAppleSubject({
        appleSubject: revokeResult.appleSubject,
        user,
      })
    ) {
      return jsonResponse({ error: "apple_identity_mismatch" }, 403);
    }
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id
  );

  if (deleteError) {
    return jsonResponse({ error: "server_error" }, 500);
  }

  return jsonResponse({ ok: true });
}
