-- DATABASE.sql
-- 이 파일은 확정된 제품/설계/도메인 결정을 저장 구조로 옮긴 스키마다.
-- 제품 범위와 용어의 기준은 PRODUCT_SPEC.md를 따른다.
-- 구성요소 책임과 데이터 흐름의 기준은 SYSTEM_DESIGN.md를 따른다.
-- 반복 계산, 상태 판정, 알림 동기화 규칙의 기준은 DOMAIN_LOGIC.md를 따른다.

create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

-- =========================================================
-- profiles
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_nonempty check (char_length(timezone) > 0)
);

create index if not exists idx_profiles_timezone on public.profiles(timezone);

-- =========================================================
-- devices
-- 기기 식별과 마지막 활성 상태 관리용
-- =========================================================
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  device_name text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_platform_check check (platform in ('ios', 'android', 'web', 'unknown'))
);

create index if not exists idx_devices_user_id on public.devices(user_id);
create index if not exists idx_devices_user_active on public.devices(user_id, is_active);

-- =========================================================
-- device_push_tokens
-- 원격 푸시 토큰 등록 상태 관리용
-- =========================================================
create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  platform text not null,
  push_provider text not null,
  push_token text not null,
  is_active boolean not null default true,
  permission_status text not null default 'granted',
  last_registered_at timestamptz not null default now(),
  deactivated_at timestamptz,
  deactivation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_push_tokens_platform_check check (
    platform in ('ios', 'android')
  ),
  constraint device_push_tokens_provider_check check (
    push_provider in ('apns', 'fcm')
  ),
  constraint device_push_tokens_permission_status_check check (
    permission_status in ('granted', 'denied')
  ),
  constraint device_push_tokens_deactivation_reason_check check (
    deactivation_reason is null or
    deactivation_reason in ('logout', 'permission-denied', 'delivery-failed')
  ),
  constraint device_push_tokens_device_provider_unique unique (
    device_id,
    push_provider
  )
);

create index if not exists idx_device_push_tokens_user_active
  on public.device_push_tokens(user_id, is_active);
create index if not exists idx_device_push_tokens_device_active
  on public.device_push_tokens(device_id, is_active);
create index if not exists idx_device_push_tokens_token
  on public.device_push_tokens(push_token);

-- =========================================================
-- notification_delivery_jobs
-- 원격 푸시 발송 occurrence 단위 상태 관리용
-- =========================================================
create table if not exists public.notification_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.recurring_items(id) on delete cascade,
  notification_kind text not null default 'reminder',
  item_scheduled_at_utc timestamptz not null,
  deliver_at_utc timestamptz not null,
  dedupe_key text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  cancel_reason text,
  retry_count integer not null default 0,
  target_token_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  last_attempted_at timestamptz,
  next_retry_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_delivery_jobs_kind_check check (
    notification_kind in ('reminder')
  ),
  constraint notification_delivery_jobs_status_check check (
    status in (
      'pending',
      'processing',
      'retrying',
      'succeeded',
      'partially-failed',
      'failed',
      'cancelled'
    )
  ),
  constraint notification_delivery_jobs_cancel_reason_check check (
    cancel_reason is null or
    cancel_reason in (
      'item-archived',
      'occurrence-completed',
      'occurrence-skipped',
      'schedule-updated',
      'no-active-tokens'
    )
  ),
  constraint notification_delivery_jobs_retry_count_check check (
    retry_count >= 0 and retry_count <= 3
  ),
  constraint notification_delivery_jobs_target_token_count_check check (
    target_token_count >= 0
  ),
  constraint notification_delivery_jobs_success_count_check check (
    success_count >= 0
  ),
  constraint notification_delivery_jobs_failure_count_check check (
    failure_count >= 0
  ),
  constraint notification_delivery_jobs_counts_total_check check (
    success_count + failure_count <= target_token_count
  ),
  constraint notification_delivery_jobs_dedupe_key_unique unique (dedupe_key)
);

create index if not exists idx_notification_delivery_jobs_due
  on public.notification_delivery_jobs(status, deliver_at_utc);
create index if not exists idx_notification_delivery_jobs_user_delivery
  on public.notification_delivery_jobs(user_id, deliver_at_utc);
create index if not exists idx_notification_delivery_jobs_item_scheduled
  on public.notification_delivery_jobs(item_id, item_scheduled_at_utc);
