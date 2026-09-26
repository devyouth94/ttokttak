import { createClient } from "@supabase/supabase-js";

import { isAppleAccount, revokeAppleAccountToken } from "./apple.ts";

type JsonRecord = Record<string, unknown>;

const deleteAccountRequestBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();
const maxDeleteAccountRequestsPerMinute = 3;

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
    const revocationResult = await revokeAppleAccountToken({
      authorizationCode: body.appleAuthorizationCode,
      user,
    });

    if (revocationResult === "identity_mismatch") {
      return jsonResponse({ error: "apple_identity_mismatch" }, 403);
    }

    if (revocationResult === "revoke_failed") {
      return jsonResponse({ error: "apple_revoke_failed" }, 502);
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
