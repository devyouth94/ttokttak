import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { localBackend, testAccount } from "../../scripts/local-supabase.mjs";

// 실제 Auth·PostgREST·DB를 통과한다. 운영 환경 주소를 받지 않는다.
test("일정의 소유권·규칙 제약·원자적 저장·보관 정책을 실제 DB에서 지킨다", async () => {
  const owner = await testAccount();
  const other = await testAccount();
  const { client, userId } = owner;
  assert.equal(
    (
      await client
        .from("profiles")
        .insert({ id: userId, timezone: "Asia/Seoul" })
    ).error,
    null
  );
  assert.equal(
    (
      await other.client
        .from("profiles")
        .insert({ id: other.userId, timezone: "Asia/Seoul" })
    ).error,
    null
  );
  const input = {
    p_user_id: userId,
    p_title_ciphertext: "integration-ciphertext",
    p_description_ciphertext: null,
    p_content_key_version: 1,
    p_content_encryption_metadata: {},
    p_start_date_local: "2026-04-10",
    p_is_archived: false,
    p_effective_from_utc: "2026-04-09T15:00:00Z",
    p_recurrence_type: "daily",
    p_interval_value: null,
    p_weekday_mask: null,
    p_reminder_time_local: "09:00",
    p_anchor_type: "fixed",
    p_seed_start_date_local: "2026-04-10",
    p_notifications_enabled: false,
    p_color_hex: "#123456",
  };
  const created = await client.rpc(
    "create_recurring_item_with_initial_version",
    input
  );
  assert.equal(created.error, null);
  assert.equal(typeof created.data, "string");
  const itemId = created.data;
  const saved = await client
    .from("recurring_items")
    .select("id, color_hex, recurring_item_schedule_versions(id)")
    .eq("id", itemId)
    .single();
  assert.equal(saved.error, null);
  assert.equal(saved.data.color_hex, "#123456");
  assert.equal(saved.data.recurring_item_schedule_versions.length, 1);

  for (const table of ["recurring_items", "recurring_item_schedule_versions"]) {
    const hidden = await other.client.from(table).select("id");
    assert.equal(hidden.error, null);
    assert.deepEqual(hidden.data, []);
  }
  const forged = await other.client.rpc(
    "create_recurring_item_with_initial_version",
    input
  );
  assert.equal(forged.error?.code, "42501");
  assert.ok(
    (await other.client.rpc("archive_recurring_item", { p_item_id: itemId }))
      .error
  );

  const invalid = await client.rpc(
    "create_recurring_item_with_initial_version",
    {
      ...input,
      p_anchor_type: "completion_based",
      p_recurrence_type: "weekly",
      p_weekday_mask: [5],
    }
  );
  assert.equal(invalid.error?.code, "23514");
  // 2단계의 규칙 저장 실패가 앞서 생성한 일정도 롤백해야 한다.
  const remaining = await client.from("recurring_items").select("id");
  assert.equal(remaining.error, null);
  assert.deepEqual(remaining.data, [{ id: itemId }]);

  const log = {
    user_id: userId,
    item_id: itemId,
    scheduled_at_utc: "2026-04-10T00:00:00Z",
    action: "completed",
  };
  assert.equal((await client.from("completion_logs").insert(log)).error, null);
  const batch = await client
    .from("completion_logs")
    .insert([{ ...log, scheduled_at_utc: "2026-04-11T00:00:00Z" }, log]);
  assert.equal(batch.error?.code, "23505");
  const logs = await client.from("completion_logs").select("action");
  assert.equal(logs.error, null);
  assert.deepEqual(logs.data, [{ action: "completed" }]);
  assert.equal(
    (
      await other.client
        .from("completion_logs")
        .insert({ ...log, user_id: other.userId })
    ).error?.code,
    "42501"
  );
  const hiddenLogs = await other.client.from("completion_logs").select("id");
  assert.equal(hiddenLogs.error, null);
  assert.deepEqual(hiddenLogs.data, []);

  assert.equal(
    (await client.rpc("archive_recurring_item", { p_item_id: itemId })).error,
    null
  );
  const update = await client.rpc("update_recurring_item_with_edit_policy", {
    p_item_id: itemId,
    p_user_id: userId,
    p_title_ciphertext: "changed",
    p_description_ciphertext: null,
    p_content_key_version: 1,
    p_content_encryption_metadata: {},
    p_is_archived: false,
    p_has_rule_changes: false,
  });
  assert.ok(update.error);
  const archived = await client
    .from("recurring_items")
    .select("is_archived, title_ciphertext")
    .eq("id", itemId)
    .single();
  assert.equal(archived.error, null);
  assert.deepEqual(archived.data, {
    is_archived: true,
    title_ciphertext: "integration-ciphertext",
  });
});