create index if not exists idx_notification_delivery_jobs_retry
  on public.notification_delivery_jobs(status, next_retry_at);

-- =========================================================
-- notification_delivery_attempts
-- 원격 푸시 발송 token 단위 결과 기록용
-- =========================================================
create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.notification_delivery_jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  push_token_id uuid references public.device_push_tokens(id) on delete set null,
  platform text not null,
  push_provider text not null,
  push_token_ref text not null,
  attempt_number integer not null,
  status text not null,
  provider_message_id text,
  provider_error_code text,
  provider_error_message text,
  response_payload jsonb not null default '{}'::jsonb,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint notification_delivery_attempts_platform_check check (
    platform in ('ios', 'android')
  ),
  constraint notification_delivery_attempts_provider_check check (
    push_provider in ('apns', 'fcm')
  ),
  constraint notification_delivery_attempts_attempt_number_check check (
    attempt_number >= 1 and attempt_number <= 4
  ),
  constraint notification_delivery_attempts_status_check check (
    status in (
      'succeeded',
      'retryable-failed',
      'permanent-failed',
      'token-invalid',
      'skipped'
    )
  ),
  constraint notification_delivery_attempts_job_token_ref_attempt_unique unique (
    job_id,
    push_token_ref,
    attempt_number
  )
);

create index if not exists idx_notification_delivery_attempts_job
  on public.notification_delivery_attempts(job_id, attempted_at desc);
create index if not exists idx_notification_delivery_attempts_user_attempted
  on public.notification_delivery_attempts(user_id, attempted_at desc);
create index if not exists idx_notification_delivery_attempts_token_ref_status
  on public.notification_delivery_attempts(push_token_ref, status);

-- =========================================================
-- notification_inbox_items
-- 성공한 원격 푸시의 사용자-facing inbox row
-- 발송 예정 job은 성공 응답 전까지 row로 복사하지 않는다.
-- user-facing identity는 (user_id, item_id, item_scheduled_at_utc)이다.
-- unique key는 여러 기기 성공, worker 재시도, 반복 처리의 collapse 기준이다.
-- source_job_id, token, device, provider는 identity가 아니라 운영 로그 속성이다.
-- 삭제 UX는 물리 삭제가 아니라 현재 사용자 row의 hidden_at 업데이트로 처리한다.
-- 클라이언트 삭제 권한은 제공하지 않고 현재 사용자 row update만 허용한다.
-- 삭제 flow는 delivery job을 update/delete하지 않고 delivery job/attempt 기록으로 cascade하지 않는다.
-- =========================================================
create table if not exists public.notification_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.recurring_items(id) on delete cascade,
  source_job_id uuid references public.notification_delivery_jobs(id) on delete set null,
  notification_kind text not null default 'reminder',
  item_scheduled_at_utc timestamptz not null,
  delivered_at_utc timestamptz not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_inbox_items_kind_check check (
    notification_kind in ('reminder')
  ),
  constraint notification_inbox_items_user_occurrence_unique unique (
    user_id,
    item_id,
    item_scheduled_at_utc
  )
);

-- 같은 사용자, 반복 항목, 예정 시각의 여러 기기 성공과 재처리는 inbox row 1개로 collapse 한다.
-- hidden_at이 있는 row는 사용자 inbox 목록에서 제외한다.
create index if not exists idx_notification_inbox_items_user_delivered
  on public.notification_inbox_items(user_id, delivered_at_utc desc)
  where hidden_at is null;
create index if not exists idx_notification_inbox_items_user_unread
  on public.notification_inbox_items(user_id, delivered_at_utc desc)
  where read_at is null and hidden_at is null;
create index if not exists idx_notification_inbox_items_source_job
  on public.notification_inbox_items(source_job_id);

-- =========================================================
-- recurring_items
-- =========================================================
create table if not exists public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  description text,
  category text,
  color_key text not null default 'red',

  start_date_local date not null,

  is_archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recurring_items_color_key_check check (
    color_key in ('red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple')
  )
);

create index if not exists idx_recurring_items_user_id
  on public.recurring_items(user_id);

create index if not exists idx_recurring_items_user_archived
  on public.recurring_items(user_id, is_archived);

