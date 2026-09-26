import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { localBackend, testAccount } from "../../scripts/local-supabase.mjs";

// 실제 Auth·PostgREST·DB·Edge Function을 통과한다. 운영 환경 주소를 받지 않는다.
test("일정과 규칙 버전을 원자적으로 저장하고 보관한다", async () => {
  const owner = await testAccount();
  await createProfile(owner);

  const itemId = await createItem(owner);
  const created = await readItem(owner, itemId);
  assert.equal(created.title_ciphertext, "integration-ciphertext");
  assert.equal(created.recurring_item_schedule_versions.length, 1);

  assert.equal(
    (
      await owner.client.rpc(
        "update_recurring_item_with_edit_policy",
        updateInput(owner.userId, itemId, {
          p_title_ciphertext: "metadata-updated",
        })
      )
    ).error,
    null
  );
  assert.equal(
    (await readItem(owner, itemId)).recurring_item_schedule_versions.length,
    1
  );

  assert.equal(
    (
      await owner.client.rpc(
        "update_recurring_item_with_edit_policy",
        updateInput(owner.userId, itemId, {
          p_effective_from_utc: "2026-04-11T15:00:00Z",
          p_has_rule_changes: true,
          p_interval_value: 2,
          p_recurrence_type: "interval_days",
        })
      )
    ).error,
    null
  );
  const ruleUpdated = await readItem(owner, itemId);
  assert.equal(ruleUpdated.recurring_item_schedule_versions.length, 2);

  const itemCountBeforeFailedCreate = await countOwnRows(
    owner,
    "recurring_items"
  );
  const failedCreate = await owner.client.rpc(
    "create_recurring_item_with_initial_version",
    createInput(owner.userId, {
      p_anchor_type: "completion_based",
      p_recurrence_type: "weekly",
      p_weekday_mask: [5],
    })
  );
  assert.equal(failedCreate.error?.code, "23514");
  assert.equal(
    await countOwnRows(owner, "recurring_items"),
    itemCountBeforeFailedCreate
  );

  const failedUpdate = await owner.client.rpc(
    "update_recurring_item_with_edit_policy",
    updateInput(owner.userId, itemId, {
      p_anchor_type: "completion_based",
      p_has_rule_changes: true,
      p_recurrence_type: "weekly",
      p_title_ciphertext: "must-rollback",
      p_weekday_mask: [5],
    })
  );
  assert.equal(failedUpdate.error?.code, "23514");
  const afterFailedUpdate = await readItem(owner, itemId);
  assert.equal(afterFailedUpdate.title_ciphertext, "metadata-updated");
  assert.equal(afterFailedUpdate.recurring_item_schedule_versions.length, 2);

  const log = completionLog(owner.userId, itemId, "2026-04-10T00:00:00Z");
  assert.equal((await upsertLogs(owner.client, [log])).error, null);
  assert.equal(
    (await owner.client.rpc("archive_recurring_item", { p_item_id: itemId }))
      .error,
    null
  );
  const activeItems = await owner.client
    .from("recurring_items")
    .select("id")
    .eq("is_archived", false);
  assert.equal(activeItems.error, null);
  assert.deepEqual(activeItems.data, []);
  assert.equal(await countOwnRows(owner, "completion_logs"), 1);

  const revive = await owner.client.rpc(
    "update_recurring_item_with_edit_policy",
    updateInput(owner.userId, itemId, {
      p_is_archived: false,
      p_title_ciphertext: "must-not-revive",
    })
  );
  assert.ok(revive.error);
  const archived = await owner.client
    .from("recurring_items")
    .select("is_archived, title_ciphertext")
    .eq("id", itemId)
    .single();
  assert.deepEqual(archived.data, {
    is_archived: true,
    title_ciphertext: "metadata-updated",
  });
});

