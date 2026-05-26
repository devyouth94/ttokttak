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

describe("SettingsScreen 앱 표시 언어", () => {
  it("설정 화면에서 한국어와 English select를 현재 앱 표시 언어에 연결한다", () => {
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
    expect(settingsScreen).toContain('t("settings.environment.timezone")');
    expect(settingsScreen).toContain('label: "한국어"');
    expect(settingsScreen).toContain('label: "English"');
    expect(settingsScreen).toContain("handleChangeAppLanguage(nextLanguage)");
  });

  it("앱 표시 언어 저장 성공 뒤 현재 기기의 로컬 알림을 재동기화한다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    expect(settingsScreen).toContain("syncAfterAppLanguageChanged");
    expect(settingsScreen).toContain(
      "await syncAfterAppLanguageChanged(nextLanguage)"
    );
    expect(settingsScreen).toContain(
      't("settings.environment.syncErrorTitle")'
    );
  });

  it("앱 표시 언어 저장 실패 시 실패 안내를 보여준다", () => {
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

  it("앱 표시 언어를 서버 profile 저장 흐름에 추가하지 않는다", () => {
    const profileRepository = readWorkspaceFile(
      "src/entities/profile/api/profile-repository.ts"
    );
    const profileTypes = readWorkspaceFile(
      "src/entities/profile/api/profile.types.ts"
    );
    const databaseTypes = readWorkspaceFile("src/shared/api/database.types.ts");

    expect(profileRepository).not.toContain("app_language");
    expect(profileRepository).not.toContain("display_language");
    expect(profileTypes).not.toContain("app_language");
    expect(profileTypes).not.toContain("display_language");
    expect(databaseTypes).not.toContain("app_language");
    expect(databaseTypes).not.toContain("display_language");
  });
});
