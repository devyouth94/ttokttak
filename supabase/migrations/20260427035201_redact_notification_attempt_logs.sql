create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_delivery_attempts'
      and column_name = 'push_token'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_delivery_attempts'
      and column_name = 'push_token_ref'
  ) then
    alter table public.notification_delivery_attempts
      rename column push_token to push_token_ref;
  end if;
end
$$;

update public.notification_delivery_attempts
set push_token_ref = case
    when push_token_ref like 'token-id:%'
      or push_token_ref like 'sha256:%'
      then push_token_ref
    when push_token_id is not null
      then 'token-id:' || push_token_id::text
    else 'sha256:' || encode(digest(push_token_ref, 'sha256'), 'hex')
  end,
  provider_error_message = case
    when provider_error_code is not null then provider_error_code
    else null
  end,
  response_payload = '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'notification_delivery_attempts_job_token_attempt_unique'
      and conrelid = 'public.notification_delivery_attempts'::regclass
  ) then
    alter table public.notification_delivery_attempts
      rename constraint notification_delivery_attempts_job_token_attempt_unique
      to notification_delivery_attempts_job_token_ref_attempt_unique;
  end if;
end
$$;

drop index if exists public.idx_notification_delivery_attempts_token_status;
create index if not exists idx_notification_delivery_attempts_token_ref_status
  on public.notification_delivery_attempts(push_token_ref, status);

comment on column public.notification_delivery_attempts.push_token_ref is
  '원문 push token을 저장하지 않는 operation log 참조값. 신규 row는 token-id:<device_push_tokens.id> 형식을 사용한다.';
