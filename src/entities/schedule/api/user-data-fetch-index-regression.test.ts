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

describe("사용자 데이터 조회 인덱스 회귀 가드", () => {
  const requiredIndexes = [
    "idx_recurring_items_user_archived_created_at",
    "idx_completion_logs_user_item_scheduled_at",
    "idx_completion_logs_user_item_action_acted_at",
  ];

  it("현재 스키마에 조회 경계용 복합 인덱스를 남긴다", () => {
    const databaseSchema = readWorkspaceFile("docs/database/DATABASE.sql");

    for (const indexName of requiredIndexes) {
      expect(databaseSchema).toContain(indexName);
    }
  });
});
