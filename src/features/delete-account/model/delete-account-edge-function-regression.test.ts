declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

function readWorkspaceFile(path: string): string {
  return readFileSync(`${process.cwd()}/${path}`, "utf8");
}

describe("delete-account Edge Function regression guard", () => {
  it("계정 삭제 함수는 타입 검사를 비활성화하지 않는다", () => {
    const functionSource = readWorkspaceFile(
      "supabase/functions/delete-account/handler.ts"
    );

    expect(functionSource).not.toContain("@ts-nocheck");
  });
});
