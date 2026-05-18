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

const normalizeMarkdown = (content: string): string =>
  content.replaceAll("**", "").replaceAll("`", "");

describe("종료일 문서 정합성", () => {
  it("주요 문서는 종료일 정책을 같은 의미로 설명한다", () => {
    const docs = [
      {
        content: readDoc("CONTEXT.md"),
        path: "CONTEXT.md",
      },
      {
        content: readDoc("docs/DOMAIN_LOGIC.md"),
        path: "docs/DOMAIN_LOGIC.md",
      },
      {
        content: readDoc("docs/PRODUCT_SPEC.md"),
        path: "docs/PRODUCT_SPEC.md",
      },
      {
        content: readDoc("docs/SYSTEM_DESIGN.md"),
        path: "docs/SYSTEM_DESIGN.md",
      },
      {
        content: readDoc("docs/DATABASE.sql"),
        path: "docs/DATABASE.sql",
      },
    ];

    for (const doc of docs) {
      const content = normalizeMarkdown(doc.content);

      expect(content).toContain("종료일 정책");
      expect(content).toContain("한 번 일정");
      expect(content).toContain("종료일을 갖지 않는다");
      expect(content).toContain("occurrence local date");
      expect(content).toContain("기기 로컬 알림");
    }
  });

  it("DB 문서와 마이그레이션은 완료일 기준 반복 조합 제약을 가진다", () => {
    const databaseDoc = readDoc("docs/DATABASE.sql");
    const migrations = readdirSync(join(process.cwd(), "supabase/migrations"))
      .filter((path) => path.endsWith(".sql"))
      .map((path) => readDoc(`supabase/migrations/${path}`))
      .join("\n");

    for (const content of [databaseDoc, migrations]) {
      expect(content).toContain(
        "recurring_item_schedule_versions_completion_based_recurrence_check"
      );
      expect(content).toContain("anchor_type <> 'completion_based'");
      expect(content).toContain(
        "recurrence_type in ('daily', 'interval_days', 'monthly', 'interval_months')"
      );
    }
  });
});
