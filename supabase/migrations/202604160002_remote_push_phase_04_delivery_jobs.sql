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

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.notification_delivery_jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  push_token_id uuid references public.device_push_tokens(id) on delete set null,
  platform text not null,
  push_provider text not null,
  push_token text not null,
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
  constraint notification_delivery_attempts_job_token_attempt_unique unique (
    job_id,
    push_token,
    attempt_number
  )
);

create index if not exists idx_notification_delivery_attempts_job
  on public.notification_delivery_attempts(job_id, attempted_at desc);
create index if not exists idx_notification_delivery_attempts_user_attempted
  on public.notification_delivery_attempts(user_id, attempted_at desc);
create index if not exists idx_notification_delivery_attempts_token_status
  on public.notification_delivery_attempts(push_token, status);

drop trigger if exists trg_notification_delivery_jobs_set_updated_at on public.notification_delivery_jobs;
create trigger trg_notification_delivery_jobs_set_updated_at
before update on public.notification_delivery_jobs
for each row execute function public.set_updated_at();

alter table public.notification_delivery_jobs enable row level security;
alter table public.notification_delivery_attempts enable row level security;

drop policy if exists "notification_delivery_jobs_select_own" on public.notification_delivery_jobs;
create policy "notification_delivery_jobs_select_own"
on public.notification_delivery_jobs
for select
using (auth.uid() = user_id);

drop policy if exists "notification_delivery_jobs_insert_own" on public.notification_delivery_jobs;
create policy "notification_delivery_jobs_insert_own"
on public.notification_delivery_jobs
for insert
with check (auth.uid() = user_id);

drop policy if exists "notification_delivery_jobs_update_own" on public.notification_delivery_jobs;
create policy "notification_delivery_jobs_update_own"
on public.notification_delivery_jobs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notification_delivery_jobs_delete_own" on public.notification_delivery_jobs;
create policy "notification_delivery_jobs_delete_own"
on public.notification_delivery_jobs
for delete
using (auth.uid() = user_id);

drop policy if exists "notification_delivery_attempts_select_own" on public.notification_delivery_attempts;
create policy "notification_delivery_attempts_select_own"
on public.notification_delivery_attempts
for select
using (auth.uid() = user_id);

drop policy if exists "notification_delivery_attempts_insert_own" on public.notification_delivery_attempts;
create policy "notification_delivery_attempts_insert_own"
on public.notification_delivery_attempts
for insert
with check (auth.uid() = user_id);

drop policy if exists "notification_delivery_attempts_update_own" on public.notification_delivery_attempts;
create policy "notification_delivery_attempts_update_own"
on public.notification_delivery_attempts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notification_delivery_attempts_delete_own" on public.notification_delivery_attempts;
create policy "notification_delivery_attempts_delete_own"
on public.notification_delivery_attempts
for delete
using (auth.uid() = user_id);
