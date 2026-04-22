create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_push_delivery_worker()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id bigint;
begin
  select net.http_post(
    url := 'https://afsulksejxywonxulary.supabase.co/functions/v1/push-delivery-worker',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'Authorization',
      'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmc3Vsa3Nlanh5d29ueHVsYXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MDgsImV4cCI6MjA5MDYxNzgwOH0.qKbeNQtf7OSvepFleed0wluqkev0nkibRtCtQGFtY1c'
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
