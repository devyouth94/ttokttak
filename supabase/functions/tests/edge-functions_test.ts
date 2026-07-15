import { assertEquals } from "jsr:@std/assert@1";

import { handleDeleteAccountRequest } from "../delete-account/handler.ts";
import { handleRecoverContentKeyRequest } from "../recover-content-key/handler.ts";

const testSupabaseUrl = "https://test.supabase.co";

function setTestEnvironment(): () => void {
  const values = {
    SB_PUBLISHABLE_KEY: "test-publishable-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    SUPABASE_URL: testSupabaseUrl,
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

Deno.test({
  name: "계정 삭제 함수는 사용자별 요청 한도를 넘으면 429를 반환한다",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const restoreEnvironment = setTestEnvironment();
    const originalFetch = globalThis.fetch;
    const userId = crypto.randomUUID();
    let authenticatedUserId = userId;

    try {
      globalThis.fetch = async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        const url = new URL(request.url);

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            user: createAuthenticatedUser(authenticatedUserId),
          });
        }

        if (url.pathname === `/auth/v1/admin/users/${authenticatedUserId}`) {
          return Response.json({});
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

      authenticatedUserId = crypto.randomUUID();
      const otherUserResponse = await handleDeleteAccountRequest(
        createPostRequest({ confirm: true })
      );

      assertEquals(otherUserResponse.status, 200);
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvironment();
    }
  },
});

Deno.test({
  name: "content key 복구 함수는 요청 한도 초과와 감사 payload를 함께 기록한다",
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
          input instanceof Request ? input : new Request(input, init);
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

      const lastAuditPayload = auditPayloads.at(-1);
      const expectedAuditPayload = {
        action: "wrap",
        key_version: 7,
        result: "rate_limited",
        user_id: userId,
      };

      assertEquals(lastAuditPayload, expectedAuditPayload);

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
