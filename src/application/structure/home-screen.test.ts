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

describe("home screen", () => {
  it("홈 피드 구현은 screen slice에 둔다", () => {
    expect(existsSync(getWorkspacePath("src/screens/home"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/screens/home/model"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/screens/home/ui"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/features/home"))).toBe(false);
  });

  it("홈 피드 occurrence 처리는 feature use case로 분리한다", () => {
    const publicApi = readFileSync(
      getWorkspacePath("src/features/home-feed-occurrence-action/index.ts"),
      "utf8"
    );

    expect(
      existsSync(getWorkspacePath("src/features/home-feed-occurrence-action"))
    ).toBe(true);
    expect(publicApi).toContain("completeHomeFeedOccurrence");
    expect(publicApi).toContain("skipHomeFeedOccurrence");
    expect(publicApi).not.toContain("processHomeFeedOccurrenceAction");
  });

  it("홈 screen 외부는 home screen public API만 import한다", () => {
    const externalFiles = listSourceFiles("src").filter(
      (file) => !file.startsWith("src/screens/home/")
    );

    for (const file of externalFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toMatch(/screens\/home\/(model|ui)\//);
    }
  });
});
