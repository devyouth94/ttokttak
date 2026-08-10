import { assertEquals } from "@std/assert";

import { handleDeleteAccountRequest } from "../delete-account/handler.ts";
import { handleRecoverContentKeyRequest } from "../recover-content-key/handler.ts";

const testSupabaseUrl = "https://test.supabase.co";
const testWrapSecret = btoa("0123456789abcdef0123456789abcdef");

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

function createAuthenticatedUser(userId: string): Record<string, unknown> {
  return {
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
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
    app_metadata: {
      provider: "apple",
      providers: ["apple"],
    },
    aud: "authenticated",
    id: userId,
    identities: [
      {
        id: appleSubject,
        identity_data: { sub: appleSubject },
        provider: "apple",
        provider_id: appleSubject,
      },
    ],
    role: "authenticated",
    user_metadata: {},
  };
}

function encodeBase64Url(value: string): string {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function createAppleIdToken(subject: string): string {
  return `${encodeBase64Url("{}")}.${encodeBase64Url(
    JSON.stringify({ sub: subject })
  )}.signature`;
}

async function setTestAppleEnvironment(): Promise<() => void> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
  const privateKey = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
  );
  let binary = "";

  for (const byte of privateKey) {
    binary += String.fromCharCode(byte);
  }

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
  return new Request("https://test.supabase.co/functions/v1/test", {
    body: JSON.stringify(body),
    headers: {
      Authorization: "Bearer test-user-token",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

async function createLegacyWrappedKey(encodedKey: string): Promise<string> {
  const wrappingKey = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(testWrapSecret), (character) =>
      character.charCodeAt(0)
    ),
    "AES-GCM",
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { iv, name: "AES-GCM" },
      wrappingKey,
      new TextEncoder().encode(encodedKey)
    )
  );
  const combined = new Uint8Array(iv.length + encrypted.length);

  combined.set(iv);
  combined.set(encrypted, iv.length);

  return btoa(String.fromCharCode(...combined));
}

Deno.test({
  name: "계정 삭제 함수는 사용자별 요청 한도를 넘으면 429를 반환한다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const originalFetch = globalThis.fetch;
    const userId = crypto.randomUUID();
    let authenticatedUserId = userId;
    const deletedUserIds: string[] = [];

    try {
      globalThis.fetch = (input, init) => {
        const request =
          input instanceof Request
            ? input
            : new Request(
                input,
                init as ConstructorParameters<typeof Request>[1]
              );
        const url = new URL(request.url);

        if (url.pathname === "/auth/v1/user") {
          return Promise.resolve(
            Response.json({
              user: createAuthenticatedUser(authenticatedUserId),
            })
          );
        }

        if (url.pathname === `/auth/v1/admin/users/${authenticatedUserId}`) {
          assertEquals(request.method, "DELETE");
          assertEquals(request.headers.get("apikey"), "test-service-role-key");
          deletedUserIds.push(authenticatedUserId);
          return Promise.resolve(Response.json({}));
        }

        throw new Error(`예상하지 못한 요청: ${request.method} ${request.url}`);
      };

      let response: Response | null = null;

      for (let requestCount = 0; requestCount < 4; requestCount += 1) {
        response = await handleDeleteAccountRequest(
          createPostRequest({ confirm: true })
        );
      }

      assertEquals(response?.status, 429);
      assertEquals(await response!.json(), { error: "rate_limited" });

      const otherUserId = crypto.randomUUID();
      authenticatedUserId = otherUserId;
      const otherUserResponse = await handleDeleteAccountRequest(
        createPostRequest({ confirm: true })
      );

      assertEquals(otherUserResponse.status, 200);
      assertEquals(deletedUserIds, [userId, userId, userId, otherUserId]);
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvironment();
    }
  },
});

