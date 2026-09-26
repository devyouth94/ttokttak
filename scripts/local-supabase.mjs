import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function localBackend() {
  let status;
  try {
    status = JSON.parse(
      execFileSync("supabase", ["status", "-o", "json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      })
    );
  } catch {
    throw new Error("로컬 Supabase를 먼저 실행하세요: pnpm start:local");
  }
  if (status.API_URL !== "http://127.0.0.1:54321") {
    throw new Error("테스트는 127.0.0.1:54321에서만 실행합니다.");
  }
  return {
    url: status.API_URL,
    key: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  };
}

export async function testAccount() {
  const { url, key } = localBackend();
  const email = `test-${randomUUID()}@example.com`;
  // 실제 비밀정보가 아닌 격리된 로컬 계정의 공개 테스트 입력이다.
  const password = "Local-test-only-123!";
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.user || !data.session)
    throw new Error("로컬 테스트 계정을 만들지 못했습니다.");
  return { client, email, password, userId: data.user.id };
}
