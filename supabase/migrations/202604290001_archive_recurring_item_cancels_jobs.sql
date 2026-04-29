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

  update public.notification_delivery_jobs
  set
    cancel_reason = 'item-archived',
    cancelled_at = now(),
    next_retry_at = null,
    status = 'cancelled'
  where user_id = v_user_id
    and item_id = p_item_id
    and status in ('pending', 'retrying');
end;
$$;

revoke all on function public.archive_recurring_item(uuid) from public;
revoke all on function public.archive_recurring_item(uuid) from anon;
grant execute on function public.archive_recurring_item(uuid) to authenticated;
