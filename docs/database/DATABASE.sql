-- DATABASE.sql
-- 이 파일은 현재 운영 Supabase 스키마를 읽기 위한 snapshot이다.
-- 배포 변경 이력은 supabase/migrations에 두고 운영 DB와 맞춰 갱신한다.
-- 제품 범위는 docs/PRODUCT_SPEC.md를 따른다.
-- 구현 경계와 데이터 흐름은 docs/SYSTEM_DESIGN.md를 따른다.
-- 반복 계산과 상태 판정은 docs/DOMAIN_LOGIC.md를 따른다.

create extension if not exists pgcrypto;

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
-- user_content_encryption_keys
-- 일정 제목/설명 content key 복구용 wrapped key
-- =========================================================
create table if not exists public.user_content_encryption_keys (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key_version integer not null default 1,
  wrapped_key text not null,
  wrap_algorithm text not null,
  wrap_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, key_version),
  constraint user_content_encryption_keys_version_positive_check check (
    key_version >= 1
  ),
  constraint user_content_encryption_keys_wrapped_key_not_blank_check check (
    length(trim(wrapped_key)) > 0
  ),
  constraint user_content_encryption_keys_wrap_algorithm_check check (
    wrap_algorithm = 'AES-GCM'
  ),
  constraint user_content_encryption_keys_wrap_metadata_key_source_check check (
    wrap_metadata->>'keySource' = 'edge-secret-v1'
    or (
      wrap_metadata->>'keySource' = 'edge-secret-v2'
      and wrap_metadata->>'binding' = 'user-key-version-v1'
    )
  )
);

comment on table public.user_content_encryption_keys is
  '일정 제목/설명 content key의 서버 측 복구용 wrapped key. DB table만으로 content key를 복구할 수 없어야 한다.';

comment on column public.user_content_encryption_keys.wrapped_key is
  'Supabase Edge Function secret으로 감싼 content key. 앱 정적 key로 복호화할 수 없어야 한다.';

-- =========================================================
-- content_key_recovery_audit_events
-- 서버 측 내용 복구 호출 감사 이벤트
-- =========================================================
create table if not exists public.content_key_recovery_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  key_version integer,
  result text not null,
  created_at timestamptz not null default now(),
  constraint content_key_recovery_audit_events_action_check check (
    action in ('wrap', 'recover', 'unknown')
  ),
  constraint content_key_recovery_audit_events_result_check check (
    result in (
      'success',
      'denied',
      'invalid_request',
      'rate_limited',
      'server_error'
    )
  ),
  constraint content_key_recovery_audit_events_key_version_positive_check check (
    key_version is null or key_version >= 1
  )
);

create index if not exists idx_content_key_recovery_audit_events_user_created
  on public.content_key_recovery_audit_events(user_id, created_at desc);

comment on table public.content_key_recovery_audit_events is
  '서버 측 내용 복구 호출 결과를 평문 내용이나 key 없이 추적하는 내부 운영 기록.';

comment on column public.content_key_recovery_audit_events.result is
  '복구 호출 결과의 낮은 해상도 enum. 내부 exception message를 저장하지 않는다.';

-- =========================================================
-- recurring_items
-- =========================================================
create table if not exists public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  title_ciphertext text not null,
  description_ciphertext text,
  content_key_version integer not null default 1,
  content_encryption_metadata jsonb not null default '{}'::jsonb,
  color_key text not null default 'red',
  color_hex text not null default '#F5A3A3',

  start_date_local date not null,

  is_archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recurring_items_color_key_check check (
    color_key in ('red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple')
  ),
  constraint recurring_items_color_hex_check check (
    color_hex ~ '^#[0-9A-F]{6}$'
  ),
  constraint recurring_items_title_ciphertext_not_blank_check check (
    length(trim(title_ciphertext)) > 0
  ),
  constraint recurring_items_content_key_version_positive_check check (
    content_key_version >= 1
  )
);

comment on column public.recurring_items.color_hex is
  '새 앱이 표시하는 불투명 RGB 일정 색상.';

comment on column public.recurring_items.color_key is
  '구버전 앱 표시를 위한 가장 가까운 프리셋 색상 키.';

create index if not exists idx_recurring_items_user_id
  on public.recurring_items(user_id);

create index if not exists idx_recurring_items_user_archived_created_at
  on public.recurring_items(user_id, is_archived, created_at desc);

