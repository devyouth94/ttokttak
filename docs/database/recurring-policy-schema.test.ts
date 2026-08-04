declare const process: {
  cwd: () => string;
};

declare function require(name: string): unknown;

const { readFileSync } = require("node:fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};
const { join } = require("node:path") as {
  join: (...paths: string[]) => string;
};

const readDoc = (path: string): string =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("반복 일정 스키마 정책 정합성", () => {
  it("현재 스키마는 완료일 기준 반복 조합 제약을 가진다", () => {
    const databaseSchema = readDoc("docs/database/DATABASE.sql");

    expect(databaseSchema).toContain(
      "recurring_item_schedule_versions_completion_based_recurrence_check"
    );
    expect(databaseSchema).toContain("anchor_type <> 'completion_based'");
    expect(databaseSchema).toContain(
      "recurrence_type in ('daily', 'interval_days', 'monthly', 'interval_months')"
    );
  });

  it("삭제된 일정은 수정하지 않는다", () => {
    const databaseSchema = readDoc("docs/database/DATABASE.sql");
    const updateFunction = databaseSchema.slice(
      databaseSchema.indexOf(
        "create or replace function public.update_recurring_item_with_edit_policy"
      ),
      databaseSchema.indexOf(
        "revoke all on function public.create_recurring_item_with_initial_version"
      )
    );

    expect(updateFunction).toContain("and not is_archived");
    expect(updateFunction).not.toContain("is_archived = p_is_archived");
  });
});
