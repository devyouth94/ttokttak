import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { testAccount } from "./local-supabase.mjs";

const mode = process.argv[2];
const children = [];

try {
  if (mode === "start") {
    console.log("로컬 Supabase를 시작합니다.");
    execFileSync("supabase", ["start"], { stdio: ["ignore", "pipe", "pipe"] });
    const secrets = "supabase/functions/.env.local";
    if (!existsSync(secrets)) {
      writeFileSync(
        secrets,
        `TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64=${randomBytes(32).toString("base64")}\n`,
        { mode: 0o600 }
      );
    }
    children.push(
      spawn("supabase", ["functions", "serve", "--env-file", secrets], {
        detached: true,
        stdio: "inherit",
      })
    );
    children.push(
      spawn(
        process.execPath,
        [
          "node_modules/expo/bin/cli",
          "start",
          "--dev-client",
          "--clear",
          "--localhost",
          "--port",
          "8082",
        ],
        {
          detached: true,
          stdio: "inherit",
          env: {
            ...process.env,
            NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --dns-result-order=ipv4first`,
          },
        }
      )
    );
  } else if (mode === "e2e") {
    const metro = await fetch("http://localhost:8082/status");
    if ((await metro.text()) !== "packager-status:running")
      throw new Error("로컬 Metro가 필요합니다.");
    const { email, password } = await testAccount();
    mkdirSync(".maestro-results", { recursive: true });
    const maestro = existsSync(".local-tools/maestro/bin/maestro")
      ? ".local-tools/maestro/bin/maestro"
      : "maestro";
    children.push(
      spawn(
        maestro,
        [
          "--platform",
          "ios",
          "test",
          "--test-output-dir",
          ".maestro-results",
          ".maestro/schedule.yaml",
        ],
        {
          detached: true,
          stdio: "inherit",
          env: {
            ...process.env,
            MAESTRO_EMAIL: email,
            MAESTRO_PASSWORD: password,
            MAESTRO_CLI_NO_ANALYTICS: "true",
          },
        }
      )
    );
  } else {
    throw new Error("start 또는 e2e 모드를 지정하세요.");
  }
  for (const child of children) {
    child.on("error", () => finish(1));
    child.on("exit", (code) => finish(code ?? 1));
  }
  process.on("SIGINT", () => finish(0));
  process.on("SIGTERM", () => finish(0));
} catch {
  console.error(
    "로컬 실행에 실패했습니다. Docker·Supabase·Metro·Maestro 설치 및 실행 상태를 확인하세요."
  );
  finish(1);
}

function finish(code) {
  for (const child of children) {
    if (!child.pid) continue;
    try {
      // CLI가 생성한 하위 프로세스까지 함께 종료한다.
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") code = 1;
    }
  }
  process.exit(code);
}
