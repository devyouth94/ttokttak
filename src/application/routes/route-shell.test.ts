declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { existsSync, readFileSync } = require("fs") as {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: "utf8") => string;
};

function getWorkspacePath(relativePath: string): string {
  return `${process.cwd()}/${relativePath}`;
}

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(getWorkspacePath(relativePath), "utf8");
}

describe("route shell", () => {
  it("Expo Router route는 루트 app에 둔다", () => {
    expect(existsSync(getWorkspacePath("app/_layout.tsx"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/app"))).toBe(false);
  });

  it("루트 layout은 application provider와 bootstrap을 조립한다", () => {
    const rootLayout = readWorkspaceFile("app/_layout.tsx");

    expect(rootLayout).toContain("<AppProviders>");
    expect(rootLayout).toContain("<AppBootstrap />");
    expect(rootLayout).not.toContain("QueryClientProvider");
    expect(rootLayout).not.toContain("NotificationBootstrapProvider");
  });

  it("설정 route는 settings screen만 연결한다", () => {
    const settingsRoute = readWorkspaceFile("app/(tabs)/settings/index.tsx");

    expect(settingsRoute).toContain("<SettingsScreen />");
    expect(settingsRoute).not.toContain("useSession");
    expect(settingsRoute).not.toContain("useNotificationBootstrap");
    expect(settingsRoute).not.toContain("Alert");
  });

  it("index route는 login screen만 연결한다", () => {
    const indexRoute = readWorkspaceFile("app/index.tsx");

    expect(indexRoute).toContain("<LoginScreen />");
    expect(indexRoute).not.toContain("useSession");
    expect(indexRoute).not.toContain("Redirect");
  });

  it("route params 배열 정규화는 application helper를 사용한다", () => {
    const itemRoutes = [
      "app/items/new.tsx",
      "app/items/[itemId]/index.tsx",
      "app/items/[itemId]/edit.tsx",
    ];

    for (const routePath of itemRoutes) {
      const routeSource = readWorkspaceFile(routePath);

      expect(routeSource).toContain("getFirstRouteParam");
      expect(routeSource).not.toContain("Array.isArray");
    }
  });
});
