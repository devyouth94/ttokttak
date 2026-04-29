// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type NotificationDeliveryAttemptStatus =
  | "permanent-failed"
  | "retryable-failed"
  | "skipped"
  | "succeeded"
  | "token-invalid";

type NotificationDeliveryJobStatus =
  | "cancelled"
  | "failed"
  | "partially-failed"
  | "pending"
  | "processing"
  | "retrying"
  | "succeeded";

type NotificationDeliveryJob = {
  body: string;
  cancel_reason: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  dedupe_key: string;
  deliver_at_utc: string;
  failure_count: number;
  id: string;
  item_id: string;
  item_scheduled_at_utc: string;
  last_attempted_at: string | null;
  next_retry_at: string | null;
  notification_kind: "reminder";
  payload: Record<string, unknown>;
  retry_count: number;
  status: NotificationDeliveryJobStatus;
  success_count: number;
  target_token_count: number;
  title: string;
  updated_at: string;
  user_id: string;
};

type DevicePushToken = {
  created_at: string;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  device_id: string;
  id: string;
  is_active: boolean;
  last_registered_at: string;
  permission_status: "denied" | "granted";
  platform: "android" | "ios";
  push_provider: "apns" | "fcm";
  push_token: string;
  updated_at: string;
  user_id: string;
};

type NotificationDeliveryAttemptInsert = {
  attempt_number: number;
  attempted_at: string;
  device_id: string | null;
  job_id: string;
  platform: "android" | "ios";
  provider_error_code: string | null;
  provider_error_message: string | null;
  provider_message_id: string | null;
  push_provider: "apns" | "fcm";
  push_token_ref: string;
  push_token_id: string | null;
  response_payload: Record<string, unknown>;
  status: NotificationDeliveryAttemptStatus;
  user_id: string;
};

type AttemptResult = NotificationDeliveryAttemptInsert & {
  tokenId: string | null;
};

type ProcessJobResult = {
  attemptCounts: Record<NotificationDeliveryAttemptStatus, number>;
  jobId: string;
  status: NotificationDeliveryJobStatus | "skipped";
  tokenCount: number;
};

type ReminderTargetState = "active" | "archived" | "missing";

type NotificationInboxItemInsert = {
  body: string;
  delivered_at_utc: string;
  item_id: string;
  item_scheduled_at_utc: string;
  notification_kind: "reminder";
  payload: Record<string, unknown>;
  source_job_id: string;
  title: string;
  user_id: string;
};

function hasSucceededPushAttempt(attempts: AttemptResult[]): boolean {
  return attempts.some((attempt) => attempt.status === "succeeded");
}

function getEmptyAttemptCounts(): Record<
  NotificationDeliveryAttemptStatus,
  number
> {
  return {
    "permanent-failed": 0,
    "retryable-failed": 0,
    skipped: 0,
    succeeded: 0,
    "token-invalid": 0,
  };
}

function summarizeAttempts(
  attempts: AttemptResult[]
): Record<NotificationDeliveryAttemptStatus, number> {
  const counts = getEmptyAttemptCounts();

  for (const attempt of attempts) {
    counts[attempt.status] += 1;
  }

  return counts;
}

function getPushTokenRef(pushTokenId: string | null): string {
  return pushTokenId ? `token-id:${pushTokenId}` : "token-id:missing";
}

function getProviderResponseSummary(params: {
  errorCode?: string | null;
  httpStatus: number;
  provider: "apns" | "fcm";
  status?: string | null;
}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries({
      errorCode: params.errorCode ?? null,
      httpStatus: params.httpStatus,
      provider: params.provider,
      status: params.status ?? null,
    }).filter(([, value]) => value !== null)
  );
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000] as const;
const DEFAULT_BATCH_LIMIT = 50;
const APNS_AUDIENCE_HOST = "https://api.push.apple.com";
const FCM_AUDIENCE = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const ANDROID_REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";
const WORKER_SECRET_HEADER = "x-push-delivery-worker-secret";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

let apnsJwtCache: {
  expiresAt: number;
  token: string;
} | null = null;
let fcmAccessTokenCache: {
  accessToken: string;
  expiresAt: number;
} | null = null;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: JSON_HEADERS,
    status,
  });
}