-- =========================================================
-- recurring_item_schedule_versions
-- recurring rule source of truth
-- =========================================================
create table if not exists public.recurring_item_schedule_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.recurring_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  effective_from_utc timestamptz not null,
  recurrence_type text not null,
  interval_value integer,
  weekday_mask integer[],
  reminder_time_local time not null,
  anchor_type text not null default 'fixed',
  seed_start_date_local date not null,
  notifications_enabled boolean not null default true,

  created_at timestamptz not null default now(),

  constraint recurring_item_schedule_versions_recurrence_type_check check (
    recurrence_type in (
      'once',
      'daily',
      'interval_days',
      'weekly',
      'interval_weeks',
      'monthly',
      'interval_months',
      'yearly'
    )
  ),
  constraint recurring_item_schedule_versions_anchor_type_check check (
    anchor_type in ('fixed', 'completion_based')
  ),
  constraint recurring_item_schedule_versions_interval_positive_check check (
    interval_value is null or interval_value >= 1
  )
);

create index if not exists idx_schedule_versions_item_effective
  on public.recurring_item_schedule_versions(item_id, effective_from_utc);

create index if not exists idx_schedule_versions_user_created
  on public.recurring_item_schedule_versions(user_id, created_at desc);

-- =========================================================
-- completion_logs
-- occurrence identity = (item_id, scheduled_at_utc)
-- =========================================================
create table if not exists public.completion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.recurring_items(id) on delete cascade,

  scheduled_at_utc timestamptz not null,
  action text not null,
  acted_at_utc timestamptz not null default now(),

  device_id uuid references public.devices(id) on delete set null,

  created_at timestamptz not null default now(),

  constraint completion_logs_action_check check (
    action in ('completed', 'skipped')
  ),

  constraint completion_logs_unique_occurrence_action unique (item_id, scheduled_at_utc)
);

create index if not exists idx_completion_logs_user_id
  on public.completion_logs(user_id);

create index if not exists idx_completion_logs_item_id
  on public.completion_logs(item_id);

create index if not exists idx_completion_logs_item_scheduled_at
  on public.completion_logs(item_id, scheduled_at_utc);

create index if not exists idx_completion_logs_user_created_at
  on public.completion_logs(user_id, created_at desc);

