declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readdirSync, readFileSync, statSync } = require("fs") as {
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding: "utf8") => string;
  statSync: (path: string) => {
    isDirectory: () => boolean;
  };
};

function joinPath(...parts: string[]): string {
  return parts.join("/");
}

const sourceRoot = joinPath(process.cwd(), "src");
const databaseSchemaPath = joinPath(process.cwd(), "docs", "DATABASE.sql");
const sourceFileExtensions = new Set([".ts", ".tsx"]);
const disallowedActiveFlowTerms = [
  "원격 푸시 토큰 등록",
  "getDevicePushTokenAsync",
  "getExpoPushTokenAsync",
  "device_push_tokens",
  "notification_delivery_jobs",
  "notification_delivery_attempts",
  "notification_inbox_items",
  "push-delivery-worker",
];
const disallowedDatabaseSchemaTerms = [
  "device_push_tokens",
  "notification_delivery_jobs",
  "notification_delivery_attempts",
  "notification_inbox_items",
  "invoke_push_delivery_worker",
  "upsert_notification_delivery_jobs",
  "cancel_notification_delivery_jobs",
];
const disallowedContentKeyTerms = [
  "appStaticWrappingKey",
  "app-static-v1",
  "dHRva3R0YWstYXBwLXN0YXRpYy13cmFwLWtleS12MSE=",
];

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = joinPath(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return listSourceFiles(path);
    }

    const extension = path.slice(path.lastIndexOf("."));

    return sourceFileExtensions.has(extension) && !path.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

describe("notification privacy regression guard", () => {
  it("앱 코드 경로에 원격 푸시 저장소와 토큰 등록 경로가 없다", () => {
    const matches = listSourceFiles(sourceRoot).flatMap((filePath) => {
      const content = readFileSync(filePath, "utf8");

      return disallowedActiveFlowTerms
        .filter((term) => content.includes(term))
        .map((term) => `${filePath.replace(`${process.cwd()}/`, "")}: ${term}`);
    });

    expect(matches).toEqual([]);
  });

  it("기준 DB 문서에 원격 푸시 저장소와 worker RPC가 없다", () => {
    const content = readFileSync(databaseSchemaPath, "utf8");
    const matches = disallowedDatabaseSchemaTerms.filter((term) =>
      content.includes(term)
    );

    expect(matches).toEqual([]);
  });

  it("앱 source에 content key 복구용 정적 wrapping key를 두지 않는다", () => {
    const matches = listSourceFiles(sourceRoot).flatMap((filePath) => {
      const content = readFileSync(filePath, "utf8");

      return disallowedContentKeyTerms
        .filter((term) => content.includes(term))
        .map((term) => `${filePath.replace(`${process.cwd()}/`, "")}: ${term}`);
    });

    expect(matches).toEqual([]);
  });
});
