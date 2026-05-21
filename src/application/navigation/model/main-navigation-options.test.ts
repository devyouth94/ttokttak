declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};
const { mainTabStackScreenOptions, mainTabsRootScreenOptions } =
  require("./main-navigation-options") as typeof import("./main-navigation-options");

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(`${process.cwd()}/${relativePath}`, "utf8");
}

describe("main navigation options", () => {
  it("메인 탭 컨테이너는 iOS swipe back으로 이전 route로 돌아가지 않는다", () => {
    expect(mainTabsRootScreenOptions).toMatchObject({
      gestureEnabled: false,
    });
  });

  it("루트 layout은 메인 탭 컨테이너에 swipe back 차단 옵션을 적용한다", () => {
    const rootLayout = readWorkspaceFile("app/_layout.tsx");

    expect(rootLayout).toContain(
      '<Stack.Screen name="(tabs)" options={mainTabsRootScreenOptions} />'
    );
  });

  it("각 메인 탭 stack은 루트 화면에서 iOS swipe back을 열지 않는다", () => {
    expect(mainTabStackScreenOptions).toMatchObject({
      animation: "default",
      gestureEnabled: false,
      headerShown: false,
    });
  });

  it("네 개 메인 탭 layout은 공통 stack 옵션을 적용한다", () => {
    const tabLayoutPaths = [
      "app/(tabs)/home/_layout.tsx",
      "app/(tabs)/schedule/_layout.tsx",
      "app/(tabs)/calendar/_layout.tsx",
      "app/(tabs)/settings/_layout.tsx",
    ];

    for (const tabLayoutPath of tabLayoutPaths) {
      expect(readWorkspaceFile(tabLayoutPath)).toContain(
        "<Stack screenOptions={mainTabStackScreenOptions} />"
      );
    }
  });
});