-- =========================================================
-- updated_at trigger helper
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_recurring_item_with_initial_version(
  p_user_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_start_date_local date,
  p_is_archived boolean,
  p_effective_from_utc timestamptz,
  p_recurrence_type text,
  p_interval_value integer,
  p_weekday_mask integer[],
  p_reminder_time_local time,
  p_anchor_type text,
  p_seed_start_date_local date,
  p_notifications_enabled boolean,
  p_color_key text default 'red'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item_id uuid;
begin
  insert into public.recurring_items (
    user_id,
    title,
    description,
    category,
    color_key,
    start_date_local,
    is_archived
  )
  values (
    p_user_id,
    p_title,
    p_description,
    p_category,
    coalesce(p_color_key, 'red'),
    p_start_date_local,
    p_is_archived
  )
  returning id into v_item_id;

  insert into public.recurring_item_schedule_versions (
    item_id,
    user_id,
    effective_from_utc,
    recurrence_type,
    interval_value,
    weekday_mask,
    reminder_time_local,
    anchor_type,
    seed_start_date_local,
    notifications_enabled
  )
  values (
    v_item_id,
    p_user_id,
    p_effective_from_utc,
    p_recurrence_type,
    p_interval_value,
    p_weekday_mask,
    p_reminder_time_local,
    p_anchor_type,
    p_seed_start_date_local,
    p_notifications_enabled
  );

  return v_item_id;
end;
$$;

create or replace function public.update_recurring_item_with_edit_policy(
  p_item_id uuid,
  p_user_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_is_archived boolean,
  p_has_rule_changes boolean,
  p_effective_from_utc timestamptz default null,
  p_recurrence_type text default null,
  p_interval_value integer default null,
  p_weekday_mask integer[] default null,
  p_reminder_time_local time default null,
  p_anchor_type text default null,
  p_seed_start_date_local date default null,
  p_notifications_enabled boolean default null,
  p_color_key text default 'red'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated_item_id uuid;
begin
  update public.recurring_items
  set
    title = p_title,
    description = p_description,
    category = p_category,
    color_key = coalesce(p_color_key, 'red'),
    is_archived = p_is_archived
  where id = p_item_id
    and user_id = p_user_id
  returning id into v_updated_item_id;

  if v_updated_item_id is null then
    raise exception '반복 항목을 찾을 수 없습니다.';
  end if;

  if p_has_rule_changes then
    if p_effective_from_utc is null
      or p_recurrence_type is null
      or p_reminder_time_local is null
      or p_anchor_type is null
      or p_seed_start_date_local is null
      or p_notifications_enabled is null then
      raise exception '규칙 변경 저장 인자가 부족합니다.';
    end if;

    insert into public.recurring_item_schedule_versions (
      item_id,
      user_id,
      effective_from_utc,
      recurrence_type,
      interval_value,
      weekday_mask,
      reminder_time_local,
      anchor_type,
      seed_start_date_local,
      notifications_enabled
    )
    values (
      p_item_id,
      p_user_id,
      p_effective_from_utc,
      p_recurrence_type,
      p_interval_value,
      p_weekday_mask,
      p_reminder_time_local,
      p_anchor_type,
      p_seed_start_date_local,
      p_notifications_enabled
    );
  end if;

  return p_item_id;
end;
$$;

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

create or replace function public.archive_recurring_item(p_item_id uuid)
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
    raise exception '인증된 사용자만 반복 항목을 삭제할 수 있습니다.';
  end if;

  update public.recurring_items
  set is_archived = true
  where id = p_item_id
    and user_id = v_user_id;

  if not found then
    raise exception '반복 항목을 찾을 수 없습니다.';
  end if;

  update public.notification_delivery_jobs
  set
    cancel_reason = 'item-archived',
    cancelled_at = now(),
    next_retry_at = null,
    status = 'cancelled'
  where user_id = v_user_id
    and item_id = p_item_id
    and status in ('pending', 'retrying');
end;
$$;

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
revoke all on function public.archive_recurring_item(uuid) from public;
revoke all on function public.invoke_push_delivery_worker() from public, anon, authenticated;
revoke all on function public.upsert_notification_delivery_jobs(jsonb) from anon;
revoke all on function public.cancel_notification_delivery_jobs(uuid[], text) from anon;
revoke all on function public.archive_recurring_item(uuid) from anon;
grant execute on function public.upsert_notification_delivery_jobs(jsonb) to authenticated;
grant execute on function public.cancel_notification_delivery_jobs(uuid[], text) to authenticated;
grant execute on function public.archive_recurring_item(uuid) to authenticated;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_devices_set_updated_at on public.devices;
create trigger trg_devices_set_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

drop trigger if exists trg_device_push_tokens_set_updated_at on public.device_push_tokens;
create trigger trg_device_push_tokens_set_updated_at
before update on public.device_push_tokens
for each row execute function public.set_updated_at();

drop trigger if exists trg_notification_delivery_jobs_set_updated_at on public.notification_delivery_jobs;
create trigger trg_notification_delivery_jobs_set_updated_at
before update on public.notification_delivery_jobs
for each row execute function public.set_updated_at();

drop trigger if exists trg_notification_inbox_items_set_updated_at on public.notification_inbox_items;
create trigger trg_notification_inbox_items_set_updated_at
before update on public.notification_inbox_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_recurring_items_set_updated_at on public.recurring_items;
create trigger trg_recurring_items_set_updated_at
before update on public.recurring_items
for each row execute function public.set_updated_at();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.notification_delivery_jobs enable row level security;
alter table public.notification_delivery_attempts enable row level security;
alter table public.notification_inbox_items enable row level security;
alter table public.recurring_items enable row level security;
alter table public.recurring_item_schedule_versions enable row level security;
alter table public.completion_logs enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

-- devices
drop policy if exists "devices_select_own" on public.devices;
create policy "devices_select_own"
on public.devices
for select
using (auth.uid() = user_id);

drop policy if exists "devices_insert_own" on public.devices;
create policy "devices_insert_own"
on public.devices
for insert
with check (auth.uid() = user_id);

drop policy if exists "devices_update_own" on public.devices;
create policy "devices_update_own"
on public.devices
for update
using (auth.uid() = user_id);

drop policy if exists "devices_delete_own" on public.devices;
create policy "devices_delete_own"
on public.devices
for delete
using (auth.uid() = user_id);

-- device_push_tokens
drop policy if exists "device_push_tokens_select_own" on public.device_push_tokens;
create policy "device_push_tokens_select_own"
on public.device_push_tokens
for select
using (auth.uid() = user_id);

drop policy if exists "device_push_tokens_insert_own" on public.device_push_tokens;
create policy "device_push_tokens_insert_own"
on public.device_push_tokens
for insert
with check (auth.uid() = user_id);

drop policy if exists "device_push_tokens_update_own" on public.device_push_tokens;
create policy "device_push_tokens_update_own"
on public.device_push_tokens
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "device_push_tokens_delete_own" on public.device_push_tokens;
create policy "device_push_tokens_delete_own"
on public.device_push_tokens
for delete
using (auth.uid() = user_id);

-- notification_delivery_jobs
drop policy if exists "notification_delivery_jobs_select_own" on public.notification_delivery_jobs;
create policy "notification_delivery_jobs_select_own"
on public.notification_delivery_jobs
for select
using (auth.uid() = user_id);

drop policy if exists "notification_delivery_jobs_insert_own" on public.notification_delivery_jobs;
drop policy if exists "notification_delivery_jobs_update_own" on public.notification_delivery_jobs;
drop policy if exists "notification_delivery_jobs_delete_own" on public.notification_delivery_jobs;
revoke insert, update, delete on public.notification_delivery_jobs from anon, authenticated;

-- notification_delivery_attempts
drop policy if exists "notification_delivery_attempts_select_own" on public.notification_delivery_attempts;
create policy "notification_delivery_attempts_select_own"
on public.notification_delivery_attempts
for select
using (auth.uid() = user_id);

drop policy if exists "notification_delivery_attempts_insert_own" on public.notification_delivery_attempts;
drop policy if exists "notification_delivery_attempts_update_own" on public.notification_delivery_attempts;
drop policy if exists "notification_delivery_attempts_delete_own" on public.notification_delivery_attempts;
revoke insert, update, delete on public.notification_delivery_attempts from anon, authenticated;

-- notification_inbox_items
drop policy if exists "notification_inbox_items_select_own" on public.notification_inbox_items;
create policy "notification_inbox_items_select_own"
on public.notification_inbox_items
for select
using (auth.uid() = user_id);

drop policy if exists "notification_inbox_items_update_own" on public.notification_inbox_items;
create policy "notification_inbox_items_update_own"
on public.notification_inbox_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
revoke insert, update, delete on public.notification_inbox_items from anon, authenticated;
grant update (read_at, hidden_at) on public.notification_inbox_items to authenticated;
-- delete policy는 만들지 않는다. 사용자 삭제 UX는 hidden_at update만 사용한다.

-- recurring_items
drop policy if exists "recurring_items_select_own" on public.recurring_items;
create policy "recurring_items_select_own"
on public.recurring_items
for select
using (auth.uid() = user_id);

drop policy if exists "recurring_items_insert_own" on public.recurring_items;
create policy "recurring_items_insert_own"
on public.recurring_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "recurring_items_update_own" on public.recurring_items;
create policy "recurring_items_update_own"
on public.recurring_items
for update
using (auth.uid() = user_id);

drop policy if exists "recurring_items_delete_own" on public.recurring_items;
create policy "recurring_items_delete_own"
on public.recurring_items
for delete
using (auth.uid() = user_id);

-- recurring_item_schedule_versions
drop policy if exists "schedule_versions_select_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_select_own"
on public.recurring_item_schedule_versions
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "schedule_versions_insert_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_insert_own"
on public.recurring_item_schedule_versions
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "schedule_versions_update_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_update_own"
on public.recurring_item_schedule_versions
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "schedule_versions_delete_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_delete_own"
on public.recurring_item_schedule_versions
for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
);

-- completion_logs
drop policy if exists "completion_logs_select_own" on public.completion_logs;
create policy "completion_logs_select_own"
on public.completion_logs
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "completion_logs_insert_own" on public.completion_logs;
create policy "completion_logs_insert_own"
on public.completion_logs
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "completion_logs_update_own" on public.completion_logs;
create policy "completion_logs_update_own"
on public.completion_logs
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "completion_logs_delete_own" on public.completion_logs;
create policy "completion_logs_delete_own"
on public.completion_logs
for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
);
