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

alter table public.recurring_items enable row level security;

drop policy if exists recurring_items_select_own on public.recurring_items;
create policy recurring_items_select_own
on public.recurring_items
for select
using (auth.uid() = user_id);

drop policy if exists recurring_items_insert_own on public.recurring_items;
create policy recurring_items_insert_own
on public.recurring_items
for insert
with check (auth.uid() = user_id);

drop policy if exists recurring_items_update_own on public.recurring_items;
create policy recurring_items_update_own
on public.recurring_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists trg_recurring_items_set_updated_at on public.recurring_items;
create trigger trg_recurring_items_set_updated_at
before update on public.recurring_items
for each row execute function public.set_updated_at();

create table if not exists public.completion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.recurring_items(id) on delete cascade,
  scheduled_at_utc timestamptz not null,
  action text not null,
  acted_at_utc timestamptz not null default now(),
  device_id uuid,
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

alter table public.completion_logs enable row level security;

drop policy if exists completion_logs_select_own on public.completion_logs;
create policy completion_logs_select_own
on public.completion_logs
for select
using (auth.uid() = user_id);

drop policy if exists completion_logs_insert_own on public.completion_logs;
create policy completion_logs_insert_own
on public.completion_logs
for insert
with check (auth.uid() = user_id);