test("처리 기록 upsert는 중복과 경합을 멱등 처리하고 요청을 원자적으로 저장한다", async () => {
  const owner = await testAccount();
  await createProfile(owner);
  const itemId = await createItem(owner);
  const firstTime = "2026-04-10T00:00:00Z";
  const first = completionLog(owner.userId, itemId, firstTime, "completed");

  assert.equal((await upsertLogs(owner.client, [first])).error, null);
  assert.equal(
    (
      await upsertLogs(owner.client, [
        completionLog(owner.userId, itemId, firstTime, "skipped"),
      ])
    ).error,
    null
  );
  assert.equal((await readLog(owner, itemId, firstTime)).action, "completed");

  const racedTime = "2026-04-11T00:00:00Z";
  const raced = await Promise.all([
    upsertLogs(owner.client, [
      completionLog(owner.userId, itemId, racedTime, "completed"),
    ]),
    upsertLogs(owner.client, [
      completionLog(owner.userId, itemId, racedTime, "skipped"),
    ]),
  ]);
  assert.deepEqual(
    raced.map(({ error }) => error),
    [null, null]
  );
  const winner = await readLog(owner, itemId, racedTime);
  const losingAction = winner.action === "completed" ? "skipped" : "completed";
  assert.equal(
    (
      await upsertLogs(owner.client, [
        completionLog(owner.userId, itemId, racedTime, losingAction),
      ])
    ).error,
    null
  );
  assert.equal((await readLog(owner, itemId, racedTime)).action, winner.action);

  const atomicTime = "2026-04-12T00:00:00Z";
  const atomicFailure = await upsertLogs(owner.client, [
    completionLog(owner.userId, itemId, atomicTime, "completed"),
    completionLog(
      owner.userId,
      itemId,
      "2026-04-13T00:00:00Z",
      "invalid-action"
    ),
  ]);
  assert.equal(atomicFailure.error?.code, "23514");
  const rolledBack = await owner.client
    .from("completion_logs")
    .select("id")
    .eq("item_id", itemId)
    .eq("scheduled_at_utc", atomicTime);
  assert.equal(rolledBack.error, null);
  assert.deepEqual(rolledBack.data, []);
});

