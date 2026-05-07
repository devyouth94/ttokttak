-- DATABASE.sql
-- 이 파일은 확정된 제품/설계/도메인 결정을 저장 구조로 옮긴 스키마다.
-- 제품 범위와 용어의 기준은 PRODUCT_SPEC.md를 따른다.
-- 구성요소 책임과 데이터 흐름의 기준은 SYSTEM_DESIGN.md를 따른다.
-- 반복 계산, 상태 판정, 알림 동기화 규칙의 기준은 DOMAIN_LOGIC.md를 따른다.

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

drop trigger if exists trg_devices_set_updated_at on public.devices;
create trigger trg_devices_set_updated_at
before update on public.devices
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
