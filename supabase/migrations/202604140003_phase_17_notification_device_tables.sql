create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  device_name text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_platform_check check (
    platform in ('ios', 'android', 'web', 'unknown')
  )
);

create index if not exists idx_devices_user_id on public.devices(user_id);
create index if not exists idx_devices_user_active
  on public.devices(user_id, is_active);

alter table public.completion_logs
  drop constraint if exists completion_logs_device_id_fkey;

alter table public.completion_logs
  add constraint completion_logs_device_id_fkey
  foreign key (device_id) references public.devices(id) on delete set null;

create table if not exists public.device_notification_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  item_id uuid not null references public.recurring_items(id) on delete cascade,
  scheduled_at_utc timestamptz not null,
  local_notification_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_notification_reservations_unique unique (
    device_id,
    item_id,
    scheduled_at_utc
  )
);

create index if not exists idx_device_notification_reservations_device
  on public.device_notification_reservations(device_id);
create index if not exists idx_device_notification_reservations_item
  on public.device_notification_reservations(item_id);
create index if not exists idx_device_notification_reservations_device_scheduled
  on public.device_notification_reservations(device_id, scheduled_at_utc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_devices_set_updated_at on public.devices;
create trigger trg_devices_set_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

drop trigger if exists trg_device_notification_reservations_set_updated_at on public.device_notification_reservations;
create trigger trg_device_notification_reservations_set_updated_at
before update on public.device_notification_reservations
for each row execute function public.set_updated_at();

alter table public.devices enable row level security;
alter table public.device_notification_reservations enable row level security;

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
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "devices_delete_own" on public.devices;
create policy "devices_delete_own"
on public.devices
for delete
using (auth.uid() = user_id);

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
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "device_notification_reservations_delete_own" on public.device_notification_reservations;
create policy "device_notification_reservations_delete_own"
on public.device_notification_reservations
for delete
using (auth.uid() = user_id);
