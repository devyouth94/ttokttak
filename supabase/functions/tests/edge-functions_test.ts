import { assertEquals, assertRejects } from "@std/assert";

import { handleDeleteAccountRequest } from "../delete-account/handler.ts";
import {
  unwrapContentKey,
  wrapContentKey,
} from "../recover-content-key/content-key.ts";
import { handleRecoverContentKeyRequest } from "../recover-content-key/handler.ts";

const testSupabaseUrl = "https://test.supabase.co";
const testWrapSecret = btoa("0123456789abcdef0123456789abcdef");

Deno.test({
  name: "인증·확인·Apple 재인증이 실패하면 계정을 삭제하지 않는다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const restoreAppleEnvironment = await setTestAppleEnvironment();
    const originalFetch = globalThis.fetch;
    let authenticatedUser: Record<string, unknown> | "invalid" = "invalid";
    let tokenSubject = "";
    let revokeSucceeds = false;
    let revokeCalls = 0;
    const deletedUserIds: string[] = [];

    try {
      globalThis.fetch = (input, init) => {
        const request = toRequest(input, init);
        const url = new URL(request.url);

        if (url.pathname === "/auth/v1/user") {
          return Promise.resolve(
            authenticatedUser === "invalid"
              ? Response.json({ message: "invalid token" }, { status: 401 })
              : Response.json({ user: authenticatedUser })
          );
        }

        if (request.url === "https://appleid.apple.com/auth/token") {
          return Promise.resolve(
            Response.json({
              id_token: createAppleIdToken(tokenSubject),
              refresh_token: "apple-refresh-token-must-not-leak",
            })
          );
        }

        if (request.url === "https://appleid.apple.com/auth/revoke") {
          revokeCalls += 1;
          return Promise.resolve(
            new Response(null, { status: revokeSucceeds ? 200 : 500 })
          );
        }

        if (url.pathname.startsWith("/auth/v1/admin/users/")) {
          deletedUserIds.push(url.pathname.split("/").at(-1) ?? "");
          return Promise.resolve(Response.json({}));
        }

        throw new Error(`예상하지 못한 요청: ${request.method} ${request.url}`);
      };

      const missingAuth = await handleDeleteAccountRequest(
        new Request(`${testSupabaseUrl}/functions/v1/delete-account`, {
          body: JSON.stringify({ confirm: true }),
          method: "POST",
        })
      );
      assertEquals(missingAuth.status, 401);
      assertEquals(await missingAuth.json(), { error: "unauthorized" });

      const invalidAuth = await handleDeleteAccountRequest(
        createPostRequest({ confirm: true })
      );
      assertEquals(invalidAuth.status, 401);
      assertEquals(await invalidAuth.json(), { error: "unauthorized" });

      const missingConfirmation = await handleDeleteAccountRequest(
        createPostRequest({ confirm: false })
      );
      assertEquals(missingConfirmation.status, 400);
      assertEquals(await missingConfirmation.json(), {
        error: "invalid_request",
      });

      const missingCodeUserId = crypto.randomUUID();
      authenticatedUser = createAppleAuthenticatedUser(
        missingCodeUserId,
        "missing-code-subject"
      );
      const missingCode = await handleDeleteAccountRequest(
        createPostRequest({ confirm: true })
      );
      assertEquals(missingCode.status, 400);
      assertEquals(await missingCode.json(), {
        error: "apple_authorization_required",
      });

      const mismatchUserId = crypto.randomUUID();
      authenticatedUser = createAppleAuthenticatedUser(
        mismatchUserId,
        "expected-subject"
      );
      tokenSubject = "other-subject";
      const mismatch = await handleDeleteAccountRequest(
        createPostRequest({
          appleAuthorizationCode: "mismatched-code",
          confirm: true,
        })
      );
      assertEquals(mismatch.status, 403);
      assertEquals(await mismatch.json(), {
        error: "apple_identity_mismatch",
      });

      const revokeFailureUserId = crypto.randomUUID();
      authenticatedUser = createAppleAuthenticatedUser(
        revokeFailureUserId,
        "revoke-failure-subject"
      );
      tokenSubject = "revoke-failure-subject";
      revokeSucceeds = false;
      const revokeFailure = await handleDeleteAccountRequest(
        createPostRequest({
          appleAuthorizationCode: "revoke-failure-code",
          confirm: true,
        })
      );
      assertEquals(revokeFailure.status, 502);
      assertEquals(await revokeFailure.json(), {
        error: "apple_revoke_failed",
      });

      const deletedUserId = crypto.randomUUID();
      const ignoredBodyUserId = crypto.randomUUID();
      authenticatedUser = createAppleAuthenticatedUser(
        deletedUserId,
        "matching-subject"
      );
      tokenSubject = "matching-subject";
      revokeSucceeds = true;
      const success = await handleDeleteAccountRequest(
        createPostRequest({
          appleAuthorizationCode: "matching-code",
          confirm: true,
          userId: ignoredBodyUserId,
        })
      );
      assertEquals(success.status, 200);
      assertEquals(await success.json(), { ok: true });
      assertEquals(revokeCalls, 2);
      assertEquals(deletedUserIds, [deletedUserId]);

      const deniedRecovery = await handleRecoverContentKeyRequest(
        new Request(`${testSupabaseUrl}/functions/v1/recover-content-key`, {
          body: JSON.stringify({ action: "recover", keyVersion: 1 }),
          method: "POST",
        })
      );
      assertEquals(deniedRecovery.status, 401);
      assertEquals(await deniedRecovery.json(), { error: "unauthorized" });
    } finally {
      globalThis.fetch = originalFetch;
      restoreAppleEnvironment();
      restoreEnvironment();
    }
  },
});