function verifyInternalWorkerRequest(req: Request): Response | null {
  const expectedSecret = Deno.env.get("PUSH_DELIVERY_WORKER_SECRET");

  if (!expectedSecret) {
    return jsonResponse(
      {
        error: "worker-secret-not-configured",
      },
      500
    );
  }

  if (req.headers.get(WORKER_SECRET_HEADER) !== expectedSecret) {
    return jsonResponse(
      {
        error: "unauthorized",
      },
      401
    );
  }

  return null;
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }

  return value;
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function toFcmData(payload: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ])
  );
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isApnsInvalidTokenReason(reason: string | null): boolean {
  return reason === "BadDeviceToken" || reason === "Unregistered";
}

function isFcmInvalidTokenStatus(status: string | null): boolean {
  return status === "INVALID_ARGUMENT" || status === "UNREGISTERED";
}

function isFcmRetryableStatus(status: string | null): boolean {
  return (
    status === "INTERNAL" ||
    status === "RESOURCE_EXHAUSTED" ||
    status === "UNAVAILABLE"
  );
}

function resolveFcmErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as Record<string, unknown>).error;

  if (!error || typeof error !== "object") {
    return null;
  }

  const errorRecord = error as Record<string, unknown>;
  const details = errorRecord.details;

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== "object") {
        continue;
      }

      const errorCode = (detail as Record<string, unknown>).errorCode;

      if (typeof errorCode === "string") {
        return errorCode;
      }
    }
  }

  return typeof errorRecord.status === "string" ? errorRecord.status : null;
}

function getNextRetryAt(retryCount: number): string | null {
  const delay = RETRY_DELAYS_MS[retryCount];

  if (!delay) {
    return null;
  }

  return new Date(Date.now() + delay).toISOString();
}

function getAttemptNumber(job: NotificationDeliveryJob): number {
  return job.retry_count + 1;
}

function buildAttemptResult(params: {
  attemptedAt: string;
  deviceId: string | null;
  job: NotificationDeliveryJob;
  payload?: Record<string, unknown>;
  platform: "android" | "ios";
  providerErrorCode?: string | null;
  providerErrorMessage?: string | null;
  providerMessageId?: string | null;
  pushProvider: "apns" | "fcm";
  pushTokenId: string | null;
  status: NotificationDeliveryAttemptStatus;
}): AttemptResult {
  const {
    attemptedAt,
    deviceId,
    job,
    payload,
    platform,
    providerErrorCode,
    providerErrorMessage,
    providerMessageId,
    pushProvider,
    pushTokenId,
    status,
  } = params;

  return {
    attempt_number: getAttemptNumber(job),
    attempted_at: attemptedAt,
    device_id: deviceId,
    job_id: job.id,
    platform,
    provider_error_code: providerErrorCode ?? null,
    provider_error_message: providerErrorMessage ?? null,
    provider_message_id: providerMessageId ?? null,
    push_provider: pushProvider,
    push_token_ref: getPushTokenRef(pushTokenId),
    push_token_id: pushTokenId,
    response_payload: payload ?? {},
    status,
    tokenId: pushTokenId,
    user_id: job.user_id,
  };
}

async function createApnsJwt(): Promise<string> {
  const cached = apnsJwtCache;

  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }

  const teamId = getRequiredEnv("APNS_TEAM_ID");
  const keyId = getRequiredEnv("APNS_KEY_ID");
  const privateKey = await importPKCS8(
    normalizePrivateKey(getRequiredEnv("APNS_PRIVATE_KEY")),
    "ES256"
  );
  const token = await new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: keyId,
    })
    .setIssuedAt()
    .setIssuer(teamId)
    .sign(privateKey);

  apnsJwtCache = {
    expiresAt: Date.now() + 50 * 60 * 1000,
    token,
  };

  return token;
}

