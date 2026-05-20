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

describe("notification and privacy boundary", () => {
  it("Expo Notifications adapter와 identifier parser는 shared foundation에 둔다", () => {
    expect(
      existsSync(
        getWorkspacePath(
          "src/shared/lib/notifications/expo-notifications-adapter.ts"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        getWorkspacePath(
          "src/shared/lib/notifications/local-reminder-identifier.ts"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        getWorkspacePath(
          "src/features/sync-local-notifications/model/local-notification-sync.ts"
        )
      )
    ).toBe(true);
  });

  it("일정 알림 정책은 sync-local-notifications feature에 남는다", () => {
    const sharedNotificationFiles = listSourceFiles(
      "src/shared/lib/notifications"
    );

    for (const file of sharedNotificationFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toContain("~/entities/schedule");
    }

    const projectionSource = readFileSync(
      getWorkspacePath(
        "src/features/sync-local-notifications/model/local-reminder-notification-projection.ts"
      ),
      "utf8"
    );

    expect(projectionSource).toContain("~/entities/schedule");
    expect(projectionSource).toContain("contentStatus");
  });

  it("privacy primitive는 shared에 두고 일정 콘텐츠 암복호화는 schedule entity에 둔다", () => {
    expect(
      existsSync(
        getWorkspacePath("src/shared/lib/privacy/aes-gcm-content-cipher.ts")
      )
    ).toBe(true);
    expect(
      existsSync(
        getWorkspacePath("src/shared/lib/privacy/content-key-store.ts")
      )
    ).toBe(true);
    expect(
      existsSync(
        getWorkspacePath(
          ["src/entities/schedule", "api/recurring-content-cipher.ts"].join("/")
        )
      )
    ).toBe(true);

    const sharedPrivacyFiles = listSourceFiles("src/shared/lib/privacy");

    for (const file of sharedPrivacyFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toContain("RecurringItem");
    }
  });
});