Deno.test({
  name: "wrapped key는 사용자와 key version에 결합된다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const userId = crypto.randomUUID();
    const encodedKey = "content-key-for-binding-test";

    try {
      const wrappedKey = await wrapContentKey({
        encodedKey,
        keyVersion: 3,
        userId,
      });

      assertEquals(
        await unwrapContentKey({ keyVersion: 3, userId, wrappedKey }),
        encodedKey
      );
      await assertRejects(() =>
        unwrapContentKey({
          keyVersion: 3,
          userId: crypto.randomUUID(),
          wrappedKey,
        })
      );
      await assertRejects(() =>
        unwrapContentKey({ keyVersion: 4, userId, wrappedKey })
      );
      await assertRejects(() =>
        unwrapContentKey({
          keyVersion: 3,
          userId,
          wrappedKey: tamperBase64(wrappedKey),
        })
      );
    } finally {
      restoreEnvironment();
    }
  },
});

Deno.test({
  name: "감사 실패는 key를 반환하지 않고 감사·로그에 비밀정보를 남기지 않는다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const originalFetch = globalThis.fetch;
    const originalConsoleInfo = console.info;
    const userId = crypto.randomUUID();
    const encodedKey = "sensitive-content-key";
    const internalFailure = "private database failure";
    const auditPayloads: Record<string, unknown>[] = [];
    const logArguments: unknown[][] = [];
    let storedRow: Record<string, unknown> | null = null;
    let rejectAudit = false;

    try {
      console.info = (...args: unknown[]) => {
        logArguments.push(args);
      };
      globalThis.fetch = async (input, init) => {
        const request = toRequest(input, init);
        const url = new URL(request.url);

        if (url.pathname === "/auth/v1/user") {
          return Response.json({ user: createAuthenticatedUser(userId) });
        }

        if (url.pathname === "/rest/v1/user_content_encryption_keys") {
          if (request.method === "POST") {
            storedRow = (await request.json()) as Record<string, unknown>;
            return new Response(null, { status: 201 });
          }

          return Response.json(storedRow);
        }

        if (url.pathname === "/rest/v1/content_key_recovery_audit_events") {
          auditPayloads.push((await request.json()) as Record<string, unknown>);
          return rejectAudit
            ? Response.json({ message: internalFailure }, { status: 500 })
            : new Response(null, { status: 201 });
        }

        throw new Error(`예상하지 못한 요청: ${request.method} ${request.url}`);
      };

      const wrapResponse = await handleRecoverContentKeyRequest(
        createPostRequest({
          action: "wrap",
          encodedKey,
          keyVersion: 7,
        })
      );
      const wrapped = (await wrapResponse.json()) as {
        wrappedKey: string;
      };
      assertEquals(wrapResponse.status, 200);
      assertEquals(auditPayloads[0], {
        action: "wrap",
        key_version: 7,
        result: "success",
        user_id: userId,
      });

      rejectAudit = true;
      const recoverResponse = await handleRecoverContentKeyRequest(
        createPostRequest({ action: "recover", keyVersion: 7 })
      );
      const failureBody = await recoverResponse.json();
      assertEquals(recoverResponse.status, 500);
      assertEquals(failureBody, { error: "server_error" });
      assertEquals(auditPayloads[1], {
        action: "recover",
        key_version: 7,
        result: "success",
        user_id: userId,
      });

      const observableFailure = JSON.stringify({
        auditPayloads,
        failureBody,
        logArguments,
      });
      assertEquals(observableFailure.includes(encodedKey), false);
      assertEquals(observableFailure.includes(wrapped.wrappedKey), false);
      assertEquals(observableFailure.includes(internalFailure), false);
    } finally {
      console.info = originalConsoleInfo;
      globalThis.fetch = originalFetch;
      restoreEnvironment();
    }
  },
});

