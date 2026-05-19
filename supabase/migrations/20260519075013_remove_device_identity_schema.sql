alter table public.completion_logs
  drop constraint if exists completion_logs_device_id_fkey;

alter table public.completion_logs
  drop column if exists device_id;

drop policy if exists "devices_select_own" on public.devices;
drop policy if exists "devices_insert_own" on public.devices;
drop policy if exists "devices_update_own" on public.devices;
drop policy if exists "devices_delete_own" on public.devices;

drop trigger if exists trg_devices_set_updated_at on public.devices;

drop index if exists public.idx_devices_user_active_created_at;
drop index if exists public.idx_devices_user_active;
drop index if exists public.idx_devices_user_id;

drop table if exists public.devices;