test("content key의 접근 제어와 계정 삭제 시 감사 기록 정리를 실제 DB에서 지킨다", async () => {
  const { url, key } = localBackend();
  const anonymous = createClient(url, key, { auth: { persistSession: false } });
  const denied = await anonymous.functions.invoke("recover-content-key", {
    body: { action: "recover", keyVersion: 1 },
  });
  assert.equal(denied.error?.context.status, 401);

  const owner = await testAccount();
  const other = await testAccount();
  assert.equal(
    (await owner.client.from("profiles").insert({ id: owner.userId })).error,
    null
  );
  assert.equal(
    (await other.client.from("profiles").insert({ id: other.userId })).error,
    null
  );
  // 비밀정보가 아닌 고정된 테스트 입력이다.
  const encodedKey = Buffer.alloc(32, 7).toString("base64");
  const wrapped = await owner.client.functions.invoke("recover-content-key", {
    body: { action: "wrap", keyVersion: 1, encodedKey },
  });
  assert.equal(wrapped.error, null);
  const recovered = await owner.client.functions.invoke("recover-content-key", {
    body: { action: "recover", keyVersion: 1 },
  });
  assert.equal(recovered.error, null);
  assert.equal(recovered.data.encodedKey, encodedKey);
  const absent = await other.client.functions.invoke("recover-content-key", {
    body: { action: "recover", keyVersion: 1 },
  });
  assert.equal(absent.error, null);
  assert.equal(absent.data.encodedKey, null);

  const keyRow = {
    user_id: owner.userId,
    key_version: 1,
    wrap_algorithm: wrapped.data.wrapAlgorithm,
    wrap_metadata: wrapped.data.wrapMetadata,
    wrapped_key: wrapped.data.wrappedKey,
  };
  // 구버전의 동일 값 저장은 허용하되 새 키 생성·변조·타인 키 복사는 막는다.
  const keys = owner.client.from("user_content_encryption_keys");
  assert.equal((await keys.upsert(keyRow)).error, null);
  assert.equal(
    (await keys.insert({ ...keyRow, key_version: 2 })).error?.code,
    "42501"
  );
  assert.equal(
    (await keys.update({ wrapped_key: "tampered" }).eq("user_id", owner.userId))
      .error?.code,
    "42501"
  );
  assert.equal(
    (
      await other.client
        .from("user_content_encryption_keys")
        .insert({ ...keyRow, user_id: other.userId })
    ).error?.code,
    "42501"
  );
  const hiddenKeys = await other.client
    .from("user_content_encryption_keys")
    .select("user_id");
  assert.equal(hiddenKeys.error, null);
  assert.deepEqual(hiddenKeys.data, []);
  for (const client of [anonymous, owner.client, other.client]) {
    assert.equal(
      (await client.from("content_key_recovery_audit_events").select("id"))
        .error?.code,
      "42501"
    );
  }

  assert.ok(localAuditCount(owner.userId) > 0);
  assert.ok(localAuditCount(other.userId) > 0);
  const removed = await owner.client.functions.invoke("delete-account", {
    body: { confirm: true },
  });
  assert.equal(removed.error, null);
  assert.equal(localAuditCount(owner.userId), 0);
  assert.ok(localAuditCount(other.userId) > 0);
});

function localAuditCount(userId) {
  localBackend();
  assert.match(userId, /^[0-9a-f-]{36}$/);
  // 감사 테이블은 앱에서 읽을 수 없어 로컬 컨테이너에서 존재 여부만 확인한다.
  return Number(
    execFileSync(
      "docker",
      [
        "exec",
        "supabase_db_ttokttak",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-At",
        "-c",
        `select count(*) from public.content_key_recovery_audit_events where user_id = '${userId}'`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).trim()
  );
}
