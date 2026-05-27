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

describe("SettingsScreen 환경 설정", () => {
  it("설정 화면에서 한국어와 English select를 현재 표시 언어에 연결한다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    expect(settingsScreen).toContain("useTranslation()");
    expect(settingsScreen).toContain("useAppLanguage()");
    expect(settingsScreen).toContain("<AppSelectMenu");
    expect(settingsScreen).toContain(
      'title={t("settings.environment.section")}'
    );
    expect(settingsScreen).toContain('t("settings.environment.appLanguage")');
    expect(settingsScreen).toContain('t("settings.environment.theme")');
    expect(settingsScreen).toContain('t("settings.environment.timezone")');
    expect(settingsScreen).toContain('label: "한국어"');
    expect(settingsScreen).toContain('label: "English"');
    expect(settingsScreen).toContain("handleChangeAppLanguage(nextLanguage)");
  });

  it("환경 카드에 표시 언어, 테마, 시간대 순서로 표시한다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    const languageIndex = settingsScreen.indexOf(
      'title={t("settings.environment.appLanguage")}'
    );
    const themeIndex = settingsScreen.indexOf(
      'title={t("settings.environment.theme")}'
    );
    const timezoneIndex = settingsScreen.indexOf(
      'title={t("settings.environment.timezone")}'
    );

    expect(languageIndex).toBeGreaterThan(-1);
    expect(themeIndex).toBeGreaterThan(languageIndex);
    expect(timezoneIndex).toBeGreaterThan(themeIndex);
  });

  it("테마 select를 system, light, dark 순서와 현재 테마 preference에 연결한다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    const systemIndex = settingsScreen.indexOf('value: "system"');
    const lightIndex = settingsScreen.indexOf('value: "light"');
    const darkIndex = settingsScreen.indexOf('value: "dark"');

    expect(settingsScreen).toContain("useAppTheme()");
    expect(settingsScreen).toContain("<AppSelectMenu");
    expect(settingsScreen).toContain('t("settings.environment.themeSystem")');
    expect(settingsScreen).toContain('t("settings.environment.themeLight")');
    expect(settingsScreen).toContain('t("settings.environment.themeDark")');
    expect(systemIndex).toBeGreaterThan(-1);
    expect(lightIndex).toBeGreaterThan(systemIndex);
    expect(darkIndex).toBeGreaterThan(lightIndex);
    expect(settingsScreen).toContain(
      "handleChangeThemePreference(nextPreference)"
    );
  });

  it("설정 화면은 현재 테마 색 토큰으로 카드, row, modal, input 스타일을 만든다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    expect(settingsScreen).toContain("useSettingsScreenStyles()");
    expect(settingsScreen).toContain("createSettingsScreenStyles(themeColors)");
    expect(settingsScreen).toContain("themeColors.surface");
    expect(settingsScreen).toContain("themeColors.dividerOnPrimary");
    expect(settingsScreen).toContain(
      "placeholderTextColor={themeColors.textSoft}"
    );
    expect(settingsScreen).not.toContain("colors.");
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
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    expect(settingsScreen).toContain(
      't("settings.environment.saveErrorTitle")'
    );
    expect(settingsScreen).toContain(
      't("settings.environment.saveErrorMessage")'
    );
  });

  it("테마 저장 실패 시 실패 안내를 보여준다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    expect(settingsScreen).toContain(
      't("settings.environment.themeSaveErrorTitle")'
    );
    expect(settingsScreen).toContain(
      't("settings.environment.themeSaveErrorMessage")'
    );
  });

  it("설정 화면 자체 문구도 i18n resource를 사용한다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    expect(settingsScreen).toContain('t("settings.headerTitle")');
    expect(settingsScreen).toContain('t("settings.account.section")');
    expect(settingsScreen).toContain('t("settings.notifications.section")');
    expect(settingsScreen).toContain('t("settings.appInfo.section")');
    expect(settingsScreen).toContain('t("settings.accountManagement.section")');
    expect(settingsScreen).toContain('t("settings.nameEditor.title")');
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
