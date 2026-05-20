declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { existsSync, readFileSync, readdirSync, statSync } = require("fs") as {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: "utf8") => string;
  readdirSync: (path: string) => string[];
  statSync: (path: string) => { isDirectory: () => boolean };
};

function getWorkspacePath(relativePath: string): string {
  return `${process.cwd()}/${relativePath}`;
}

describe("shared foundation", () => {
  it("shared 최상위 segment는 허용 목적 이름만 사용한다", () => {
    const allowedSegments = new Set([
      "api",
      "config",
      "i18n",
      "lib",
      "routes",
      "ui",
    ]);
    const sharedSegments = readdirSync(getWorkspacePath("src/shared"));

    expect(
      sharedSegments.every((segment) => allowedSegments.has(segment))
    ).toBe(true);
    expect(sharedSegments).toEqual(
      expect.arrayContaining(["api", "config", "lib", "ui"])
    );
  });

  it("shared lib는 주제 폴더 아래에만 파일을 둔다", () => {
    const libEntries = readdirSync(getWorkspacePath("src/shared/lib"));

    expect(libEntries).toEqual(
      expect.arrayContaining(["errors", "privacy", "query"])
    );

    for (const entry of libEntries) {
      expect(
        statSync(getWorkspacePath(`src/shared/lib/${entry}`)).isDirectory()
      ).toBe(true);
    }
  });

  it("도메인 정책 코드는 shared로 옮기지 않는다", () => {
    const databaseTypesSource = readFileSync(
      getWorkspacePath("src/shared/api/database.types.ts"),
      "utf8"
    );

    expect(databaseTypesSource).not.toContain("export type RecurringItemRow");
    expect(databaseTypesSource).not.toContain("export type CompletionLogRow");
    expect(databaseTypesSource).not.toContain(
      "export type UserContentEncryptionKeyRow"
    );
    expect(
      existsSync(
        getWorkspacePath("src/features/privacy/recurring-content-cipher.ts")
      )
    ).toBe(true);
    expect(
      existsSync(
        getWorkspacePath(
          "src/features/notifications/local-notification-sync.ts"
        )
      )
    ).toBe(true);
    expect(
      existsSync(getWorkspacePath("src/features/legal/legal-links.ts"))
    ).toBe(true);
  });
});
