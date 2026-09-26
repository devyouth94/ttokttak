import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  isCurrentWrapMetadata,
  isLegacyWrapMetadata,
  unwrapContentKey,
  unwrapLegacyContentKey,
  wrapAlgorithm,
  wrapContentKey,
  wrapMetadata,
} from "./content-key.ts";

type JsonRecord = Record<string, unknown>;
type Database = {
  public: {
    Functions: Record<string, never>;
    Tables: {
      content_key_recovery_audit_events: {
        Insert: {
          action: RecoveryAuditAction;
          key_version: number | null;
          result: RecoveryAuditResult;
          user_id: string;
        };
        Relationships: [];
        Row: {
          action: RecoveryAuditAction;
          key_version: number | null;
          result: RecoveryAuditResult;
          user_id: string;
        };
        Update: never;
      };
      user_content_encryption_keys: {
        Insert: {
          key_version: number;
          user_id: string;
          wrap_algorithm: string;
          wrap_metadata: JsonRecord;
          wrapped_key: string;
        };
        Relationships: [];
        Row: UserContentEncryptionKeyRow & {
          key_version: number;
          user_id: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
  };
};
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
type RecoveryAuditAction = RequestBody["action"] | "unknown";
type RecoveryAuditResult =
  | "denied"
  | "invalid_request"
  | "rate_limited"
  | "server_error"
  | "success";
type TtokttakSupabaseClient = SupabaseClient<Database>;

const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const maxRequestsPerMinute = 12;

export async function handleRecoverContentKeyRequest(
  req: Request
): Promise<Response> {
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
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "server_not_configured" }, 500);
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  const adminClient = createClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey
  );
  const userId = user.id;

  const body = await req.json().catch(() => null);
  const auditAction = getAuditAction(body);
  const auditKeyVersion = getAuditKeyVersion(body);

  async function recordAndRespond(
    result: RecoveryAuditResult,
    responseBody: JsonRecord,
    status = 200
  ): Promise<Response> {
    try {
      await recordRecoveryAuditEvent({
        action: auditAction,
        auditClient: adminClient,
        keyVersion: auditKeyVersion,
        result,
        userId,
      });
    } catch {
      return jsonResponse({ error: "server_error" }, 500);
    }

    return jsonResponse(responseBody, status);
  }

  if (!checkRateLimit(userId)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  if (!isRequestBody(body)) {
    return recordAndRespond(
      "invalid_request",
      { error: "invalid_request" },
      400
    );
  }

  console.info("content_key_recovery", {
    action: body.action,
    keyVersion: body.keyVersion,
    userId,
  });

  try {
    if (body.action === "wrap") {
      const wrappedKey = await wrapContentKey({
        encodedKey: body.encodedKey,
        keyVersion: body.keyVersion,
        userId,
      });

      await saveWrappedContentKey({
        adminClient,
        keyVersion: body.keyVersion,
        userId,
        wrappedKey,
      });

      return recordAndRespond("success", {
        wrapAlgorithm,
        wrapMetadata,
        wrappedKey,
      });
    }

    const { data, error } = await supabase
      .from("user_content_encryption_keys")
      .select("wrap_algorithm, wrap_metadata, wrapped_key")
      .eq("user_id", userId)
      .eq("key_version", body.keyVersion)
      .maybeSingle<UserContentEncryptionKeyRow>();

    if (error) {
      throw error;
    }

    if (!data) {
      return recordAndRespond("success", { encodedKey: null });
    }

    if (data.wrap_algorithm !== wrapAlgorithm) {
      return recordAndRespond(
        "denied",
        { error: "unsupported_wrapped_key" },
        422
      );
    }

    if (isLegacyWrapMetadata(data.wrap_metadata)) {
      const encodedKey = await unwrapLegacyContentKey(data.wrapped_key);
      const wrappedKey = await wrapContentKey({
        encodedKey,
        keyVersion: body.keyVersion,
        userId,
      });

      await saveWrappedContentKey({
        adminClient,
        keyVersion: body.keyVersion,
        userId,
        wrappedKey,
      });

      return recordAndRespond("success", { encodedKey });
    }

    if (!isCurrentWrapMetadata(data.wrap_metadata)) {
      return recordAndRespond(
        "denied",
        { error: "unsupported_wrapped_key" },
        422
      );
    }

    return recordAndRespond("success", {
      encodedKey: await unwrapContentKey({
        keyVersion: body.keyVersion,
        userId,
        wrappedKey: data.wrapped_key,
      }),
    });
  } catch {
    return recordAndRespond("server_error", { error: "server_error" }, 500);
  }
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

function getAuditAction(value: unknown): RecoveryAuditAction {
  if (!value || typeof value !== "object") {
    return "unknown";
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.action === "wrap" || candidate.action === "recover") {
    return candidate.action;
  }

  return "unknown";
}

function getAuditKeyVersion(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  return Number.isInteger(candidate.keyVersion)
    ? Number(candidate.keyVersion)
    : null;
}

async function recordRecoveryAuditEvent(params: {
  action: RecoveryAuditAction;
  auditClient: TtokttakSupabaseClient;
  keyVersion: number | null;
  result: RecoveryAuditResult;
  userId: string;
}): Promise<void> {
  const { action, auditClient, keyVersion, result, userId } = params;
  const { error } = await auditClient
    .from("content_key_recovery_audit_events")
    .insert({
      action,
      key_version: keyVersion,
      result,
      user_id: userId,
    });

  if (error) {
    throw error;
  }
}

async function saveWrappedContentKey(params: {
  adminClient: TtokttakSupabaseClient;
  keyVersion: number;
  userId: string;
  wrappedKey: string;
}): Promise<void> {
  const { adminClient, keyVersion, userId, wrappedKey } = params;
  const { error } = await adminClient
    .from("user_content_encryption_keys")
    .upsert(
      {
        key_version: keyVersion,
        user_id: userId,
        wrap_algorithm: wrapAlgorithm,
        wrap_metadata: wrapMetadata,
        wrapped_key: wrappedKey,
      },
      { onConflict: "user_id,key_version" }
    );

  if (error) {
    throw error;
  }
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
