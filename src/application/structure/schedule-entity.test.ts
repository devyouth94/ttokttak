declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { existsSync, readdirSync, readFileSync, statSync } = require("fs") as {
  existsSync: (path: string) => boolean;
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding: "utf8") => string;
  statSync: (path: string) => { isDirectory: () => boolean };
};

function getWorkspacePath(relativePath: string): string {
  return `${process.cwd()}/${relativePath}`;
}

function listSourceFiles(relativePath: string): string[] {
  return readdirSync(getWorkspacePath(relativePath)).flatMap((entry) => {
    const entryPath = `${relativePath}/${entry}`;
    const absoluteEntryPath = getWorkspacePath(entryPath);

    if (statSync(absoluteEntryPath).isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return /\.(ts|tsx)$/.test(entryPath) ? [entryPath] : [];
  });
}

describe("schedule entity", () => {
  it("일정 도메인 계산은 schedule entity segment에 둔다", () => {
    expect(existsSync(getWorkspacePath("src/entities/schedule"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/entities/schedule/model"))).toBe(
      true
    );
    expect(existsSync(getWorkspacePath("src/entities/schedule/lib"))).toBe(
      true
    );
    expect(existsSync(getWorkspacePath("src/entities/schedule/ui"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/features/recurring/domain"))).toBe(
      false
    );
    expect(existsSync(getWorkspacePath("src/features/recurring/utils"))).toBe(
      false
    );
  });

  it("entity 외부는 schedule public API만 import한다", () => {
    const externalFiles = listSourceFiles("src").filter(
      (file) => !file.startsWith("src/entities/schedule/")
    );

    for (const file of externalFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toMatch(/entities\/schedule\/(model|lib|ui)\//);
    }
  });
});
