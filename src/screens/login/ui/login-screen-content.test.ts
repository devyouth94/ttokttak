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

describe("LoginScreenContent i18n", () => {
  it("로그인 전 화면 문구와 외부 링크 실패 안내를 표시 언어에서 읽는다", () => {
    const loginScreenContent = readWorkspaceFile(
      "src/screens/login/ui/login-screen-content.tsx"
    );

    expect(loginScreenContent).toContain("useTranslation()");
    expect(loginScreenContent).toContain('t("app.name")');
    expect(loginScreenContent).toContain('t("login.googleButton")');
    expect(loginScreenContent).toContain('t("login.appleButton")');
    expect(loginScreenContent).toContain('t("login.legalTerms")');
    expect(loginScreenContent).toContain('t("login.legalPrivacy")');
    expect(loginScreenContent).toContain(
      'const legalSuffix = t("login.legalSuffix")'
    );
    expect(loginScreenContent).toContain("legalSuffix ? (");
    expect(loginScreenContent).toContain('t("login.termsOpenErrorTitle")');
    expect(loginScreenContent).toContain('t("login.privacyOpenErrorTitle")');
  });
});