test("사용자 데이터와 content key를 계정 사이에서 격리한다", async () => {
  const { url, key } = localBackend();
  const anonymous = createClient(url, key, { auth: { persistSession: false } });
  const owner = await testAccount();
  const other = await testAccount();
  await createProfile(owner, "owner");
  await createProfile(other, "other");
  const itemId = await createItem(owner);
  assert.equal(
    (
      await upsertLogs(owner.client, [
        completionLog(owner.userId, itemId, "2026-04-10T00:00:00Z"),
      ])
    ).error,
    null
  );

  const encodedKey = Buffer.alloc(32, 7).toString("base64");
  const wrapped = await owner.client.functions.invoke("recover-content-key", {
    body: { action: "wrap", encodedKey, keyVersion: 1 },
  });
  assert.equal(wrapped.error, null);

  for (const [table, column, value] of [
    ["profiles", "id", owner.userId],
    ["recurring_items", "id", itemId],
    ["recurring_item_schedule_versions", "item_id", itemId],
    ["completion_logs", "item_id", itemId],
    ["user_content_encryption_keys", "user_id", owner.userId],
  ]) {
    const hidden = await other.client.from(table).select("*").eq(column, value);
    assert.equal(hidden.error, null);
    assert.deepEqual(hidden.data, []);
  }

  const forgedCreate = await other.client.rpc(
    "create_recurring_item_with_initial_version",
    createInput(owner.userId)
  );
  assert.equal(forgedCreate.error?.code, "42501");

  const hiddenProfileUpdate = await other.client
    .from("profiles")
    .update({ display_name: "stolen" })
    .eq("id", owner.userId)
    .select("id");
  assert.equal(hiddenProfileUpdate.error, null);
  assert.deepEqual(hiddenProfileUpdate.data, []);
  const ownerProfile = await owner.client
    .from("profiles")
    .select("display_name")
    .eq("id", owner.userId)
    .single();
  assert.equal(ownerProfile.data.display_name, "owner");

  const hiddenUpdate = await other.client
    .from("recurring_items")
    .update({ title_ciphertext: "stolen" })
    .eq("id", itemId)
    .select("id");
  assert.equal(hiddenUpdate.error, null);
  assert.deepEqual(hiddenUpdate.data, []);
  assert.equal(
    (await readItem(owner, itemId)).title_ciphertext,
    "integration-ciphertext"
  );

  const hiddenVersionUpdate = await other.client
    .from("recurring_item_schedule_versions")
    .update({ reminder_time_local: "10:00" })
    .eq("item_id", itemId)
    .select("id");
  assert.equal(hiddenVersionUpdate.error, null);
  assert.deepEqual(hiddenVersionUpdate.data, []);

  const hiddenLogUpdate = await other.client
    .from("completion_logs")
    .update({ action: "skipped" })
    .eq("item_id", itemId)
    .select("id");
  assert.equal(hiddenLogUpdate.error, null);
  assert.deepEqual(hiddenLogUpdate.data, []);
  assert.equal(
    (await readLog(owner, itemId, "2026-04-10T00:00:00Z")).action,
    "completed"
  );

  const crossOwnerLog = await other.client.from("completion_logs").insert({
    action: "completed",
    item_id: itemId,
    scheduled_at_utc: "2026-04-11T00:00:00Z",
    user_id: other.userId,
  });
  assert.equal(crossOwnerLog.error?.code, "42501");

  const keyRow = {
    key_version: 1,
    user_id: owner.userId,
    wrap_algorithm: wrapped.data.wrapAlgorithm,
    wrap_metadata: wrapped.data.wrapMetadata,
    wrapped_key: wrapped.data.wrappedKey,
  };
  const hiddenKeyUpdate = await other.client
    .from("user_content_encryption_keys")
    .update({ wrapped_key: "stolen" })
    .eq("user_id", owner.userId)
    .select("user_id");
  assert.equal(hiddenKeyUpdate.error, null);
  assert.deepEqual(hiddenKeyUpdate.data, []);
  const ownerKey = await owner.client
    .from("user_content_encryption_keys")
    .select("wrapped_key")
    .eq("user_id", owner.userId)
    .single();
  assert.equal(ownerKey.data.wrapped_key, keyRow.wrapped_key);

  assert.equal(
    (await owner.client.from("user_content_encryption_keys").upsert(keyRow))
      .error,
    null
  );
  assert.equal(
    (
      await owner.client
        .from("user_content_encryption_keys")
        .update({ wrapped_key: "tampered" })
        .eq("user_id", owner.userId)
    ).error?.code,
    "42501"
  );
  assert.equal(
    (
      await other.client.from("user_content_encryption_keys").insert({
        ...keyRow,
        user_id: other.userId,
      })
    ).error?.code,
    "42501"
  );

  const otherRecovery = await other.client.functions.invoke(
    "recover-content-key",
    { body: { action: "recover", keyVersion: 1 } }
  );
  assert.equal(otherRecovery.error, null);
  assert.equal(otherRecovery.data.encodedKey, null);

  for (const client of [anonymous, owner.client, other.client]) {
    assert.equal(
      (await client.from("content_key_recovery_audit_events").select("id"))
        .error?.code,
      "42501"
    );
  }
});

test("계정 삭제는 해당 사용자의 Auth와 연결 데이터를 cascade 삭제한다", async () => {
  const owner = await testAccount();
  const other = await testAccount();
  await createProfile(owner);
  await createProfile(other);

  for (const account of [owner, other]) {
    const itemId = await createItem(account);
    assert.equal(
      (
        await upsertLogs(account.client, [
          completionLog(account.userId, itemId, "2026-04-10T00:00:00Z"),
        ])
      ).error,
      null
    );
    assert.equal(
      (
        await account.client.functions.invoke("recover-content-key", {
          body: {
            action: "wrap",
            encodedKey: Buffer.alloc(32, 9).toString("base64"),
            keyVersion: 1,
          },
        })
      ).error,
      null
    );
  }

  const beforeOwner = localUserCounts(owner.userId);
  const beforeOther = localUserCounts(other.userId);
  assert.ok(Object.values(beforeOwner).every((count) => count > 0));
  assert.ok(Object.values(beforeOther).every((count) => count > 0));

  const removed = await owner.client.functions.invoke("delete-account", {
    body: { confirm: true },
  });
  assert.equal(removed.error, null);
  assert.deepEqual(localUserCounts(owner.userId), zeroUserCounts());
  assert.ok(
    Object.values(localUserCounts(other.userId)).every((count) => count > 0)
  );
});

