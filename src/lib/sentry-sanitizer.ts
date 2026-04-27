const MASKED_VALUE = "[Filtered]";
const MAX_SANITIZE_DEPTH = 8;

const SENSITIVE_KEYWORDS = [
  "authorization",
  "auth_token",
  "cookie",
  "credential",
  "id_token",
  "identity_token",
  "password",
  "private_key",
  "push_token",
  "refresh_token",
  "secret",
  "service_role",
  "token",
] as const;

const SENSITIVE_FIELD_NAMES = new Set([
  "body",
  "data",
  "email",
  "headers",
  "notification",
  "payload",
  "request_body",
  "response_payload",
  "title",
]);

function normalizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function shouldMaskField(key: string): boolean {
  const normalizedKey = normalizeKey(key);

  return (
    SENSITIVE_FIELD_NAMES.has(normalizedKey) ||
    SENSITIVE_KEYWORDS.some((keyword) => normalizedKey.includes(keyword))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${MASKED_VALUE}`)
    .replace(
      /\b[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g,
      MASKED_VALUE
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, MASKED_VALUE);
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_SANITIZE_DEPTH) {
    return MASKED_VALUE;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, depth + 1));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      shouldMaskField(key) ? MASKED_VALUE : sanitizeValue(entry, depth + 1),
    ])
  );
}

export function sanitizeSentryEvent<T extends object>(event: T): T {
  return sanitizeValue(event, 0) as T;
}

export { MASKED_VALUE as SENTRY_MASKED_VALUE };
