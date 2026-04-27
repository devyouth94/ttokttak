create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_push_delivery_worker()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anon_key text;
  v_request_id bigint;
  v_worker_secret text;
begin
  select decrypted_secret
  into v_anon_key
  from vault.decrypted_secrets
  where name = 'push_delivery_worker_anon_key'
  order by updated_at desc
  limit 1;

  select decrypted_secret
  into v_worker_secret
  from vault.decrypted_secrets
  where name = 'push_delivery_worker_secret'
  order by updated_at desc
  limit 1;

  if coalesce(v_anon_key, '') = '' then
    raise exception 'vault push_delivery_worker_anon_key secret이 필요합니다.';
  end if;

  if coalesce(v_worker_secret, '') = '' then
    raise exception 'vault push_delivery_worker_secret secret이 필요합니다.';
  end if;

  select net.http_post(
    url := 'https://afsulksejxywonxulary.supabase.co/functions/v1/push-delivery-worker',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'Authorization',
      'Bearer ' || v_anon_key,
      'x-push-delivery-worker-secret',
      v_worker_secret
    ),
    body := jsonb_build_object(
      'trigger',
      'pg_cron',
      'invoked_at',
      now()
    ),
    timeout_milliseconds := 60000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

drop policy if exists "notification_delivery_jobs_insert_own" on public.notification_delivery_jobs;
drop policy if exists "notification_delivery_jobs_update_own" on public.notification_delivery_jobs;
drop policy if exists "notification_delivery_jobs_delete_own" on public.notification_delivery_jobs;
drop policy if exists "notification_delivery_attempts_insert_own" on public.notification_delivery_attempts;
drop policy if exists "notification_delivery_attempts_update_own" on public.notification_delivery_attempts;
drop policy if exists "notification_delivery_attempts_delete_own" on public.notification_delivery_attempts;

revoke insert, update, delete on public.notification_delivery_jobs from anon, authenticated;
revoke insert, update, delete on public.notification_delivery_attempts from anon, authenticated;
revoke insert, update, delete on public.notification_inbox_items from anon, authenticated;
grant update (read_at, hidden_at) on public.notification_inbox_items to authenticated;

