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

    expect(settingsScreen).toContain("useAppLanguage()");
    expect(settingsScreen).toContain("<AppSelectMenu");
    expect(settingsScreen).toContain('<SettingsSectionCard title="환경">');
    expect(settingsScreen).toContain('title="앱 표시 언어"');
    expect(settingsScreen).toContain('title="시간대"');
    expect(settingsScreen).toContain('label: "한국어"');
    expect(settingsScreen).toContain('label: "English"');
    expect(settingsScreen).toContain("handleChangeAppLanguage(nextLanguage)");
  });

  it("앱 표시 언어 저장 실패 시 실패 안내를 보여준다", () => {
    const settingsScreen = readWorkspaceFile(
      "src/screens/settings/ui/settings-screen.tsx"
    );

    expect(settingsScreen).toContain('"언어 저장 실패"');
    expect(settingsScreen).toContain(
      "앱 표시 언어를 저장할 수 없습니다. 잠시 뒤 다시 시도해 주세요."
    );
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