function setTestEnvironment(): () => void {
  const values = {
    SB_PUBLISHABLE_KEY: "test-publishable-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    SUPABASE_URL: testSupabaseUrl,
    TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64: testWrapSecret,
  };
  const previousValues = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previousValues.set(key, Deno.env.get(key));
    Deno.env.set(key, value);
  }

  return () => {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  };
}

async function setTestAppleEnvironment(): Promise<() => void> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const privateKey = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
  );
  let binary = "";

  for (const byte of privateKey) binary += String.fromCharCode(byte);

  const values = {
    APPLE_CLIENT_ID: "test-client-id",
    APPLE_KEY_ID: "test-key-id",
    APPLE_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${btoa(binary)}\n-----END PRIVATE KEY-----`,
    APPLE_TEAM_ID: "test-team-id",
  };
  const previousValues = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previousValues.set(key, Deno.env.get(key));
    Deno.env.set(key, value);
  }

  return () => {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  };
}

function createPostRequest(body: Record<string, unknown>): Request {
  return new Request(`${testSupabaseUrl}/functions/v1/test`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: "Bearer test-user-token",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

function createAuthenticatedUser(userId: string): Record<string, unknown> {
  return {
    app_metadata: { provider: "email", providers: ["email"] },
    aud: "authenticated",
    id: userId,
    identities: [],
    role: "authenticated",
    user_metadata: {},
  };
}

function createAppleAuthenticatedUser(
  userId: string,
  appleSubject: string
): Record<string, unknown> {
  return {
    ...createAuthenticatedUser(userId),
    app_metadata: { provider: "apple", providers: ["apple"] },
    identities: [
      {
        id: appleSubject,
        identity_data: { sub: appleSubject },
        provider: "apple",
        provider_id: appleSubject,
      },
    ],
  };
}

function createAppleIdToken(subject: string): string {
  return `${encodeBase64Url("{}")}.${encodeBase64Url(
    JSON.stringify({ sub: subject })
  )}.signature`;
}

function encodeBase64Url(value: string): string {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function tamperBase64(value: string): string {
  const bytes = Uint8Array.from(atob(value), (character) =>
    character.charCodeAt(0)
  );
  bytes[bytes.length - 1] ^= 1;
  return btoa(String.fromCharCode(...bytes));
}

function toRequest(input: RequestInfo | URL, init?: RequestInit): Request {
  return input instanceof Request ? input : new Request(input, init);
}
