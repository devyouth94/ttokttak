revoke all privileges on table public.user_content_encryption_keys
from anon, authenticated;

grant select, insert, update on table public.user_content_encryption_keys
to authenticated;