function createInput(userId, overrides = {}) {
  return {
    p_anchor_type: "fixed",
    p_color_hex: "#123456",
    p_content_encryption_metadata: {},
    p_content_key_version: 1,
    p_description_ciphertext: null,
    p_effective_from_utc: "2026-04-09T15:00:00Z",
    p_interval_value: null,
    p_is_archived: false,
    p_notifications_enabled: false,
    p_recurrence_type: "daily",
    p_reminder_time_local: "09:00",
    p_seed_start_date_local: "2026-04-10",
    p_start_date_local: "2026-04-10",
    p_title_ciphertext: "integration-ciphertext",
    p_user_id: userId,
    p_weekday_mask: null,
    ...overrides,
  };
}

function updateInput(userId, itemId, overrides = {}) {
  return {
    p_anchor_type: "fixed",
    p_content_encryption_metadata: {},
    p_content_key_version: 1,
    p_description_ciphertext: null,
    p_effective_from_utc: "2026-04-11T15:00:00Z",
    p_has_rule_changes: false,
    p_interval_value: null,
    p_is_archived: false,
    p_item_id: itemId,
    p_notifications_enabled: false,
    p_recurrence_type: "daily",
    p_reminder_time_local: "09:00",
    p_seed_start_date_local: "2026-04-10",
    p_title_ciphertext: "metadata-updated",
    p_user_id: userId,
    p_weekday_mask: null,
    ...overrides,
  };
}

async function createProfile(account, displayName = null) {
  const { error } = await account.client.from("profiles").insert({
    display_name: displayName,
    id: account.userId,
    timezone: "Asia/Seoul",
  });
  assert.equal(error, null);
}

async function createItem(account) {
  const { data, error } = await account.client.rpc(
    "create_recurring_item_with_initial_version",
    createInput(account.userId)
  );
  assert.equal(error, null);
  assert.equal(typeof data, "string");
  return data;
}

async function readItem(account, itemId) {
  const { data, error } = await account.client
    .from("recurring_items")
    .select(
      "title_ciphertext, is_archived, recurring_item_schedule_versions(*)"
    )
    .eq("id", itemId)
    .single();
  assert.equal(error, null);
  return data;
}

async function countOwnRows(account, table) {
  const { count, error } = await account.client
    .from(table)
    .select("*", { count: "exact", head: true });
  assert.equal(error, null);
  return count;
}

function completionLog(userId, itemId, scheduledAtUtc, action = "completed") {
  return {
    action,
    item_id: itemId,
    scheduled_at_utc: scheduledAtUtc,
    user_id: userId,
  };
}

function upsertLogs(client, rows) {
  return client.from("completion_logs").upsert(rows, {
    ignoreDuplicates: true,
    onConflict: "item_id,scheduled_at_utc",
  });
}

async function readLog(account, itemId, scheduledAtUtc) {
  const { data, error } = await account.client
    .from("completion_logs")
    .select("action")
    .eq("item_id", itemId)
    .eq("scheduled_at_utc", scheduledAtUtc);
  assert.equal(error, null);
  assert.equal(data.length, 1);
  return data[0];
}

function localUserCounts(userId) {
  localBackend();
  assert.match(userId, /^[0-9a-f-]{36}$/);
  const output = execFileSync(
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
      `select json_build_object(
        'authUsers', (select count(*) from auth.users where id = '${userId}'),
        'profiles', (select count(*) from public.profiles where id = '${userId}'),
        'items', (select count(*) from public.recurring_items where user_id = '${userId}'),
        'versions', (select count(*) from public.recurring_item_schedule_versions where user_id = '${userId}'),
        'logs', (select count(*) from public.completion_logs where user_id = '${userId}'),
        'keys', (select count(*) from public.user_content_encryption_keys where user_id = '${userId}'),
        'audits', (select count(*) from public.content_key_recovery_audit_events where user_id = '${userId}')
      )`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return JSON.parse(output.trim());
}

function zeroUserCounts() {
  return {
    audits: 0,
    authUsers: 0,
    items: 0,
    keys: 0,
    logs: 0,
    profiles: 0,
    versions: 0,
  };
}
