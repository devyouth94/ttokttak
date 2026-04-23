-- 발송 예정 job은 성공 응답 전까지 notification_inbox_items로 복사하지 않는다.
-- user-facing identity는 (user_id, item_id, item_scheduled_at_utc)이다.
-- unique key는 여러 기기 성공, worker 재시도, 반복 처리의 collapse 기준이다.
-- source_job_id, token, device, provider는 identity가 아니라 운영 로그 속성이다.
-- 삭제 UX는 현재 사용자 row의 hidden_at 업데이트로 처리한다.
-- 클라이언트 삭제 권한은 제공하지 않고 현재 사용자 row update만 허용한다.
-- 삭제 flow는 delivery job을 update/delete하지 않고 delivery job/attempt 기록으로 cascade하지 않는다.
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

drop trigger if exists trg_notification_inbox_items_set_updated_at on public.notification_inbox_items;
create trigger trg_notification_inbox_items_set_updated_at
before update on public.notification_inbox_items
for each row execute function public.set_updated_at();

alter table public.notification_inbox_items enable row level security;

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
-- delete policy는 만들지 않는다. 사용자 삭제 UX는 hidden_at update만 사용한다.
