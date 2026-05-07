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

alter table public.content_key_recovery_audit_events enable row level security;

revoke all privileges on table public.content_key_recovery_audit_events
from anon, authenticated;

comment on table public.content_key_recovery_audit_events is
  '서버 측 내용 복구 호출 결과를 평문 내용이나 key 없이 추적하는 내부 운영 기록.';

comment on column public.content_key_recovery_audit_events.result is
  '복구 호출 결과의 낮은 해상도 enum. 내부 exception message를 저장하지 않는다.';
