select cron.unschedule('push-delivery-worker-every-minute')
where exists (
  select 1
  from cron.job
  where jobname = 'push-delivery-worker-every-minute'
);

drop function if exists public.invoke_push_delivery_worker();
drop function if exists public.upsert_notification_delivery_jobs(jsonb);
drop function if exists public.cancel_notification_delivery_jobs(uuid[], text);

create or replace function public.archive_recurring_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception '인증된 사용자만 반복 항목을 삭제할 수 있습니다.';
  end if;

  update public.recurring_items
  set is_archived = true
  where id = p_item_id
    and user_id = v_user_id;

  if not found then
    raise exception '반복 항목을 찾을 수 없습니다.';
  end if;
end;
$$;

revoke all on function public.archive_recurring_item(uuid) from public;
revoke all on function public.archive_recurring_item(uuid) from anon;
grant execute on function public.archive_recurring_item(uuid) to authenticated;

drop table if exists public.notification_inbox_items cascade;
drop table if exists public.notification_delivery_attempts cascade;
drop table if exists public.notification_delivery_jobs cascade;
drop table if exists public.device_push_tokens cascade;
