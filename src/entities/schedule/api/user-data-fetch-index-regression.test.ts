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

describe("사용자 데이터 조회 인덱스 회귀 가드", () => {
  const requiredIndexes = [
    "idx_recurring_items_user_archived_created_at",
    "idx_completion_logs_user_item_scheduled_at",
    "idx_completion_logs_user_item_action_acted_at",
  ];

  it("migration에 조회 경계용 복합 인덱스를 남긴다", () => {
    const migrations = readMigrations();

    for (const indexName of requiredIndexes) {
      expect(migrations).toContain(indexName);
    }
  });

  it("DATABASE 문서에도 조회 경계용 복합 인덱스를 반영한다", () => {
    const databaseSql = readWorkspaceFile("docs/DATABASE.sql");

    for (const indexName of requiredIndexes) {
      expect(databaseSql).toContain(indexName);
    }
  });
});
