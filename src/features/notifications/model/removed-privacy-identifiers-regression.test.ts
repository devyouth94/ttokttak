declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readdirSync, readFileSync } = require("node:fs") as {
  readdirSync: (
    path: string,
    options: { encoding: "utf8"; recursive: true }
  ) => string[];
  readFileSync: (path: string, encoding: "utf8") => string;
};
const { join } = require("node:path") as {
  join: (...parts: string[]) => string;
};

const sourceRoot = join(process.cwd(), "src");
const databaseSchemaPath = join(
  process.cwd(),
  "docs",
  "database",
  "DATABASE.sql"
);
const sourceFileExtensions = new Set([".ts", ".tsx"]);
const removedRemotePushSourceIdentifiers = [
  "원격 푸시 토큰 등록",
  "getDevicePushTokenAsync",
  "getExpoPushTokenAsync",
  "device_push_tokens",
  "notification_delivery_jobs",
  "notification_delivery_attempts",
  "notification_inbox_items",
  "push-delivery-worker",
];
const removedRemotePushSchemaIdentifiers = [
  "device_push_tokens",
  "notification_delivery_jobs",
  "notification_delivery_attempts",
  "notification_inbox_items",
  "invoke_push_delivery_worker",
  "upsert_notification_delivery_jobs",
  "cancel_notification_delivery_jobs",
];
const removedStaticWrappingKeyIdentifiers = [
  "appStaticWrappingKey",
  "app-static-v1",
  "dHRva3R0YWstYXBwLXN0YXRpYy13cmFwLWtleS12MSE=",
];

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { encoding: "utf8", recursive: true })
    .filter((path) => {
      const extension = path.slice(path.lastIndexOf("."));

      return sourceFileExtensions.has(extension) && !path.endsWith(".test.ts");
    })
    .map((path) => join(directory, path));
}

describe("제거한 privacy 식별자 회귀 가드", () => {
  it("앱 source에 제거한 원격 푸시 식별자를 다시 두지 않는다", () => {
    const matches = listSourceFiles(sourceRoot).flatMap((filePath) => {
      const content = readFileSync(filePath, "utf8");

      return removedRemotePushSourceIdentifiers
        .filter((identifier) => content.includes(identifier))
        .map(
          (identifier) =>
            `${filePath.replace(`${process.cwd()}/`, "")}: ${identifier}`
        );
    });

    expect(matches).toEqual([]);
  });

  it("기준 DB 문서에 제거한 원격 푸시 식별자를 다시 두지 않는다", () => {
    const content = readFileSync(databaseSchemaPath, "utf8");
    const matches = removedRemotePushSchemaIdentifiers.filter((identifier) =>
      content.includes(identifier)
    );

    expect(matches).toEqual([]);
  });

  it("앱 source에 제거한 정적 wrapping key 식별자를 다시 두지 않는다", () => {
    const matches = listSourceFiles(sourceRoot).flatMap((filePath) => {
      const content = readFileSync(filePath, "utf8");

      return removedStaticWrappingKeyIdentifiers
        .filter((identifier) => content.includes(identifier))
        .map(
          (identifier) =>
            `${filePath.replace(`${process.cwd()}/`, "")}: ${identifier}`
        );
    });

    expect(matches).toEqual([]);
  });
});