-- =========================================================
-- recurring_item_schedule_versions
-- recurring rule source of truth
-- 종료일 정책:
-- - end_date_local은 occurrence local date 기준 inclusive cutoff다.
-- - 한 번 일정은 종료일을 갖지 않는다.
-- - end_date_local은 nullable이므로 기존 일정과 종료일이 없는 반복 일정은 유지된다.
-- - 종료일 변경은 새 규칙 버전으로 저장되어 future-only로 적용된다.
-- - completion_based도 완료한 날짜가 아니라 occurrence local date 기준으로 자른다.
-- - 기기 로컬 알림은 종료일 이후 occurrence를 예약하지 않는다.
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
  end_date_local date,

  created_at timestamptz not null default now(),

  constraint recurring_item_schedule_versions_recurrence_type_check check (
    recurrence_type in (
      'once',
      'daily',
      'interval_days',
      'weekly',
      'interval_weeks',
      'monthly',
      'interval_months'
    )
  ),
  constraint recurring_item_schedule_versions_anchor_type_check check (
    anchor_type in ('fixed', 'completion_based')
  ),
  constraint recurring_item_schedule_versions_completion_based_recurrence_check check (
    anchor_type <> 'completion_based'
    or recurrence_type in ('daily', 'interval_days', 'monthly', 'interval_months')
  ),
  constraint recurring_item_schedule_versions_interval_positive_check check (
    interval_value is null or interval_value >= 1
  ),
  constraint recurring_item_schedule_versions_once_end_date_check check (
    recurrence_type <> 'once' or end_date_local is null
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

create index if not exists idx_completion_logs_user_created_at
  on public.completion_logs(user_id, created_at desc);

create index if not exists idx_completion_logs_user_item_scheduled_at
  on public.completion_logs(user_id, item_id, scheduled_at_utc desc);

create index if not exists idx_completion_logs_user_item_action_acted_at
  on public.completion_logs(user_id, item_id, action, acted_at_utc desc);

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

create or replace function public.guard_user_content_encryption_key_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  existing_key public.user_content_encryption_keys%rowtype;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select *
    into existing_key
    from public.user_content_encryption_keys
    where user_id = new.user_id
      and key_version = new.key_version;

    if not found
      or row(new.wrap_algorithm, new.wrap_metadata, new.wrapped_key)
        is distinct from row(
          existing_key.wrap_algorithm,
          existing_key.wrap_metadata,
          existing_key.wrapped_key
        )
    then
      raise insufficient_privilege using
        message = 'wrapped content key는 Edge Function만 만들 수 있습니다.';
    end if;

    return new;
  end if;

  if row(
    new.user_id,
    new.key_version,
    new.wrap_algorithm,
    new.wrap_metadata,
    new.wrapped_key
  ) is distinct from row(
    old.user_id,
    old.key_version,
    old.wrap_algorithm,
    old.wrap_metadata,
    old.wrapped_key
  )
  then
    raise insufficient_privilege using
      message = 'wrapped content key는 Edge Function만 변경할 수 있습니다.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_user_content_encryption_key_write()
from public, anon, authenticated;

comment on function public.guard_user_content_encryption_key_write() is
  '구버전 앱의 동일 값 upsert는 허용하고 authenticated 사용자의 wrapped key 생성과 변경은 차단한다.';

create or replace function public.create_recurring_item_with_initial_version(
  p_user_id uuid,
  p_title_ciphertext text,
  p_description_ciphertext text,
  p_content_key_version integer,
  p_content_encryption_metadata jsonb,
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
  p_color_key text default 'red',
  p_end_date_local date default null,
  p_color_hex text default null
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
    title_ciphertext,
    description_ciphertext,
    content_key_version,
    content_encryption_metadata,
    color_key,
    color_hex,
    start_date_local,
    is_archived
  )
  values (
    p_user_id,
    p_title_ciphertext,
    p_description_ciphertext,
    p_content_key_version,
    coalesce(p_content_encryption_metadata, '{}'::jsonb),
    coalesce(p_color_key, 'red'),
    coalesce(
      upper(p_color_hex),
      case coalesce(p_color_key, 'red')
        when 'orange' then '#F4BE8A'
        when 'yellow' then '#E8D86A'
        when 'green' then '#9FD4A5'
        when 'blue' then '#9DB7F5'
        when 'indigo' then '#9EA5E8'
        when 'purple' then '#D4A8EA'
        else '#F5A3A3'
      end
    ),
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
    notifications_enabled,
    end_date_local
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
    p_notifications_enabled,
    p_end_date_local
  );

  return v_item_id;
end;
$$;

create or replace function public.update_recurring_item_with_edit_policy(
  p_item_id uuid,
  p_user_id uuid,
  p_title_ciphertext text,
  p_description_ciphertext text,
  p_content_key_version integer,
  p_content_encryption_metadata jsonb,
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
  p_color_key text default 'red',
  p_end_date_local date default null,
  p_color_hex text default null
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
    title_ciphertext = p_title_ciphertext,
    description_ciphertext = p_description_ciphertext,
    content_key_version = p_content_key_version,
    content_encryption_metadata = coalesce(
      p_content_encryption_metadata,
      '{}'::jsonb
    ),
    color_hex = case
      when p_color_hex is not null then upper(p_color_hex)
      when coalesce(p_color_key, 'red') = color_key then color_hex
      else case coalesce(p_color_key, 'red')
        when 'orange' then '#F4BE8A'
        when 'yellow' then '#E8D86A'
        when 'green' then '#9FD4A5'
        when 'blue' then '#9DB7F5'
        when 'indigo' then '#9EA5E8'
        when 'purple' then '#D4A8EA'
        else '#F5A3A3'
      end
    end,
    color_key = coalesce(p_color_key, 'red')
  where id = p_item_id
    and user_id = p_user_id
    and not is_archived
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
      notifications_enabled,
      end_date_local
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
      p_notifications_enabled,
      p_end_date_local
    );
  end if;

  return v_updated_item_id;
end;
$$;

revoke all on function public.create_recurring_item_with_initial_version(
  uuid,
  text,
  text,
  integer,
  jsonb,
  date,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text,
  date,
  text
) from public, anon;

revoke all on function public.update_recurring_item_with_edit_policy(
  uuid,
  uuid,
  text,
  text,
  integer,
  jsonb,
  boolean,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text,
  date,
  text
) from public, anon;

grant execute on function public.create_recurring_item_with_initial_version(
  uuid,
  text,
  text,
  integer,
  jsonb,
  date,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text,
  date,
  text
) to authenticated;

grant execute on function public.update_recurring_item_with_edit_policy(
  uuid,
  uuid,
  text,
  text,
  integer,
  jsonb,
  boolean,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text,
  date,
  text
) to authenticated;

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
end;
$$;

revoke all on function public.archive_recurring_item(uuid) from public;
revoke all on function public.archive_recurring_item(uuid) from anon;
grant execute on function public.archive_recurring_item(uuid) to authenticated;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_content_encryption_keys_set_updated_at
on public.user_content_encryption_keys;
create trigger trg_user_content_encryption_keys_set_updated_at
before update on public.user_content_encryption_keys
for each row execute function public.set_updated_at();

drop trigger if exists trg_guard_user_content_encryption_key_write
on public.user_content_encryption_keys;
create trigger trg_guard_user_content_encryption_key_write
before insert or update on public.user_content_encryption_keys
for each row execute function public.guard_user_content_encryption_key_write();

drop trigger if exists trg_recurring_items_set_updated_at on public.recurring_items;
create trigger trg_recurring_items_set_updated_at
before update on public.recurring_items
for each row execute function public.set_updated_at();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.user_content_encryption_keys enable row level security;
alter table public.content_key_recovery_audit_events enable row level security;
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

-- user_content_encryption_keys
drop policy if exists user_content_encryption_keys_select_own
on public.user_content_encryption_keys;
create policy user_content_encryption_keys_select_own
on public.user_content_encryption_keys
for select
using (auth.uid() = user_id);

drop policy if exists user_content_encryption_keys_insert_own
on public.user_content_encryption_keys;
create policy user_content_encryption_keys_insert_own
on public.user_content_encryption_keys
for insert
with check (auth.uid() = user_id);

drop policy if exists user_content_encryption_keys_update_own
on public.user_content_encryption_keys;
create policy user_content_encryption_keys_update_own
on public.user_content_encryption_keys
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all privileges on table public.user_content_encryption_keys
from anon;
grant select, insert, update on table public.user_content_encryption_keys
to authenticated;

-- content_key_recovery_audit_events
revoke all privileges on table public.content_key_recovery_audit_events
from anon, authenticated;

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