Deno.test({
  name: "content key 복구 함수는 요청 한도 초과 뒤 감사 row를 추가하지 않는다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const originalFetch = globalThis.fetch;
    const userId = crypto.randomUUID();
    let authenticatedUserId = userId;
    const auditPayloads: Record<string, unknown>[] = [];

    try {
      globalThis.fetch = async (input, init) => {
        const request =
          input instanceof Request
            ? input
            : new Request(
                input,
                init as ConstructorParameters<typeof Request>[1]
              );
        const url = new URL(request.url);

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            user: createAuthenticatedUser(authenticatedUserId),
          });
        }

        if (url.pathname === "/rest/v1/content_key_recovery_audit_events") {
          assertEquals(request.method, "POST");
          assertEquals(request.headers.get("apikey"), "test-service-role-key");

          auditPayloads.push((await request.json()) as Record<string, unknown>);
          return new Response(null, { status: 201 });
        }

        throw new Error(`예상하지 못한 요청: ${request.method} ${request.url}`);
      };

      let response: Response | null = null;

      for (let requestCount = 0; requestCount < 12; requestCount += 1) {
        await handleRecoverContentKeyRequest(
          createPostRequest({ action: "recover" })
        );
      }

      response = await handleRecoverContentKeyRequest(
        createPostRequest({
          action: "wrap",
          encodedKey: "sensitive-content-key",
          keyVersion: 7,
        })
      );

      assertEquals(response?.status, 429);
      assertEquals(await response!.json(), { error: "rate_limited" });

      assertEquals(auditPayloads.length, 12);
      assertEquals(
        auditPayloads.some((payload) => payload.result === "rate_limited"),
        false
      );

      authenticatedUserId = crypto.randomUUID();
      const otherUserResponse = await handleRecoverContentKeyRequest(
        createPostRequest({ action: "recover" })
      );

      assertEquals(otherUserResponse.status, 400);
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvironment();
    }
  },
});

Deno.test({
  name: "content key는 사용자와 key version에 결합되어 다른 사용자가 복구할 수 없다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const originalFetch = globalThis.fetch;
    const ownerUserId = crypto.randomUUID();
    const otherUserId = crypto.randomUUID();
    let authenticatedUserId = ownerUserId;
    let storedRow: Record<string, unknown> | null = null;
    let serverKeyWrites = 0;

    try {
      globalThis.fetch = async (input, init) => {
        const request =
          input instanceof Request
            ? input
            : new Request(
                input,
                init as ConstructorParameters<typeof Request>[1]
              );
        const url = new URL(request.url);

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            user: createAuthenticatedUser(authenticatedUserId),
          });
        }

        if (url.pathname === "/rest/v1/user_content_encryption_keys") {
          if (request.method === "POST") {
            assertEquals(
              request.headers.get("apikey"),
              "test-service-role-key"
            );
            storedRow = (await request.json()) as Record<string, unknown>;
            serverKeyWrites += 1;
            return new Response(null, { status: 201 });
          }

          assertEquals(request.method, "GET");
          return Response.json(storedRow);
        }

        if (url.pathname === "/rest/v1/content_key_recovery_audit_events") {
          return new Response(null, { status: 201 });
        }

        throw new Error(`예상하지 못한 요청: ${request.method} ${request.url}`);
      };

      const wrapResponse = await handleRecoverContentKeyRequest(
        createPostRequest({
          action: "wrap",
          encodedKey: "owner-content-key",
          keyVersion: 1,
        })
      );
      const wrapped = (await wrapResponse.json()) as {
        wrapAlgorithm: string;
        wrapMetadata: Record<string, unknown>;
        wrappedKey: string;
      };

      storedRow ??= {
        key_version: 1,
        user_id: ownerUserId,
        wrap_algorithm: wrapped.wrapAlgorithm,
        wrap_metadata: wrapped.wrapMetadata,
        wrapped_key: wrapped.wrappedKey,
      };

      assertEquals(wrapResponse.status, 200);
      assertEquals(serverKeyWrites, 1);
      assertEquals(wrapped.wrapMetadata, {
        binding: "user-key-version-v1",
        encoding: "combined-base64",
        keySource: "edge-secret-v2",
      });

      authenticatedUserId = otherUserId;
      const replayResponse = await handleRecoverContentKeyRequest(
        createPostRequest({ action: "recover", keyVersion: 1 })
      );

      assertEquals(replayResponse.status, 500);
      assertEquals(await replayResponse.json(), { error: "server_error" });

      authenticatedUserId = ownerUserId;
      const ownerResponse = await handleRecoverContentKeyRequest(
        createPostRequest({ action: "recover", keyVersion: 1 })
      );

      assertEquals(ownerResponse.status, 200);
      assertEquals(await ownerResponse.json(), {
        encodedKey: "owner-content-key",
      });
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvironment();
    }
  },
});

