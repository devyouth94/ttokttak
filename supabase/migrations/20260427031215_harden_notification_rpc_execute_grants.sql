revoke all on function public.invoke_push_delivery_worker() from public, anon, authenticated;
revoke all on function public.upsert_notification_delivery_jobs(jsonb) from public, anon;
revoke all on function public.cancel_notification_delivery_jobs(uuid[], text) from public, anon;

grant execute on function public.upsert_notification_delivery_jobs(jsonb) to authenticated;
grant execute on function public.cancel_notification_delivery_jobs(uuid[], text) to authenticated;
