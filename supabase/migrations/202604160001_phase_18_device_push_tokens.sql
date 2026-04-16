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

drop trigger if exists trg_device_push_tokens_set_updated_at on public.device_push_tokens;
create trigger trg_device_push_tokens_set_updated_at
before update on public.device_push_tokens
for each row execute function public.set_updated_at();

alter table public.device_push_tokens enable row level security;

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