Deno.test({
  name: "기존 wrapped key는 정상 복구 후 사용자 결합 형식으로 전환한다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const originalFetch = globalThis.fetch;
    const userId = crypto.randomUUID();
    const legacyWrappedKey = await createLegacyWrappedKey("legacy-content-key");
    let migratedRow: Record<string, unknown> = {};

    try {
      globalThis.fetch = async (input, init) => {
        const request =
          input instanceof Request
            ? input
            : new Request(
                input,
                init as ConstructorParameters<typeof Request>[1]
              );
        const url = new URL(request.url);

        if (url.pathname === "/auth/v1/user") {
          return Response.json({ user: createAuthenticatedUser(userId) });
        }

        if (url.pathname === "/rest/v1/user_content_encryption_keys") {
          if (request.method === "GET") {
            return Response.json({
              wrap_algorithm: "AES-GCM",
              wrap_metadata: {
                encoding: "combined-base64",
                keySource: "edge-secret-v1",
              },
              wrapped_key: legacyWrappedKey,
            });
          }

          assertEquals(request.method, "POST");
          assertEquals(request.headers.get("apikey"), "test-service-role-key");
          migratedRow = (await request.json()) as Record<string, unknown>;
          return new Response(null, { status: 201 });
        }

        if (url.pathname === "/rest/v1/content_key_recovery_audit_events") {
          return new Response(null, { status: 201 });
        }

        throw new Error(`예상하지 못한 요청: ${request.method} ${request.url}`);
      };

      const response = await handleRecoverContentKeyRequest(
        createPostRequest({ action: "recover", keyVersion: 1 })
      );

      assertEquals(response.status, 200);
      assertEquals(await response.json(), { encodedKey: "legacy-content-key" });
      assertEquals(migratedRow?.user_id, userId);
      assertEquals(migratedRow?.key_version, 1);
      assertEquals(migratedRow?.wrap_metadata, {
        binding: "user-key-version-v1",
        encoding: "combined-base64",
        keySource: "edge-secret-v2",
      });
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvironment();
    }
  },
});

Deno.test({
  name: "Apple subject가 다르면 token을 폐기하지 않는다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const restoreAppleEnvironment = await setTestAppleEnvironment();
    const originalFetch = globalThis.fetch;
    let userId = crypto.randomUUID();
    let expectedSubject = "apple-subject-1";
    let tokenSubject = "other-apple-subject";
    let revokeCalls = 0;
    const deletedUserIds: string[] = [];

    try {
      globalThis.fetch = (input, init) => {
        const request =
          input instanceof Request
            ? input
            : new Request(
                input,
                init as ConstructorParameters<typeof Request>[1]
              );
        const url = new URL(request.url);

        if (url.pathname === "/auth/v1/user") {
          return Promise.resolve(
            Response.json({
              user: createAppleAuthenticatedUser(userId, expectedSubject),
            })
          );
        }

        if (request.url === "https://appleid.apple.com/auth/token") {
          return Promise.resolve(
            Response.json({
              id_token: createAppleIdToken(tokenSubject),
              refresh_token: "test-refresh-token",
            })
          );
        }

        if (request.url === "https://appleid.apple.com/auth/revoke") {
          revokeCalls += 1;
          return Promise.resolve(new Response(null, { status: 200 }));
        }

        if (url.pathname === `/auth/v1/admin/users/${userId}`) {
          deletedUserIds.push(userId);
          return Promise.resolve(Response.json({}));
        }

        throw new Error(`예상하지 못한 요청: ${request.method} ${request.url}`);
      };

      const mismatchResponse = await handleDeleteAccountRequest(
        createPostRequest({
          appleAuthorizationCode: "mismatched-code",
          confirm: true,
        })
      );

      assertEquals(mismatchResponse.status, 403);
      assertEquals(await mismatchResponse.json(), {
        error: "apple_identity_mismatch",
      });
      assertEquals(revokeCalls, 0);
      assertEquals(deletedUserIds, []);

      userId = crypto.randomUUID();
      expectedSubject = "apple-subject-2";
      tokenSubject = expectedSubject;
      const matchingResponse = await handleDeleteAccountRequest(
        createPostRequest({
          appleAuthorizationCode: "matching-code",
          confirm: true,
        })
      );

      assertEquals(matchingResponse.status, 200);
      assertEquals(revokeCalls, 1);
      assertEquals(deletedUserIds, [userId]);
    } finally {
      globalThis.fetch = originalFetch;
      restoreAppleEnvironment();
      restoreEnvironment();
    }
  },
});
