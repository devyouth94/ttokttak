drop function if exists public.create_recurring_item_with_initial_version(
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
);

drop function if exists public.update_recurring_item_with_edit_policy(
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
);

alter table public.recurring_items
  drop column if exists category;

create or replace function public.create_recurring_item_with_initial_version(
  p_user_id uuid,
  p_title_ciphertext text,
  p_description_ciphertext text,
  p_content_key_version integer,
  p_content_encryption_metadata jsonb,
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

create or replace function public.update_recurring_item_with_edit_policy(
  p_item_id uuid,
  p_user_id uuid,
  p_title_ciphertext text,
  p_description_ciphertext text,
  p_content_key_version integer,
  p_content_encryption_metadata jsonb,
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
