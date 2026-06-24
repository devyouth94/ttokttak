declare const process: {
  cwd: () => string;
};

declare function require(name: string): unknown;

const { readdirSync, readFileSync } = require("node:fs") as {
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding: "utf8") => string;
};
const { join } = require("node:path") as {
  join: (...paths: string[]) => string;
};

const readDoc = (path: string): string =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("반복 일정 스키마 정책 정합성", () => {
  it("마이그레이션은 완료일 기준 반복 조합 제약을 가진다", () => {
    const migrations = readdirSync(join(process.cwd(), "supabase/migrations"))
      .filter((path) => path.endsWith(".sql"))
      .map((path) => readDoc(`supabase/migrations/${path}`))
      .join("\n");

    expect(migrations).toContain(
      "recurring_item_schedule_versions_completion_based_recurrence_check"
    );
    expect(migrations).toContain("anchor_type <> 'completion_based'");
    expect(migrations).toContain(
      "recurrence_type in ('daily', 'interval_days', 'monthly', 'interval_months')"
    );
  });
});