async function getFcmAccessToken(): Promise<string> {
  const cached = fcmAccessTokenCache;

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const clientEmail = getRequiredEnv("FCM_CLIENT_EMAIL");
  const privateKey = await importPKCS8(
    normalizePrivateKey(getRequiredEnv("FCM_PRIVATE_KEY")),
    "RS256"
  );
  const privateKeyId = Deno.env.get("FCM_PRIVATE_KEY_ID") ?? undefined;
  const assertion = await new SignJWT({
    scope: FCM_SCOPE,
  })
    .setProtectedHeader({
      alg: "RS256",
      kid: privateKeyId,
      typ: "JWT",
    })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(FCM_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
  const response = await fetch(FCM_AUDIENCE, {
    body: new URLSearchParams({
      assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    throw new Error("FCM access token 발급에 실패했습니다.");
  }

  fcmAccessTokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };

  return data.access_token;
}

async function sendApnsNotification(
  job: NotificationDeliveryJob,
  token: DevicePushToken,
  attemptedAt: string
): Promise<AttemptResult> {
  try {
    const useSandbox = Deno.env.get("APNS_USE_SANDBOX") === "true";
    const apnsJwt = await createApnsJwt();
    const bundleId = getRequiredEnv("APNS_BUNDLE_ID");
    const endpoint = `${
      useSandbox ? "https://api.sandbox.push.apple.com" : APNS_AUDIENCE_HOST
    }/3/device/${token.push_token}`;
    const response = await fetch(endpoint, {
      body: JSON.stringify({
        ...job.payload,
        aps: {
          alert: {
            body: job.body,
            title: job.title,
          },
          sound: "default",
        },
      }),
      headers: {
        "apns-topic": bundleId,
        authorization: `bearer ${apnsJwt}`,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const payload = await response.json().catch(() => null);

    if (response.ok) {
      return buildAttemptResult({
        attemptedAt,
        deviceId: token.device_id,
        job,
        payload: getProviderResponseSummary({
          httpStatus: response.status,
          provider: "apns",
        }),
        platform: token.platform,
        providerMessageId: response.headers.get("apns-id"),
        pushProvider: token.push_provider,
        pushTokenId: token.id,
        status: "succeeded",
      });
    }

    const reason = payload?.reason ?? null;

    return buildAttemptResult({
      attemptedAt,
      deviceId: token.device_id,
      job,
      payload: getProviderResponseSummary({
        errorCode: reason,
        httpStatus: response.status,
        provider: "apns",
        status: reason,
      }),
      platform: token.platform,
      providerErrorCode: reason,
      providerErrorMessage: reason ?? `APNS_${response.status}`,
      pushProvider: token.push_provider,
      pushTokenId: token.id,
      status: isApnsInvalidTokenReason(reason)
        ? "token-invalid"
        : isRetryableHttpStatus(response.status)
          ? "retryable-failed"
          : "permanent-failed",
    });
  } catch (error) {
    return buildAttemptResult({
      attemptedAt,
      deviceId: token.device_id,
      job,
      payload: {},
      platform: token.platform,
      providerErrorCode: "PROVIDER_REQUEST_FAILED",
      providerErrorMessage:
        error instanceof Error ? error.name : "UnknownError",
      pushProvider: token.push_provider,
      pushTokenId: token.id,
      status: "retryable-failed",
    });
  }
}

async function sendFcmNotification(
  job: NotificationDeliveryJob,
  token: DevicePushToken,
  attemptedAt: string
): Promise<AttemptResult> {
  try {
    const projectId = getRequiredEnv("FCM_PROJECT_ID");
    const accessToken = await getFcmAccessToken();
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        body: JSON.stringify({
          message: {
            android: {
              notification: {
                channel_id: ANDROID_REMINDER_NOTIFICATION_CHANNEL_ID,
              },
            },
            data: toFcmData(job.payload),
            notification: {
              body: job.body,
              title: job.title,
            },
            token: token.push_token,
          },
        }),
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
      }
    );
    const payload = await response.json().catch(() => null);

    if (response.ok) {
      return buildAttemptResult({
        attemptedAt,
        deviceId: token.device_id,
        job,
        payload: getProviderResponseSummary({
          httpStatus: response.status,
          provider: "fcm",
        }),
        platform: token.platform,
        providerMessageId: payload?.name ?? null,
        pushProvider: token.push_provider,
        pushTokenId: token.id,
        status: "succeeded",
      });
    }

    const status = payload?.error?.status ?? null;
    const errorCode = resolveFcmErrorCode(payload);
    const providerErrorCode = errorCode ?? status;

    return buildAttemptResult({
      attemptedAt,
      deviceId: token.device_id,
      job,
      payload: getProviderResponseSummary({
        errorCode: providerErrorCode,
        httpStatus: response.status,
        provider: "fcm",
        status,
      }),
      platform: token.platform,
      providerErrorCode,
      providerErrorMessage: providerErrorCode ?? `FCM_${response.status}`,
      pushProvider: token.push_provider,
      pushTokenId: token.id,
      status: isFcmInvalidTokenStatus(providerErrorCode)
        ? "token-invalid"
        : isRetryableHttpStatus(response.status) ||
            isFcmRetryableStatus(status) ||
            isFcmRetryableStatus(providerErrorCode)
          ? "retryable-failed"
          : "permanent-failed",
    });
  } catch (error) {
    return buildAttemptResult({
      attemptedAt,
      deviceId: token.device_id,
      job,
      payload: {},
      platform: token.platform,
      providerErrorCode: "PROVIDER_REQUEST_FAILED",
      providerErrorMessage:
        error instanceof Error ? error.name : "UnknownError",
      pushProvider: token.push_provider,
      pushTokenId: token.id,
      status: "retryable-failed",
    });
  }
}

async function sendNotificationForToken(
  job: NotificationDeliveryJob,
  token: DevicePushToken,
  attemptedAt: string
): Promise<AttemptResult> {
  if (token.platform === "ios" && token.push_provider === "apns") {
    return sendApnsNotification(job, token, attemptedAt);
  }

  if (token.platform === "android" && token.push_provider === "fcm") {
    return sendFcmNotification(job, token, attemptedAt);
  }

  return buildAttemptResult({
    attemptedAt,
    deviceId: token.device_id,
    job,
    payload: {},
    platform: token.platform,
    providerErrorCode: "UNSUPPORTED_PROVIDER",
    providerErrorMessage: "지원하지 않는 platform/provider 조합입니다.",
    pushProvider: token.push_provider,
    pushTokenId: token.id,
    status: "skipped",
  });
}

async function listDueJobs(
  nowIso: string,
  limit: number
): Promise<NotificationDeliveryJob[]> {
  const { data, error } = await supabase
    .from("notification_delivery_jobs")
    .select("*")
    .in("status", ["pending", "retrying"])
    .lte("deliver_at_utc", nowIso)
    .order("deliver_at_utc", { ascending: true })
    .limit(limit * 2);

  if (error) {
    throw error;
  }

  return (data as NotificationDeliveryJob[])
    .filter(
      (job) =>
        job.status === "pending" ||
        !job.next_retry_at ||
        job.next_retry_at <= nowIso
    )
    .slice(0, limit);
}

async function claimJob(
  job: NotificationDeliveryJob,
  attemptedAt: string
): Promise<NotificationDeliveryJob | null> {
  const { data, error } = await supabase
    .from("notification_delivery_jobs")
    .update({
      last_attempted_at: attemptedAt,
      status: "processing",
    })
    .eq("id", job.id)
    .eq("status", job.status)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as NotificationDeliveryJob | null) ?? null;
}

async function listActivePushTokens(
  userId: string
): Promise<DevicePushToken[]> {
  const { data, error } = await supabase
    .from("device_push_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("permission_status", "granted");

  if (error) {
    throw error;
  }

  return data as DevicePushToken[];
}

async function getReminderTargetState(
  job: NotificationDeliveryJob
): Promise<ReminderTargetState> {
  const { data, error } = await supabase
    .from("recurring_items")
    .select("is_archived")
    .eq("id", job.item_id)
    .eq("user_id", job.user_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return "missing";
  }

  return data.is_archived ? "archived" : "active";
}

async function cancelInactiveReminderJob(
  job: NotificationDeliveryJob,
  attemptedAt: string
): Promise<void> {
  const { error } = await supabase
    .from("notification_delivery_jobs")
    .update({
      cancel_reason: "item-archived",
      cancelled_at: attemptedAt,
      completed_at: null,
      next_retry_at: null,
      status: "cancelled",
    })
    .eq("id", job.id);

  if (error) {
    throw error;
  }
}

async function cancelJobIfInactiveReminderTarget(
  job: NotificationDeliveryJob,
  attemptedAt: string
): Promise<boolean> {
  const targetState = await getReminderTargetState(job);

  if (targetState === "active") {
    return false;
  }

  await cancelInactiveReminderJob(job, attemptedAt);

  return true;
}

async function insertAttempts(attempts: AttemptResult[]): Promise<void> {
  if (attempts.length === 0) {
    return;
  }

  const payload = attempts.map(({ tokenId: _tokenId, ...attempt }) => attempt);
  const { error } = await supabase
    .from("notification_delivery_attempts")
    .insert(payload);

  if (error) {
    throw error;
  }
}

async function upsertInboxItemForSucceededPush(params: {
  attemptedAt: string;
  attempts: AttemptResult[];
  job: NotificationDeliveryJob;
}): Promise<void> {
  if (!hasSucceededPushAttempt(params.attempts)) {
    return;
  }

  const inboxItem: NotificationInboxItemInsert = {
    body: params.job.body,
    delivered_at_utc: params.attemptedAt,
    item_id: params.job.item_id,
    item_scheduled_at_utc: params.job.item_scheduled_at_utc,
    notification_kind: params.job.notification_kind,
    payload: params.job.payload,
    source_job_id: params.job.id,
    title: params.job.title,
    user_id: params.job.user_id,
  };
  const { error } = await supabase
    .from("notification_inbox_items")
    .upsert(inboxItem, {
      // 여러 기기 성공과 worker 재처리는 사용자 occurrence 알림 1건으로 접는다.
      ignoreDuplicates: true,
      onConflict: "user_id,item_id,item_scheduled_at_utc",
    });

  if (error) {
    throw error;
  }
}

async function deactivateInvalidTokens(
  attempts: AttemptResult[]
): Promise<void> {
  const tokenIds = attempts
    .filter((attempt) => attempt.status === "token-invalid" && attempt.tokenId)
    .map((attempt) => attempt.tokenId) as string[];

  if (tokenIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("device_push_tokens")
    .update({
      deactivated_at: new Date().toISOString(),
      deactivation_reason: "delivery-failed",
      is_active: false,
    })
    .in("id", tokenIds);

  if (error) {
    throw error;
  }
}

async function updateJobSummary(params: {
  attempts: AttemptResult[];
  attemptedAt: string;
  job: NotificationDeliveryJob;
  tokenCount: number;
}): Promise<NotificationDeliveryJobStatus> {
  const { attempts, attemptedAt, job, tokenCount } = params;
  const successCount = attempts.filter(
    (attempt) => attempt.status === "succeeded"
  ).length;
  const retryableCount = attempts.filter(
    (attempt) => attempt.status === "retryable-failed"
  ).length;
  const failureCount = attempts.filter(
    (attempt) => attempt.status !== "succeeded"
  ).length;

  if (tokenCount === 0) {
    const { error } = await supabase
      .from("notification_delivery_jobs")
      .update({
        cancel_reason: "no-active-tokens",
        cancelled_at: attemptedAt,
        completed_at: null,
        failure_count: 0,
        next_retry_at: null,
        status: "cancelled",
        success_count: 0,
        target_token_count: 0,
      })
      .eq("id", job.id);

    if (error) {
      throw error;
    }

    return "cancelled";
  }

  if (successCount === tokenCount) {
    const { error } = await supabase
      .from("notification_delivery_jobs")
      .update({
        completed_at: attemptedAt,
        failure_count: 0,
        next_retry_at: null,
        status: "succeeded",
        success_count: successCount,
        target_token_count: tokenCount,
      })
      .eq("id", job.id);

    if (error) {
      throw error;
    }

    return "succeeded";
  }

  if (successCount === 0 && retryableCount > 0) {
    const nextRetryAt = getNextRetryAt(job.retry_count);

    if (nextRetryAt) {
      const { error } = await supabase
        .from("notification_delivery_jobs")
        .update({
          failure_count: failureCount,
          next_retry_at: nextRetryAt,
          retry_count: job.retry_count + 1,
          status: "retrying",
          success_count: 0,
          target_token_count: tokenCount,
        })
        .eq("id", job.id);

      if (error) {
        throw error;
      }

      return "retrying";
    }
  }

  if (successCount > 0) {
    const { error } = await supabase
      .from("notification_delivery_jobs")
      .update({
        completed_at: attemptedAt,
        failure_count: failureCount,
        next_retry_at: null,
        status: "partially-failed",
        success_count: successCount,
        target_token_count: tokenCount,
      })
      .eq("id", job.id);

    if (error) {
      throw error;
    }

    return "partially-failed";
  }

  const { error } = await supabase
    .from("notification_delivery_jobs")
    .update({
      completed_at: attemptedAt,
      failure_count: failureCount,
      next_retry_at: null,
      status: "failed",
      success_count: 0,
      target_token_count: tokenCount,
    })
    .eq("id", job.id);

  if (error) {
    throw error;
  }

  return "failed";
}

async function processJob(
  job: NotificationDeliveryJob
): Promise<ProcessJobResult> {
  const attemptedAt = new Date().toISOString();
  const claimedJob = await claimJob(job, attemptedAt);

  if (!claimedJob) {
    return {
      attemptCounts: getEmptyAttemptCounts(),
      jobId: job.id,
      status: "skipped" as const,
      tokenCount: 0,
    };
  }

  if (await cancelJobIfInactiveReminderTarget(claimedJob, attemptedAt)) {
    return {
      attemptCounts: getEmptyAttemptCounts(),
      jobId: claimedJob.id,
      status: "cancelled",
      tokenCount: 0,
    };
  }

  const tokens = await listActivePushTokens(claimedJob.user_id);

  if (await cancelJobIfInactiveReminderTarget(claimedJob, attemptedAt)) {
    return {
      attemptCounts: getEmptyAttemptCounts(),
      jobId: claimedJob.id,
      status: "cancelled",
      tokenCount: 0,
    };
  }

  if (tokens.length === 0) {
    const nextStatus = await updateJobSummary({
      attempts: [],
      attemptedAt,
      job: claimedJob,
      tokenCount: 0,
    });

    return {
      attemptCounts: getEmptyAttemptCounts(),
      jobId: claimedJob.id,
      status: nextStatus,
      tokenCount: 0,
    };
  }

  const attempts = await Promise.all(
    tokens.map((token) =>
      sendNotificationForToken(claimedJob, token, attemptedAt)
    )
  );

  await insertAttempts(attempts);
  await upsertInboxItemForSucceededPush({
    attemptedAt,
    attempts,
    job: claimedJob,
  });
  await deactivateInvalidTokens(attempts);
  const nextStatus = await updateJobSummary({
    attempts,
    attemptedAt,
    job: claimedJob,
    tokenCount: tokens.length,
  });

  return {
    attemptCounts: summarizeAttempts(attempts),
    jobId: claimedJob.id,
    status: nextStatus,
    tokenCount: tokens.length,
  };
}

function getErrorLogPayload(error: unknown): {
  message: string;
  name: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: JSON_HEADERS,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "method-not-allowed",
      },
      405
    );
  }

  const authorizationError = verifyInternalWorkerRequest(req);

  if (authorizationError) {
    return authorizationError;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedLimit = Number(body?.limit);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, DEFAULT_BATCH_LIMIT)
        : DEFAULT_BATCH_LIMIT;
    const nowIso = new Date().toISOString();
    const dueJobs = await listDueJobs(nowIso, limit);
    const results = [];

    for (const job of dueJobs) {
      const result = await processJob(job);

      results.push(result);
    }

    const processedCount = results.filter(
      (entry) => entry.status !== "skipped"
    ).length;

    return jsonResponse({
      dueCount: dueJobs.length,
      executionId: Deno.env.get("SB_EXECUTION_ID") ?? null,
      processedCount,
      results,
    });
  } catch (error) {
    console.error("push delivery worker failed", getErrorLogPayload(error));

    return jsonResponse(
      {
        error: "internal-error",
        executionId: Deno.env.get("SB_EXECUTION_ID") ?? null,
      },
      500
    );
  }
});