create or replace function public.upsert_notification_delivery_jobs(p_jobs jsonb)
returns setof public.notification_delivery_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
  v_dedupe_key text;
  v_deliver_at_utc timestamptz;
  v_deliver_at_utc_text text;
  v_item_id uuid;
  v_item_scheduled_at_utc timestamptz;
  v_item_scheduled_at_utc_text text;
  v_job jsonb;
  v_notification_kind text;
  v_payload jsonb;
  v_title text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception '인증된 사용자만 알림 발송 job을 만들 수 있습니다.';
  end if;

  if p_jobs is null or jsonb_typeof(p_jobs) <> 'array' then
    raise exception 'p_jobs는 배열이어야 합니다.';
  end if;

  for v_job in select value from jsonb_array_elements(p_jobs)
  loop
    v_body := v_job->>'body';
    v_dedupe_key := v_job->>'dedupe_key';
    v_deliver_at_utc_text := v_job->>'deliver_at_utc';
    v_item_id := (v_job->>'item_id')::uuid;
    v_item_scheduled_at_utc_text := v_job->>'item_scheduled_at_utc';
    v_notification_kind := v_job->>'notification_kind';
    v_payload := coalesce(v_job->'payload', '{}'::jsonb);
    v_title := v_job->>'title';
    v_deliver_at_utc := v_deliver_at_utc_text::timestamptz;
    v_item_scheduled_at_utc := v_item_scheduled_at_utc_text::timestamptz;

    if v_notification_kind <> 'reminder' then
      raise exception '지원하지 않는 notification_kind입니다.';
    end if;

    if jsonb_typeof(v_payload) <> 'object' then
      raise exception 'payload는 object여야 합니다.';
    end if;

    if v_dedupe_key <> concat('reminder:', v_user_id, ':', v_item_id, ':', v_item_scheduled_at_utc_text) then
      raise exception 'dedupe_key가 알림 대상과 일치하지 않습니다.';
    end if;

    if v_deliver_at_utc <> v_item_scheduled_at_utc then
      raise exception 'deliver_at_utc와 item_scheduled_at_utc가 일치해야 합니다.';
    end if;

    if v_deliver_at_utc < now() - interval '5 minutes'
      or v_deliver_at_utc > now() + interval '14 days' then
      raise exception '알림 발송 job은 현재 시각 기준 14일 동기화 범위 안에서만 만들 수 있습니다.';
    end if;

    if v_payload->>'source' <> 'recurring-item'
      or v_payload->>'notificationKind' <> 'reminder'
      or v_payload->>'itemId' <> v_item_id::text
      or v_payload->>'scheduledAtUtc' <> v_item_scheduled_at_utc_text then
      raise exception 'payload routing 값이 알림 대상과 일치하지 않습니다.';
    end if;

    if not exists (
      select 1
      from public.recurring_items
      where id = v_item_id
        and user_id = v_user_id
    ) then
      raise exception '현재 사용자에게 속한 반복 항목만 알림 job을 만들 수 있습니다.';
    end if;

    return query
    insert into public.notification_delivery_jobs (
      body,
      cancel_reason,
      cancelled_at,
      completed_at,
      dedupe_key,
      deliver_at_utc,
      failure_count,
      item_id,
      item_scheduled_at_utc,
      last_attempted_at,
      next_retry_at,
      notification_kind,
      payload,
      retry_count,
      status,
      success_count,
      target_token_count,
      title,
      user_id
    )
    values (
      v_body,
      null,
      null,
      null,
      v_dedupe_key,
      v_deliver_at_utc,
      0,
      v_item_id,
      v_item_scheduled_at_utc,
      null,
      null,
      v_notification_kind,
      v_payload,
      0,
      'pending',
      0,
      0,
      v_title,
      v_user_id
    )
    on conflict (dedupe_key) do update
    set
      body = excluded.body,
      cancel_reason = null,
      cancelled_at = null,
      completed_at = null,
      deliver_at_utc = excluded.deliver_at_utc,
      failure_count = 0,
      item_scheduled_at_utc = excluded.item_scheduled_at_utc,
      last_attempted_at = null,
      next_retry_at = null,
      notification_kind = excluded.notification_kind,
      payload = excluded.payload,
      retry_count = 0,
      status = 'pending',
      success_count = 0,
      target_token_count = 0,
      title = excluded.title
    where public.notification_delivery_jobs.user_id = v_user_id
      and public.notification_delivery_jobs.status in ('pending', 'retrying', 'cancelled')
    returning public.notification_delivery_jobs.*;
  end loop;
end;
$$;

create or replace function public.cancel_notification_delivery_jobs(
  p_job_ids uuid[],
  p_cancel_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception '인증된 사용자만 알림 발송 job을 취소할 수 있습니다.';
  end if;

  if p_cancel_reason not in (
    'item-archived',
    'occurrence-completed',
    'occurrence-skipped',
    'schedule-updated',
    'no-active-tokens'
  ) then
    raise exception '지원하지 않는 cancel_reason입니다.';
  end if;

  update public.notification_delivery_jobs
  set
    cancel_reason = p_cancel_reason,
    cancelled_at = now(),
    next_retry_at = null,
    status = 'cancelled'
  where user_id = v_user_id
    and id = any(p_job_ids)
    and status in ('pending', 'retrying');
end;
$$;

revoke all on function public.upsert_notification_delivery_jobs(jsonb) from public;
revoke all on function public.cancel_notification_delivery_jobs(uuid[], text) from public;
revoke all on function public.invoke_push_delivery_worker() from public, anon, authenticated;
revoke all on function public.upsert_notification_delivery_jobs(jsonb) from anon;
revoke all on function public.cancel_notification_delivery_jobs(uuid[], text) from anon;
grant execute on function public.upsert_notification_delivery_jobs(jsonb) to authenticated;
grant execute on function public.cancel_notification_delivery_jobs(uuid[], text) to authenticated;
