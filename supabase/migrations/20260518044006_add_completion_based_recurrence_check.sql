alter table public.recurring_item_schedule_versions
  drop constraint if exists recurring_item_schedule_versions_completion_based_recurrence_check,
  add constraint recurring_item_schedule_versions_completion_based_recurrence_check check (
    anchor_type <> 'completion_based'
    or recurrence_type in ('daily', 'interval_days', 'monthly', 'interval_months')
  ) not valid;
