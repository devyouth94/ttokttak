declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(`${process.cwd()}/${relativePath}`, "utf8");
}

function expectContainsInOrder(source: string, values: string[]): void {
  let previousIndex = -1;

  for (const value of values) {
    const nextIndex = source.indexOf(value);

    expect(nextIndex).toBeGreaterThan(previousIndex);
    previousIndex = nextIndex;
  }
}

describe("SettingsScreen 환경 설정", () => {
  it("설정 화면에서 한국어와 English select를 현재 표시 언어에 연결한다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );
    const settingsController = readWorkspaceFile(
      "src/screens/settings/model/use-settings-screen-controller.ts"
    );

    expect(settingsController).toContain("useTranslation()");
    expect(settingsController).toContain("useAppLanguage()");
    expect(settingsScreen).toContain("<AppSelectMenu");
    expect(settingsController).toContain(
      'environmentSection: t("settings.environment.section")'
    );
    expect(settingsController).toContain(
      'appLanguage: t("settings.environment.appLanguage")'
    );
    expect(settingsController).toContain(
      'theme: t("settings.environment.theme")'
    );
    expect(settingsController).toContain(
      'timezone: t("settings.environment.timezone")'
    );
    expect(settingsScreen).toContain("options={options.appLanguage}");
    expect(settingsScreen).toContain("value={values.appLanguage}");
    expect(settingsScreen).toContain("actions.changeAppLanguage(nextLanguage)");
  });

  it("환경 카드에 표시 언어, 테마, 시간대 순서로 표시한다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    expectContainsInOrder(settingsScreen, [
      "title={copy.appLanguage}",
      "title={copy.theme}",
      "title={copy.timezone}",
    ]);
  });

  it("테마 select를 system, light, dark 순서와 현재 테마 preference에 연결한다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );
    const settingsController = readWorkspaceFile(
      "src/screens/settings/model/use-settings-screen-controller.ts"
    );
    expect(settingsController).toContain("useAppTheme()");
    expect(settingsScreen).toContain("<AppSelectMenu");
    expect(settingsScreen).toContain("options={options.themePreference}");
    expect(settingsScreen).toContain("value={values.themePreference}");
    expect(settingsScreen).toContain(
      "actions.changeThemePreference(nextPreference)"
    );
  });
  it("표시 언어 변경 알림 재동기화는 notification provider lifecycle이 담당한다", () => {
    const notificationProvider = readWorkspaceFile(
      "src/application/notifications/local-notification-provider.tsx"
    );
    const notificationLifecycle = readWorkspaceFile(
      "src/features/sync-local-notifications/model/local-notification-sync-lifecycle.ts"
    );

    expect(notificationProvider).toContain("previousLanguageRef");
    expect(notificationProvider).toContain(
      "notificationSyncLifecycle.syncAfterAppLanguageChanged"
    );
    expect(notificationLifecycle).toContain('reason: "app-language-changed"');
  });

  it("표시 언어 저장 실패 시 실패 안내를 보여준다", () => {
    const settingsController = readWorkspaceFile(
      "src/screens/settings/model/use-settings-screen-controller.ts"
    );

    expect(settingsController).toContain(
      't("settings.environment.saveErrorTitle")'
    );
    expect(settingsController).toContain(
      't("settings.environment.saveErrorMessage")'
    );
  });

  it("테마 저장 실패 시 실패 안내를 보여준다", () => {
    const settingsController = readWorkspaceFile(
      "src/screens/settings/model/use-settings-screen-controller.ts"
    );

    expect(settingsController).toContain(
      't("settings.environment.themeSaveErrorTitle")'
    );
    expect(settingsController).toContain(
      't("settings.environment.themeSaveErrorMessage")'
    );
  });

  it("설정 화면 자체 문구도 i18n resource를 사용한다", () => {
    const settingsController = readWorkspaceFile(
      "src/screens/settings/model/use-settings-screen-controller.ts"
    );

    expect(settingsController).toContain('t("settings.headerTitle")');
    expect(settingsController).toContain('t("settings.account.section")');
    expect(settingsController).toContain('t("settings.notifications.section")');
    expect(settingsController).toContain('t("settings.appInfo.section")');
    expect(settingsController).toContain(
      't("settings.accountManagement.section")'
    );
    expect(settingsController).toContain('t("settings.nameEditor.title")');
  });

  it("표시 언어와 테마를 서버 profile 저장 흐름에 추가하지 않는다", () => {
    const profileRepository = readWorkspaceFile(
      "src/entities/profile/api/profile-repository.ts"
    );
    const profileTypes = readWorkspaceFile(
      "src/entities/profile/api/profile.types.ts"
    );
    const databaseTypes = readWorkspaceFile("src/shared/api/database.types.ts");

    expect(profileRepository).not.toContain("app_language");
    expect(profileRepository).not.toContain("display_language");
    expect(profileRepository).not.toContain("theme_preference");
    expect(profileTypes).not.toContain("app_language");
    expect(profileTypes).not.toContain("display_language");
    expect(profileTypes).not.toContain("theme_preference");
    expect(databaseTypes).not.toContain("app_language");
    expect(databaseTypes).not.toContain("display_language");
    expect(databaseTypes).not.toContain("theme_preference");
  });
});
