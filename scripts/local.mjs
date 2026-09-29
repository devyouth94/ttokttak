import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { addDays } from "date-fns";
import { enUS } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { testAccount } from "./local-supabase.mjs";

const APP_ID = "com.youngzin.ttokttak";
const E2E_SIMULATOR_NAME = "Ttokttak E2E";
const SEOUL_TIME_ZONE = "Asia/Seoul";
const mode = process.argv[2];
const children = [];

process.on("SIGINT", () => finish(0));
process.on("SIGTERM", () => finish(0));

try {
  if (mode === "start") {
    startLocalBackend();
    for (const child of children) {
      child.on("error", () => finish(1));
      child.on("exit", (code) => finish(code ?? 1));
    }
  } else if (mode === "e2e") {
    await runE2e();
    finish(0);
  } else {
    throw new Error("start 또는 e2e 모드를 지정하세요.");
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "로컬 실행에 실패했습니다. 실행 환경을 확인하세요."
  );
  finish(1);
}

function startLocalBackend() {
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
}

async function runE2e() {
  const metro = await fetch("http://localhost:8081/status");
  if ((await metro.text()) !== "packager-status:running") {
    throw new Error("로컬 Metro가 필요합니다.");
  }

  const simulator = findDedicatedSimulator();
  bootSimulator(simulator);
  configureSimulator(simulator.udid);
  ensureAppInstalled(simulator.udid);
  execFileSync("xcrun", [
    "simctl",
    "spawn",
    simulator.udid,
    "defaults",
    "write",
    APP_ID,
    "EXDevMenuShowFloatingActionButton",
    "-bool",
    "false",
  ]);

  const [lifecycleAccount, isolationAccountA, isolationAccountB] =
    await Promise.all([
      createProfiledAccount(),
      createProfiledAccount(),
      createProfiledAccount(),
    ]);
  const maestro = existsSync(".local-tools/maestro/bin/maestro")
    ? ".local-tools/maestro/bin/maestro"
    : "maestro";
  const fixtureNow = new Date();
  const fixtureDate = formatInTimeZone(
    fixtureNow,
    SEOUL_TIME_ZONE,
    "yyyy-MM-dd"
  );
  const nextDate = addDays(fixtureNow, 3);
  const nextDatePattern = [
    formatInTimeZone(nextDate, SEOUL_TIME_ZONE, "M월 d일"),
    formatInTimeZone(nextDate, SEOUL_TIME_ZONE, "MMM d", { locale: enUS }),
  ].join("|");

  mkdirSync(".maestro-results", { recursive: true });
  try {
    await runMaestro(maestro, simulator.udid, "e1-lifecycle", {
      MAESTRO_E1_NEXT_DATE: nextDatePattern,
      MAESTRO_EMAIL: lifecycleAccount.email,
      MAESTRO_PASSWORD: lifecycleAccount.password,
    });
  } finally {
    ensureFixtureDate(fixtureDate);
  }
  await runMaestro(maestro, simulator.udid, "e2-create", {
    MAESTRO_EMAIL: isolationAccountA.email,
    MAESTRO_PASSWORD: isolationAccountA.password,
  });

  const { data: privateItem, error: itemError } = await isolationAccountA.client
    .from("recurring_items")
    .select("id")
    .single();
  if (itemError || !privateItem) {
    throw new Error("E2 계정 A의 일정을 확인하지 못했습니다.");
  }

  await runMaestro(maestro, simulator.udid, "e2-isolation", {
    MAESTRO_E2_A_ITEM_ID: privateItem.id,
    MAESTRO_EMAIL: isolationAccountB.email,
    MAESTRO_PASSWORD: isolationAccountB.password,
  });
  await runMaestro(maestro, simulator.udid, "e2-recovery", {
    MAESTRO_EMAIL: isolationAccountA.email,
    MAESTRO_PASSWORD: isolationAccountA.password,
  });
}

async function createProfiledAccount() {
  const account = await testAccount();
  const { error } = await account.client.from("profiles").insert({
    display_name: null,
    id: account.userId,
    timezone: SEOUL_TIME_ZONE,
  });
  if (error) throw new Error("로컬 테스트 프로필을 만들지 못했습니다.");
  return account;
}

function findDedicatedSimulator() {
  const output = execFileSync(
    "xcrun",
    ["simctl", "list", "devices", "available", "--json"],
    { encoding: "utf8" }
  );
  const requestedUdid = process.env.TTOKTTAK_E2E_SIMULATOR_UDID;
  const simulators = Object.values(JSON.parse(output).devices).flat();
  const simulator = simulators.find((candidate) =>
    requestedUdid
      ? candidate.udid === requestedUdid
      : candidate.name === E2E_SIMULATOR_NAME
  );

  if (!simulator || simulator.name !== E2E_SIMULATOR_NAME) {
    throw new Error(
      `키체인을 지워도 안전한 전용 '${E2E_SIMULATOR_NAME}' 시뮬레이터가 필요합니다.`
    );
  }
  return simulator;
}

function bootSimulator(simulator) {
  if (simulator.state !== "Booted") {
    execFileSync("xcrun", ["simctl", "boot", simulator.udid]);
    execFileSync("xcrun", ["simctl", "bootstatus", simulator.udid, "-b"], {
      stdio: "inherit",
    });
  }
}

function configureSimulator(udid) {
  execFileSync("xcrun", [
    "simctl",
    "spawn",
    udid,
    "defaults",
    "write",
    "NSGlobalDomain",
    "AppleICUTimeZone",
    "-string",
    SEOUL_TIME_ZONE,
  ]);
  const timezone = execFileSync(
    "xcrun",
    [
      "simctl",
      "spawn",
      udid,
      "defaults",
      "read",
      "NSGlobalDomain",
      "AppleICUTimeZone",
    ],
    { encoding: "utf8" }
  ).trim();
  if (timezone !== SEOUL_TIME_ZONE) {
    throw new Error(
      "E2E 시뮬레이터 시간대를 Asia/Seoul로 설정하지 못했습니다."
    );
  }
}

function ensureFixtureDate(expectedDate) {
  const currentDate = formatInTimeZone(
    new Date(),
    SEOUL_TIME_ZONE,
    "yyyy-MM-dd"
  );
  if (currentDate !== expectedDate) {
    throw new Error(
      `E1 실행 중 날짜가 ${expectedDate}에서 ${currentDate}(으)로 변경됐습니다. 다시 실행하세요.`
    );
  }
}

function ensureAppInstalled(udid) {
  try {
    execFileSync(
      "xcrun",
      ["simctl", "get_app_container", udid, APP_ID, "app"],
      { stdio: "ignore" }
    );
  } catch {
    throw new Error(`'${E2E_SIMULATOR_NAME}'에 개발 앱을 먼저 설치해 주세요.`);
  }
}

function runMaestro(maestro, udid, flow, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      maestro,
      [
        "--platform",
        "ios",
        "--device",
        udid,
        "test",
        "--test-output-dir",
        `.maestro-results/${flow}`,
        `.maestro/${flow}.yaml`,
      ],
      {
        detached: true,
        stdio: "inherit",
        env: {
          ...process.env,
          ...environment,
          MAESTRO_CLI_NO_ANALYTICS: "true",
        },
      }
    );
    children.push(child);
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${flow} Maestro 테스트가 실패했습니다.`));
    });
  });
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
