create index if not exists idx_recurring_items_user_archived_created_at
  on public.recurring_items(user_id, is_archived, created_at desc);

create index if not exists idx_devices_user_active_created_at
  on public.devices(user_id, is_active, created_at desc);

create index if not exists idx_completion_logs_user_item_scheduled_at
  on public.completion_logs(user_id, item_id, scheduled_at_utc desc);

create index if not exists idx_completion_logs_user_item_action_acted_at
  on public.completion_logs(user_id, item_id, action, acted_at_utc desc);

drop index if exists public.idx_recurring_items_user_archived;
drop index if exists public.idx_devices_user_active;
drop index if exists public.idx_completion_logs_item_scheduled_at;
