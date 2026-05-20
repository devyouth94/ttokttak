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

  it("일정 상세, 생성, 수정 화면은 screen slice에 둔다", () => {
    const screenSlices = [
      {
        exportedName: "ScheduleDetailScreen",
        path: "src/screens/schedule-detail",
      },
      {
        exportedName: "ScheduleCreateScreen",
        path: "src/screens/schedule-create",
      },
      {
        exportedName: "ScheduleEditScreen",
        path: "src/screens/schedule-edit",
      },
    ];

    for (const screenSlice of screenSlices) {
      const publicApi = readFileSync(
        getWorkspacePath(`${screenSlice.path}/index.ts`),
        "utf8"
      );

      expect(existsSync(getWorkspacePath(screenSlice.path))).toBe(true);
      expect(existsSync(getWorkspacePath(`${screenSlice.path}/ui`))).toBe(true);
      expect(publicApi).toContain(screenSlice.exportedName);
    }

    expect(existsSync(getWorkspacePath("src/screens/schedule-form"))).toBe(
      true
    );
    expect(
      existsSync(getWorkspacePath("src/screens/schedule-form/model"))
    ).toBe(true);
    expect(existsSync(getWorkspacePath("src/screens/schedule-form/ui"))).toBe(
      true
    );
    expect(
      existsSync(getWorkspacePath("src/features/recurring/components"))
    ).toBe(false);
  });

  it("screen 외부는 schedule screen public API만 import한다", () => {
    const scheduleScreenPaths = [
      "src/screens/schedule-list/",
      "src/screens/calendar/",
      "src/screens/schedule-detail/",
      "src/screens/schedule-create/",
      "src/screens/schedule-edit/",
      "src/screens/schedule-form/",
    ];
    const externalFiles = listSourceFiles("src").filter(
      (file) => !scheduleScreenPaths.some((path) => file.startsWith(path))
    );

    for (const file of externalFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toMatch(/screens\/schedule-list\/(model|ui)\//);
      expect(source).not.toMatch(/screens\/calendar\/(model|ui)\//);
      expect(source).not.toMatch(/screens\/schedule-detail\/(model|ui)\//);
      expect(source).not.toMatch(/screens\/schedule-create\/(model|ui)\//);
      expect(source).not.toMatch(/screens\/schedule-edit\/(model|ui)\//);
      expect(source).not.toMatch(/screens\/schedule-form\/(model|ui)\//);
    }
  });
});
