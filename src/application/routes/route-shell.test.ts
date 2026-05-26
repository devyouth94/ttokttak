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
    expect(rootLayout).not.toContain("NotificationProvider");
  });

  it("메인 탭 shell 제목은 앱 표시 언어 리소스를 사용한다", () => {
    const tabsLayout = readWorkspaceFile("app/(tabs)/_layout.tsx");

    expect(tabsLayout).toContain("useTranslation()");
    expect(tabsLayout).toContain('t("navigation.tabs.home")');
    expect(tabsLayout).toContain('t("navigation.tabs.schedule")');
    expect(tabsLayout).toContain('t("navigation.tabs.calendar")');
    expect(tabsLayout).toContain('t("navigation.tabs.settings")');
  });

  it("설정 route는 settings screen만 연결한다", () => {
    const settingsRoute = readWorkspaceFile("app/(tabs)/settings/index.tsx");

    expect(settingsRoute).toContain("<SettingsScreen />");
    expect(settingsRoute).not.toContain("useSession");
    expect(settingsRoute).not.toContain("useNotifications");
    expect(settingsRoute).not.toContain("Alert");
  });

  it("홈 route는 home screen만 연결한다", () => {
    const homeRoute = readWorkspaceFile("app/(tabs)/home/index.tsx");

    expect(homeRoute).toContain("<HomeScreen />");
    expect(homeRoute).toContain("~/screens/home");
    expect(homeRoute).not.toContain("~/features/home");
    expect(homeRoute).not.toContain("useOccurrenceProjectionQuery");
    expect(homeRoute).not.toContain("useNotifications");
  });

  it("일정 목록 route는 schedule list screen만 연결한다", () => {
    const scheduleRoute = readWorkspaceFile("app/(tabs)/schedule/index.tsx");

    expect(scheduleRoute).toContain("<ScheduleListScreen />");
    expect(scheduleRoute).toContain("~/screens/schedule-list");
    expect(scheduleRoute).not.toContain("~/features/reminder-list");
    expect(scheduleRoute).not.toContain("useOccurrenceProjectionQuery");
  });

  it("캘린더 route는 calendar screen만 연결한다", () => {
    const calendarRoute = readWorkspaceFile("app/(tabs)/calendar/index.tsx");

    expect(calendarRoute).toContain("<CalendarScreen />");
    expect(calendarRoute).toContain("~/screens/calendar");
    expect(calendarRoute).not.toContain("~/features/calendar-view");
    expect(calendarRoute).not.toContain("useOccurrenceProjectionQuery");
  });

  it("일정 생성 route는 schedule create screen만 연결한다", () => {
    const createRoute = readWorkspaceFile("app/items/new.tsx");

    expect(createRoute).toContain("<ScheduleCreateScreen");
    expect(createRoute).toContain("~/screens/schedule-create");
    expect(createRoute).not.toContain("~/features/recurring");
    expect(createRoute).not.toContain("useSession");
    expect(createRoute).not.toContain("useNotifications");
  });

  it("일정 상세 route는 schedule detail screen만 연결한다", () => {
    const detailRoute = readWorkspaceFile("app/items/[itemId]/index.tsx");

    expect(detailRoute).toContain("<ScheduleDetailScreen");
    expect(detailRoute).toContain("~/screens/schedule-detail");
    expect(detailRoute).not.toContain("~/features/recurring");
    expect(detailRoute).not.toContain("useScheduleByIdQuery");
    expect(detailRoute).not.toContain("useNotifications");
  });

  it("일정 수정 route는 schedule edit screen만 연결한다", () => {
    const editRoute = readWorkspaceFile("app/items/[itemId]/edit.tsx");

    expect(editRoute).toContain("<ScheduleEditScreen");
    expect(editRoute).toContain("~/screens/schedule-edit");
    expect(editRoute).not.toContain("~/features/recurring");
    expect(editRoute).not.toContain("useSession");
    expect(editRoute).not.toContain("useNotifications");
  });

  it("index route는 login screen만 연결한다", () => {
    const indexRoute = readWorkspaceFile("app/index.tsx");

    expect(indexRoute).toContain("<LoginScreen />");
    expect(indexRoute).toContain("~/screens/login");
    expect(indexRoute).not.toContain("useSession");
    expect(indexRoute).not.toContain("Redirect");
    expect(indexRoute).not.toContain("~/features/sign-in");
    expect(indexRoute).not.toContain("~/application/session");
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
