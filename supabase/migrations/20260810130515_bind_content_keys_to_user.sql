alter table public.user_content_encryption_keys
  drop constraint if exists user_content_encryption_keys_wrap_metadata_key_source_check,
  add constraint user_content_encryption_keys_wrap_metadata_key_source_check check (
    wrap_metadata->>'keySource' = 'edge-secret-v1'
    or (
      wrap_metadata->>'keySource' = 'edge-secret-v2'
      and wrap_metadata->>'binding' = 'user-key-version-v1'
    )
  );

create or replace function public.guard_user_content_encryption_key_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  existing_key public.user_content_encryption_keys%rowtype;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select *
    into existing_key
    from public.user_content_encryption_keys
    where user_id = new.user_id
      and key_version = new.key_version;

    if not found
      or row(new.wrap_algorithm, new.wrap_metadata, new.wrapped_key)
        is distinct from row(
          existing_key.wrap_algorithm,
          existing_key.wrap_metadata,
          existing_key.wrapped_key
        )
    then
      raise insufficient_privilege using
        message = 'wrapped content key는 Edge Function만 만들 수 있습니다.';
    end if;

    return new;
  end if;

  if row(
    new.user_id,
    new.key_version,
    new.wrap_algorithm,
    new.wrap_metadata,
    new.wrapped_key
  ) is distinct from row(
    old.user_id,
    old.key_version,
    old.wrap_algorithm,
    old.wrap_metadata,
    old.wrapped_key
  )
  then
    raise insufficient_privilege using
      message = 'wrapped content key는 Edge Function만 변경할 수 있습니다.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_user_content_encryption_key_write()
from public, anon, authenticated;

drop trigger if exists trg_guard_user_content_encryption_key_write
on public.user_content_encryption_keys;
create trigger trg_guard_user_content_encryption_key_write
before insert or update on public.user_content_encryption_keys
for each row execute function public.guard_user_content_encryption_key_write();

comment on function public.guard_user_content_encryption_key_write() is
  '구버전 앱의 동일 값 upsert는 허용하고 authenticated 사용자의 wrapped key 생성과 변경은 차단한다.';
