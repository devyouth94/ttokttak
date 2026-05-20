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

describe("schedule screens", () => {
  it("일정 목록 구현은 schedule list screen slice에 둔다", () => {
    const publicApi = readFileSync(
      getWorkspacePath("src/screens/schedule-list/index.ts"),
      "utf8"
    );

    expect(existsSync(getWorkspacePath("src/screens/schedule-list"))).toBe(
      true
    );
    expect(
      existsSync(getWorkspacePath("src/screens/schedule-list/model"))
    ).toBe(true);
    expect(existsSync(getWorkspacePath("src/screens/schedule-list/ui"))).toBe(
      true
    );
    expect(existsSync(getWorkspacePath("src/features/reminder-list"))).toBe(
      false
    );
    expect(publicApi).toContain("ScheduleListScreen");
  });

  it("캘린더 구현은 calendar screen slice에 둔다", () => {
    const publicApi = readFileSync(
      getWorkspacePath("src/screens/calendar/index.ts"),
      "utf8"
    );

    expect(existsSync(getWorkspacePath("src/screens/calendar"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/screens/calendar/model"))).toBe(
      true
    );
    expect(existsSync(getWorkspacePath("src/screens/calendar/ui"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/features/calendar-view"))).toBe(
      false
    );
    expect(publicApi).toContain("CalendarScreen");
  });

  it("screen 외부는 schedule screen public API만 import한다", () => {
    const externalFiles = listSourceFiles("src").filter(
      (file) =>
        !file.startsWith("src/screens/schedule-list/") &&
        !file.startsWith("src/screens/calendar/")
    );

    for (const file of externalFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toMatch(/screens\/schedule-list\/(model|ui)\//);
      expect(source).not.toMatch(/screens\/calendar\/(model|ui)\//);
    }
  });
});
