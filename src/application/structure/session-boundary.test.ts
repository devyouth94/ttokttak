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

describe("session boundary", () => {
  it("로그인 화면 구현은 login screen slice에 둔다", () => {
    const publicApi = readFileSync(
      getWorkspacePath("src/screens/login/index.ts"),
      "utf8"
    );

    expect(existsSync(getWorkspacePath("src/screens/login"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/screens/login/ui"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/features/session"))).toBe(false);
    expect(publicApi).toContain("LoginScreen");
  });

  it("로그인과 계정 삭제는 사용자 동작 feature로 분리한다", () => {
    const signInPublicApi = readFileSync(
      getWorkspacePath("src/features/sign-in/index.ts"),
      "utf8"
    );
    const deleteAccountPublicApi = readFileSync(
      getWorkspacePath("src/features/delete-account/index.ts"),
      "utf8"
    );

    expect(existsSync(getWorkspacePath("src/features/sign-in"))).toBe(true);
    expect(signInPublicApi).toContain("signInWithApple");
    expect(signInPublicApi).toContain("signInWithGoogle");
    expect(signInPublicApi).toContain("isAppleSignInAvailable");
    expect(existsSync(getWorkspacePath("src/features/delete-account"))).toBe(
      true
    );
    expect(deleteAccountPublicApi).toContain("deleteAccount");
  });

  it("session provider와 profile 복원은 application/entity 경계에 둔다", () => {
    const appProviders = readFileSync(
      getWorkspacePath("src/application/providers/app-providers.tsx"),
      "utf8"
    );
    const sessionPublicApi = readFileSync(
      getWorkspacePath("src/application/session/index.ts"),
      "utf8"
    );
    const profilePublicApi = readFileSync(
      getWorkspacePath("src/entities/profile/index.ts"),
      "utf8"
    );
    const scheduleReadPublicApi = readFileSync(
      getWorkspacePath("src/application/schedule-read/index.ts"),
      "utf8"
    );

    expect(existsSync(getWorkspacePath("src/application/session"))).toBe(true);
    expect(existsSync(getWorkspacePath("src/application/schedule-read"))).toBe(
      true
    );
    expect(appProviders).toContain("~/application/session");
    expect(appProviders).not.toContain("~/features/session");
    expect(sessionPublicApi).toContain("SessionProvider");
    expect(sessionPublicApi).toContain("useSession");
    expect(sessionPublicApi).not.toContain("useScheduleReadContext");
    expect(scheduleReadPublicApi).toContain("useScheduleReadContext");
    expect(existsSync(getWorkspacePath("src/entities/profile"))).toBe(true);
    expect(profilePublicApi).toContain("ensureProfile");
    expect(profilePublicApi).toContain("updateProfileDisplayName");
  });

  it("외부 코드는 login screen과 auth feature의 public API만 import한다", () => {
    const loginExternalFiles = listSourceFiles("src").filter(
      (file) => !file.startsWith("src/screens/login/")
    );
    const signInExternalFiles = listSourceFiles("src").filter(
      (file) => !file.startsWith("src/features/sign-in/")
    );
    const deleteAccountExternalFiles = listSourceFiles("src").filter(
      (file) => !file.startsWith("src/features/delete-account/")
    );

    for (const file of loginExternalFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toMatch(/screens\/login\/(model|ui)\//);
    }

    for (const file of signInExternalFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toMatch(/features\/sign-in\/(api|lib|model|ui)\//);
    }

    for (const file of deleteAccountExternalFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toMatch(
        /features\/delete-account\/(api|lib|model|ui)\//
      );
    }
  });

  it("feature layer는 application layer를 직접 참조하지 않는다", () => {
    const featureFiles = listSourceFiles("src/features");

    for (const file of featureFiles) {
      const source = readFileSync(getWorkspacePath(file), "utf8");

      expect(source).not.toContain("~/application/");
    }
  });
});
