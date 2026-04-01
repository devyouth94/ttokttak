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
-- device-scoped notification metadata 관리용
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

  recurrence_type text not null,
  interval_value integer,
  weekday_mask integer[],

  start_date_local date not null,
  reminder_time_local time not null,

  notifications_enabled boolean not null default true,
  anchor_type text not null default 'fixed',

  is_archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recurring_items_recurrence_type_check check (
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

  constraint recurring_items_anchor_type_check check (
    anchor_type in ('fixed', 'completion_based')
  ),

  constraint recurring_items_interval_positive_check check (
    interval_value is null or interval_value >= 1
  )
);

create index if not exists idx_recurring_items_user_id
  on public.recurring_items(user_id);

create index if not exists idx_recurring_items_user_archived
  on public.recurring_items(user_id, is_archived);

create index if not exists idx_recurring_items_notifications_enabled
  on public.recurring_items(user_id, notifications_enabled);

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
-- device_notification_reservations
-- 각 기기에서 예약한 로컬 알림 추적용
-- =========================================================
create table if not exists public.device_notification_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  item_id uuid not null references public.recurring_items(id) on delete cascade,

  scheduled_at_utc timestamptz not null,
  local_notification_id text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint device_notification_reservations_unique unique (device_id, item_id, scheduled_at_utc)
);

create index if not exists idx_device_notification_reservations_device
  on public.device_notification_reservations(device_id);

create index if not exists idx_device_notification_reservations_item
  on public.device_notification_reservations(item_id);

create index if not exists idx_device_notification_reservations_device_scheduled
  on public.device_notification_reservations(device_id, scheduled_at_utc);

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

drop trigger if exists trg_device_notification_reservations_set_updated_at on public.device_notification_reservations;
create trigger trg_device_notification_reservations_set_updated_at
before update on public.device_notification_reservations
for each row execute function public.set_updated_at();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.recurring_items enable row level security;
alter table public.completion_logs enable row level security;
alter table public.device_notification_reservations enable row level security;

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

-- completion_logs
drop policy if exists "completion_logs_select_own" on public.completion_logs;
create policy "completion_logs_select_own"
on public.completion_logs
for select
using (auth.uid() = user_id);

drop policy if exists "completion_logs_insert_own" on public.completion_logs;
create policy "completion_logs_insert_own"
on public.completion_logs
for insert
with check (auth.uid() = user_id);

drop policy if exists "completion_logs_update_own" on public.completion_logs;
create policy "completion_logs_update_own"
on public.completion_logs
for update
using (auth.uid() = user_id);

drop policy if exists "completion_logs_delete_own" on public.completion_logs;
create policy "completion_logs_delete_own"
on public.completion_logs
for delete
using (auth.uid() = user_id);

-- device_notification_reservations
drop policy if exists "device_notification_reservations_select_own" on public.device_notification_reservations;
create policy "device_notification_reservations_select_own"
on public.device_notification_reservations
for select
using (auth.uid() = user_id);

drop policy if exists "device_notification_reservations_insert_own" on public.device_notification_reservations;
create policy "device_notification_reservations_insert_own"
on public.device_notification_reservations
for insert
with check (auth.uid() = user_id);

drop policy if exists "device_notification_reservations_update_own" on public.device_notification_reservations;
create policy "device_notification_reservations_update_own"
on public.device_notification_reservations
for update
using (auth.uid() = user_id);

drop policy if exists "device_notification_reservations_delete_own" on public.device_notification_reservations;
create policy "device_notification_reservations_delete_own"
on public.device_notification_reservations
for delete
using (auth.uid() = user_id);
