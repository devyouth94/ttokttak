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

describe("AppI18nProvider bootstrap 실패 containment", () => {
  it("표시 언어 초기화 실패 시 빈 화면 대신 i18n 비의존 재시도 화면을 보여준다", () => {
    const provider = readWorkspaceFile("src/shared/i18n/i18n-provider.tsx");

    expect(provider).toContain('type AppI18nProviderStatus = "failed"');
    expect(provider).toContain('if (status === "failed")');
    expect(provider).toContain("<AppRetryStateView");
    expect(provider).toContain('title="앱을 시작하지 못했어요"');
    expect(provider).toContain("onRetry={initializeAppI18n}");
    expect(provider).toContain(
      'retryAccessibilityHint="표시 언어 초기화를 다시 시도합니다."'
    );
  });
});
