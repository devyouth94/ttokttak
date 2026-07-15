declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

function readWorkspaceFile(path: string): string {
  return readFileSync(`${process.cwd()}/${path}`, "utf8");
}

describe("content key recovery audit regression guard", () => {
  it("복구 감사 이벤트는 사용자 삭제 시 함께 삭제되는 내부 운영 기록이다", () => {
    const databaseSchema = readWorkspaceFile("docs/database/DATABASE.sql");

    expect(databaseSchema).toContain(
      "create table if not exists public.content_key_recovery_audit_events"
    );
    expect(databaseSchema).toContain(
      "user_id uuid not null references public.profiles(id) on delete cascade"
    );
    expect(databaseSchema).toContain(
      "alter table public.content_key_recovery_audit_events enable row level security"
    );
    expect(databaseSchema).toContain(
      "revoke all privileges on table public.content_key_recovery_audit_events"
    );
    expect(databaseSchema).toContain("from anon, authenticated");
    expect(databaseSchema).not.toMatch(
      /grant\s+(select|insert|update|delete|all)[^;]+content_key_recovery_audit_events[^;]+to\s+authenticated/i
    );
  });
});
