drop policy if exists "schedule_versions_select_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_select_own"
on public.recurring_item_schedule_versions
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "schedule_versions_insert_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_insert_own"
on public.recurring_item_schedule_versions
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "schedule_versions_update_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_update_own"
on public.recurring_item_schedule_versions
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "schedule_versions_delete_own" on public.recurring_item_schedule_versions;
create policy "schedule_versions_delete_own"
on public.recurring_item_schedule_versions
for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = recurring_item_schedule_versions.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "completion_logs_select_own" on public.completion_logs;
create policy "completion_logs_select_own"
on public.completion_logs
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "completion_logs_insert_own" on public.completion_logs;
create policy "completion_logs_insert_own"
on public.completion_logs
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "completion_logs_update_own" on public.completion_logs;
create policy "completion_logs_update_own"
on public.completion_logs
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
);

drop policy if exists "completion_logs_delete_own" on public.completion_logs;
create policy "completion_logs_delete_own"
on public.completion_logs
for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.recurring_items
    where recurring_items.id = completion_logs.item_id
      and recurring_items.user_id = auth.uid()
  )
);
