declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readdirSync, readFileSync } = require("fs") as {
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding: "utf8") => string;
};

function readWorkspaceFile(path: string): string {
  return readFileSync(`${process.cwd()}/${path}`, "utf8");
}

function readMigrations(): string {
  return readdirSync(`${process.cwd()}/supabase/migrations`)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => readWorkspaceFile(`supabase/migrations/${fileName}`))
    .join("\n");
}

describe("content key recovery audit regression guard", () => {
  it("복구 감사 이벤트는 사용자 삭제 시 함께 삭제되는 내부 운영 기록이다", () => {
    const migrations = readMigrations();

    expect(migrations).toContain(
      "create table if not exists public.content_key_recovery_audit_events"
    );
    expect(migrations).toContain(
      "user_id uuid not null references public.profiles(id) on delete cascade"
    );
    expect(migrations).toContain(
      "alter table public.content_key_recovery_audit_events enable row level security"
    );
    expect(migrations).toContain(
      "revoke all privileges on table public.content_key_recovery_audit_events"
    );
    expect(migrations).toContain("from anon, authenticated");
    expect(migrations).not.toMatch(
      /grant\s+(select|insert|update|delete|all)[^;]+content_key_recovery_audit_events[^;]+to\s+authenticated/i
    );
  });

  it("복구 함수는 낮은 해상도 결과만 감사 이벤트에 남긴다", () => {
    const functionSource = readWorkspaceFile(
      "supabase/functions/recover-content-key/index.ts"
    );

    expect(functionSource).toContain("content_key_recovery_audit_events");
    expect(functionSource).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(functionSource).toContain("RecoveryAuditResult");
    expect(functionSource).toContain("success");
    expect(functionSource).toContain("invalid_request");
    expect(functionSource).toContain("rate_limited");
    expect(functionSource).toContain("server_error");

    const auditInsertBlock =
      functionSource.match(
        /\.from\("content_key_recovery_audit_events"\)[\s\S]+?\.insert\(([\s\S]+?)\);/
      )?.[1] ?? "";

    expect(auditInsertBlock).toContain("action");
    expect(auditInsertBlock).toContain("key_version");
    expect(auditInsertBlock).toContain("result");
    expect(auditInsertBlock).toContain("user_id");
    expect(auditInsertBlock).not.toContain("encodedKey");
    expect(auditInsertBlock).not.toContain("wrappedKey");
    expect(auditInsertBlock).not.toContain("wrapped_key");
    expect(auditInsertBlock).not.toContain("ciphertext");
    expect(auditInsertBlock).not.toContain("title");
    expect(auditInsertBlock).not.toContain("description");
    expect(auditInsertBlock).not.toContain("message");
  });
});
