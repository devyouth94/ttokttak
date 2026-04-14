-- phase 16
-- item 메타와 schedule version을 분리한다.

drop index if exists idx_recurring_items_notifications_enabled;

alter table if exists public.recurring_items
  drop constraint if exists recurring_items_recurrence_type_check,
  drop constraint if exists recurring_items_anchor_type_check,
  drop constraint if exists recurring_items_interval_positive_check,
  drop column if exists recurrence_type,
  drop column if exists interval_value,
  drop column if exists weekday_mask,
  drop column if exists reminder_time_local,
  drop column if exists notifications_enabled,
  drop column if exists anchor_type;

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

alter table public.recurring_item_schedule_versions enable row level security;

drop policy if exists "schedule_versions_select_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_select_own"
on public.recurring_item_schedule_versions
for select
using (auth.uid() = user_id);

drop policy if exists "schedule_versions_insert_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_insert_own"
on public.recurring_item_schedule_versions
for insert
with check (auth.uid() = user_id);

drop policy if exists "schedule_versions_update_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_update_own"
on public.recurring_item_schedule_versions
for update
using (auth.uid() = user_id);

drop policy if exists "schedule_versions_delete_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_delete_own"
on public.recurring_item_schedule_versions
for delete
using (auth.uid() = user_id);
