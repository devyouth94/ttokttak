alter table public.recurring_item_schedule_versions
  drop constraint if exists recurring_item_schedule_versions_recurrence_type_check,
  add constraint recurring_item_schedule_versions_recurrence_type_check check (
    recurrence_type in (
      'once',
      'daily',
      'interval_days',
      'weekly',
      'interval_weeks',
      'monthly',
      'interval_months'
    )
  );
