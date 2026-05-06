-- 개발 기간 reset: 기존 평문 일정과 원격 푸시 관련 누적 데이터는 보존하지 않는다.
truncate table
  public.notification_inbox_items,
  public.notification_delivery_attempts,
  public.notification_delivery_jobs,
  public.device_push_tokens,
  public.completion_logs,
  public.recurring_item_schedule_versions,
  public.recurring_items
restart identity cascade;

create table if not exists public.user_content_encryption_keys (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key_version integer not null default 1,
  wrapped_key text not null,
  wrap_algorithm text not null,
  wrap_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, key_version),
  constraint user_content_encryption_keys_version_positive_check check (
    key_version >= 1
  ),
  constraint user_content_encryption_keys_wrapped_key_not_blank_check check (
    length(trim(wrapped_key)) > 0
  )
);

drop trigger if exists trg_user_content_encryption_keys_set_updated_at
on public.user_content_encryption_keys;
create trigger trg_user_content_encryption_keys_set_updated_at
before update on public.user_content_encryption_keys
for each row execute function public.set_updated_at();

alter table public.user_content_encryption_keys enable row level security;

drop policy if exists user_content_encryption_keys_select_own
on public.user_content_encryption_keys;
create policy user_content_encryption_keys_select_own
on public.user_content_encryption_keys
for select
using (auth.uid() = user_id);

drop policy if exists user_content_encryption_keys_insert_own
on public.user_content_encryption_keys;
create policy user_content_encryption_keys_insert_own
on public.user_content_encryption_keys
for insert
with check (auth.uid() = user_id);

drop policy if exists user_content_encryption_keys_update_own
on public.user_content_encryption_keys;
create policy user_content_encryption_keys_update_own
on public.user_content_encryption_keys
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on public.user_content_encryption_keys from anon;
grant select, insert, update on public.user_content_encryption_keys
to authenticated;

alter table public.recurring_items
  drop column if exists title,
  drop column if exists description,
  add column if not exists title_ciphertext text not null,
  add column if not exists description_ciphertext text,
  add column if not exists content_key_version integer not null default 1,
  add column if not exists content_encryption_metadata jsonb not null default '{}'::jsonb;

alter table public.recurring_items
  drop constraint if exists recurring_items_title_ciphertext_not_blank_check,
  drop constraint if exists recurring_items_content_key_version_positive_check,
  add constraint recurring_items_title_ciphertext_not_blank_check check (
    length(trim(title_ciphertext)) > 0
  ),
  add constraint recurring_items_content_key_version_positive_check check (
    content_key_version >= 1
  );

drop function if exists public.create_recurring_item_with_initial_version(
  uuid,
  text,
  text,
  text,
  date,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text
);

create or replace function public.create_recurring_item_with_initial_version(
  p_user_id uuid,
  p_title_ciphertext text,
  p_description_ciphertext text,
  p_content_key_version integer,
  p_content_encryption_metadata jsonb,
  p_category text,
  p_start_date_local date,
  p_is_archived boolean,
  p_effective_from_utc timestamptz,
  p_recurrence_type text,
  p_interval_value integer,
  p_weekday_mask integer[],
  p_reminder_time_local time,
  p_anchor_type text,
  p_seed_start_date_local date,
  p_notifications_enabled boolean,
  p_color_key text default 'red'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item_id uuid;
begin
  insert into public.recurring_items (
    user_id,
    title_ciphertext,
    description_ciphertext,
    content_key_version,
    content_encryption_metadata,
    category,
    color_key,
    start_date_local,
    is_archived
  )
  values (
    p_user_id,
    p_title_ciphertext,
    p_description_ciphertext,
    p_content_key_version,
    coalesce(p_content_encryption_metadata, '{}'::jsonb),
    p_category,
    coalesce(p_color_key, 'red'),
    p_start_date_local,
    p_is_archived
  )
  returning id into v_item_id;

  insert into public.recurring_item_schedule_versions (
    item_id,
    user_id,
    effective_from_utc,
    recurrence_type,
    interval_value,
    weekday_mask,
    reminder_time_local,
    anchor_type,
    seed_start_date_local,
    notifications_enabled
  )
  values (
    v_item_id,
    p_user_id,
    p_effective_from_utc,
    p_recurrence_type,
    p_interval_value,
    p_weekday_mask,
    p_reminder_time_local,
    p_anchor_type,
    p_seed_start_date_local,
    p_notifications_enabled
  );

  return v_item_id;
end;
$$;

drop function if exists public.update_recurring_item_with_edit_policy(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text
);

create or replace function public.update_recurring_item_with_edit_policy(
  p_item_id uuid,
  p_user_id uuid,
  p_title_ciphertext text,
  p_description_ciphertext text,
  p_content_key_version integer,
  p_content_encryption_metadata jsonb,
  p_category text,
  p_is_archived boolean,
  p_has_rule_changes boolean,
  p_effective_from_utc timestamptz default null,
  p_recurrence_type text default null,
  p_interval_value integer default null,
  p_weekday_mask integer[] default null,
  p_reminder_time_local time default null,
  p_anchor_type text default null,
  p_seed_start_date_local date default null,
  p_notifications_enabled boolean default null,
  p_color_key text default 'red'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated_item_id uuid;
begin
  update public.recurring_items
  set
    title_ciphertext = p_title_ciphertext,
    description_ciphertext = p_description_ciphertext,
    content_key_version = p_content_key_version,
    content_encryption_metadata = coalesce(
      p_content_encryption_metadata,
      '{}'::jsonb
    ),
    category = p_category,
    color_key = coalesce(p_color_key, 'red'),
    is_archived = p_is_archived
  where id = p_item_id
    and user_id = p_user_id
  returning id into v_updated_item_id;

  if v_updated_item_id is null then
    raise exception '반복 항목을 찾을 수 없습니다.';
  end if;

  if p_has_rule_changes then
    if p_effective_from_utc is null
      or p_recurrence_type is null
      or p_reminder_time_local is null
      or p_anchor_type is null
      or p_seed_start_date_local is null
      or p_notifications_enabled is null then
      raise exception '규칙 변경 저장 인자가 부족합니다.';
    end if;

    insert into public.recurring_item_schedule_versions (
      item_id,
      user_id,
      effective_from_utc,
      recurrence_type,
      interval_value,
      weekday_mask,
      reminder_time_local,
      anchor_type,
      seed_start_date_local,
      notifications_enabled
    )
    values (
      p_item_id,
      p_user_id,
      p_effective_from_utc,
      p_recurrence_type,
      p_interval_value,
      p_weekday_mask,
      p_reminder_time_local,
      p_anchor_type,
      p_seed_start_date_local,
      p_notifications_enabled
    );
  end if;

  return v_updated_item_id;
end;
$$;

revoke all on function public.create_recurring_item_with_initial_version(
  uuid,
  text,
  text,
  integer,
  jsonb,
  text,
  date,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text
) from public, anon;

revoke all on function public.update_recurring_item_with_edit_policy(
  uuid,
  uuid,
  text,
  text,
  integer,
  jsonb,
  text,
  boolean,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text
) from public, anon;

grant execute on function public.create_recurring_item_with_initial_version(
  uuid,
  text,
  text,
  integer,
  jsonb,
  text,
  date,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text
) to authenticated;

grant execute on function public.update_recurring_item_with_edit_policy(
  uuid,
  uuid,
  text,
  text,
  integer,
  jsonb,
  text,
  boolean,
  boolean,
  timestamptz,
  text,
  integer,
  integer[],
  time,
  text,
  date,
  boolean,
  text
) to authenticated;
