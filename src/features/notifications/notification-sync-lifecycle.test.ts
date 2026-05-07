declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

function joinPath(...parts: string[]): string {
  return parts.join("/");
}

describe("notification sync lifecycle", () => {
  it("세션 복원과 알림 tap 뒤 현재 기기 로컬 알림을 전체 재동기화한다", () => {
    const bootstrapSource = readFileSync(
      joinPath(
        process.cwd(),
        "src/features/notifications/notification-bootstrap.tsx"
      ),
      "utf8"
    );
    const rootLayoutSource = readFileSync(
      joinPath(process.cwd(), "src/app/_layout.tsx"),
      "utf8"
    );

    expect(bootstrapSource).toContain('reason: "session-restored"');
    expect(bootstrapSource).toContain("syncLocalReminderNotifications");
    expect(rootLayoutSource).toContain('reason: "notification-tapped"');
    expect(rootLayoutSource).toContain("syncLocalReminderNotifications");
  });
});
