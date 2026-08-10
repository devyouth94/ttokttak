import {
  findContentKey,
  recoverContentKey,
  saveContentKey,
  wrapContentKey,
} from "./content-key";

declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

describe("content key DB", () => {
  it("wrapped key를 저장하고 사용자와 key version으로 찾는다", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { user_id: "user-1" },
      error: null,
    });
    const query = {
      eq: jest.fn(),
      maybeSingle,
      select: jest.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const from = jest
      .fn()
      .mockReturnValueOnce({ upsert })
      .mockReturnValueOnce(query);
    const client = { from } as never;

    await saveContentKey(
      {
        keyVersion: 1,
        userId: "user-1",
        wrapAlgorithm: "AES-GCM",
        wrapMetadata: { encoding: "combined-base64" },
        wrappedKey: "wrapped-key",
      },
      client
    );

    await expect(
      findContentKey({ keyVersion: 1, userId: "user-1" }, client)
    ).resolves.toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      {
        key_version: 1,
        user_id: "user-1",
        wrap_algorithm: "AES-GCM",
        wrap_metadata: { encoding: "combined-base64" },
        wrapped_key: "wrapped-key",
      },
      { onConflict: "user_id,key_version" }
    );
    expect(query.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "key_version", 1);
  });

  it("Edge Function으로 content key를 감싸고 복구한다", async () => {
    const invoke = jest
      .fn()
      .mockImplementation(
        async (_name: string, options: { body: { action: string } }) => ({
          data:
            options.body.action === "wrap"
              ? {
                  wrapAlgorithm: "AES-GCM",
                  wrapMetadata: { encoding: "combined-base64" },
                  wrappedKey: "wrapped-key",
                }
              : { encodedKey: "content-key" },
          error: null,
        })
      );
    const client = { functions: { invoke } } as never;

    await expect(
      wrapContentKey({ encodedKey: "content-key", keyVersion: 1 }, client)
    ).resolves.toMatchObject({ wrappedKey: "wrapped-key" });
    await expect(recoverContentKey(1, client)).resolves.toBe("content-key");
    expect(invoke).toHaveBeenNthCalledWith(1, "recover-content-key", {
      body: {
        action: "wrap",
        encodedKey: "content-key",
        keyVersion: 1,
      },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "recover-content-key", {
      body: { action: "recover", keyVersion: 1 },
    });
  });

  it("복구 감사 이벤트는 사용자 삭제 시 함께 삭제되는 내부 기록이다", () => {
    const schema = readFileSync(
      `${process.cwd()}/docs/database/DATABASE.sql`,
      "utf8"
    );

    expect(schema).toContain(
      "create table if not exists public.content_key_recovery_audit_events"
    );
    expect(schema).toContain(
      "user_id uuid not null references public.profiles(id) on delete cascade"
    );
    expect(schema).toContain(
      "alter table public.content_key_recovery_audit_events enable row level security"
    );
    expect(schema).toContain(
      "revoke all privileges on table public.content_key_recovery_audit_events"
    );
    expect(schema).toContain("from anon, authenticated");
    expect(schema).not.toMatch(
      /grant\s+(select|insert|update|delete|all)[^;]+content_key_recovery_audit_events[^;]+to\s+authenticated/i
    );
  });

  it("wrapped key는 사용자와 version에 결합하고 클라이언트 변경을 막는다", () => {
    const schema = readFileSync(
      `${process.cwd()}/docs/database/DATABASE.sql`,
      "utf8"
    );

    expect(schema).toContain("wrap_metadata->>'keySource' = 'edge-secret-v2'");
    expect(schema).toContain(
      "wrap_metadata->>'binding' = 'user-key-version-v1'"
    );
    expect(schema).toContain(
      "create or replace function public.guard_user_content_encryption_key_write()"
    );
    expect(schema).toContain(
      "before insert or update on public.user_content_encryption_keys"
    );
  });
});
