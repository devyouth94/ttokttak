create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_push_delivery_worker()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anon_key text;
  v_request_id bigint;
begin
  v_anon_key := current_setting('app.settings.push_delivery_worker_anon_key', true);

  if coalesce(v_anon_key, '') = '' then
    raise exception 'app.settings.push_delivery_worker_anon_key 설정이 필요합니다.';
  end if;

  select net.http_post(
    url := 'https://afsulksejxywonxulary.supabase.co/functions/v1/push-delivery-worker',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'Authorization',
      'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'trigger',
      'pg_cron',
      'invoked_at',
      now()
    ),
    timeout_milliseconds := 60000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

select cron.schedule(
  'push-delivery-worker-every-minute',
  '* * * * *',
  $$ select public.invoke_push_delivery_worker(); $$
);
