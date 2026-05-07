-- 개발 기간 reset: 앱 정적 wrapping key 기반 content key와 해당 일정 데이터는
-- 서버 측 내용 복구 경계로 마이그레이션하지 않고 삭제한다.
truncate table
  public.completion_logs,
  public.recurring_item_schedule_versions,
  public.recurring_items,
  public.user_content_encryption_keys
restart identity cascade;

alter table public.user_content_encryption_keys
  drop constraint if exists user_content_encryption_keys_wrap_algorithm_check,
  drop constraint if exists user_content_encryption_keys_wrap_metadata_key_source_check,
  add constraint user_content_encryption_keys_wrap_algorithm_check check (
    wrap_algorithm = 'AES-GCM'
  ),
  add constraint user_content_encryption_keys_wrap_metadata_key_source_check check (
    wrap_metadata->>'keySource' = 'edge-secret-v1'
  );

comment on table public.user_content_encryption_keys is
  '일정 제목/설명 content key의 서버 측 복구용 wrapped key. DB table만으로 content key를 복구할 수 없어야 한다.';

comment on column public.user_content_encryption_keys.wrapped_key is
  'Supabase Edge Function secret으로 감싼 content key. 앱 정적 key로 복호화할 수 없어야 한다.';
