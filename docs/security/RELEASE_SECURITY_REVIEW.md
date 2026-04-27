# 출시 전 보안 게이트

이 문서는 출시 전 보안 취약점을 찾고, 강화 여부를 판단하는 실행 기준이다.
실제 Pass / Fail은 이 문서의 항목을 실행한 뒤 기록한다.

- Seed: `seed_78e57a8f3058`
- Interview: `interview_20260426_054154`
- 범위: Expo / React Native 앱, Supabase Auth / DB / RLS, 원격 푸시, 알림함, 반복 일정 데이터
- 제외: 승인자 지정

## 1. 판정 기준

출시 판단은 아래 세 단계로 분류한다.

| 판정              | 의미                                                                      | 출시 판단                                                             |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 출시 차단         | 계정, 권한, 개인 데이터, token, credential이 노출되거나 우회될 수 있다.   | 수정과 재검증 전까지 출시하지 않는다.                                 |
| 출시 전 수정 권장 | 악용 가능성은 낮지만 사용자 데이터, 운영 안정성, 보안 신뢰에 영향을 준다. | 기본은 출시 전 수정이다. 보류하면 잔여 리스크와 재검증 계획을 남긴다. |
| 출시 후 추적 가능 | 민감정보와 권한 경계에 직접 영향이 없고 완화책이 있다.                    | 출시 후 이슈로 추적할 수 있다.                                        |

강제 규칙:

- 계정 / 세션 우회는 항상 출시 차단이다.
- RLS / DB 사용자 격리 실패는 항상 출시 차단이다.
- service role key, APNs / FCM private key, OAuth secret, Sentry token 노출은 항상 출시 차단이다.
- 알림이 다른 사용자 기기로 발송되거나 다른 사용자 알림함에 저장되면 항상 출시 차단이다.
- 인증, RLS, credential, 푸시 worker 호출 권한을 재검증하지 못하면 출시 차단으로 본다.

## 2. 점검 순서

아래 순서대로 점검한다.
앞 단계에서 출시 차단 항목이 나오면 먼저 수정하고 같은 항목을 재검증한다.

| 순서 | 영역                      | 목표                                                                      | 주요 증빙                                                |
| ---- | ------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1    | 보호 자산 확정            | 어떤 데이터와 credential을 보호할지 확정한다.                             | 이 문서의 자산 목록, `docs/DATABASE.sql`, 출시 후보 빌드 |
| 2    | 계정 / 세션               | 로그인, 세션 복원, 로그아웃, 계정 전환 경계를 확인한다.                   | 계정 A / B 재현 결과, SecureStore / 로그 확인            |
| 3    | Supabase RLS / RPC        | 사용자 간 DB 격리와 RPC 우회 가능성을 확인한다.                           | RLS 정책, A / B row 접근 테스트                          |
| 4    | Edge Function / cron      | service role 경로와 worker 호출 권한을 확인한다.                          | worker 호출 테스트, cron 설정, Edge Function env         |
| 5    | 개인 일정 데이터          | 반복 항목, occurrence, 완료 / 건너뜀 기록의 사용자 범위를 확인한다.       | 홈 / 목록 / 캘린더 / 상세 A / B 테스트                   |
| 6    | 원격 푸시 / 알림함        | token 생명주기, 발송 job, attempt, inbox row를 확인한다.                  | 실제 iOS / Android 푸시, job / attempt / inbox row       |
| 7    | 로컬 저장소 / 로그        | token, 일정 본문, 푸시 payload가 로컬과 원격 로그에 남지 않는지 확인한다. | Sentry event, 콘솔 로그, SecureStore, React Query cache  |
| 8    | 의존성 / 빌드 / 환경 변수 | secret 노출과 알려진 취약점을 확인한다.                                   | `pnpm audit`, `git ls-files`, 출시 빌드 문자열 검색      |

## 3. 보호 자산

출시 전 보안 게이트는 아래 자산을 모두 포함한다.

- 사용자 계정, Supabase session, OAuth provider token
- `profiles`, `devices`, `device_push_tokens`
- `recurring_items`, `recurring_item_schedule_versions`, `completion_logs`
- `notification_delivery_jobs`, `notification_delivery_attempts`
- `notification_inbox_items`
- APNs / FCM token과 provider 응답
- Expo SecureStore, React Query cache, navigation params
- Sentry, Supabase 로그, Edge Function 로그, EAS / CI 로그
- Supabase service role key, APNs / FCM private key, OAuth secret, EAS / CI token
- `package.json`, `pnpm-lock.yaml`, 출시 빌드 산출물

## 4. 자산별 게이트

### 4.1 계정 / 세션

확인 파일:

- `src/lib/supabase.ts`
- `src/features/session/session-provider.tsx`
- `src/features/session/google-sign-in.ts`
- `src/features/session/apple-sign-in.ts`
- `src/lib/sentry.ts`

점검 순서:

1. Supabase session 저장소가 Expo SecureStore인지 확인한다.
2. 로그인, 앱 재시작, 세션 복원, 로그아웃을 실행한다.
3. 같은 기기에서 계정 A 로그아웃 후 계정 B로 로그인한다.
4. 만료된 세션 또는 로그아웃 상태에서 주요 repository 접근이 실패하는지 확인한다.
5. Sentry와 콘솔 로그에 access token, refresh token, provider ID token이 없는지 확인한다.

출시 차단 조건:

- 세션 token이 SecureStore 밖에 저장된다.
- 로그아웃 뒤 이전 사용자 데이터나 token으로 API 호출이 가능하다.
- 계정 B 화면에 계정 A profile, 일정, 알림함 데이터가 남는다.
- Sentry, 콘솔, 문서 증빙에 token 원문이 남는다.

완화 조치:

- session 저장은 SecureStore로 제한한다.
- 로그아웃 시 사용자별 query cache와 화면 상태를 정리한다.
- Sentry `beforeSend`에서 token, Authorization header, push token, 일정 제목 / 본문을 제거한다.
- 세션 만료 오류는 재로그인 또는 세션 정리 흐름으로 보낸다.

재검증 방법:

- 계정 A / B, 로그아웃 상태, 앱 재시작 상태를 모두 반복한다.
- Sentry event와 콘솔 로그를 검색한다.
- 로그아웃 뒤 홈, 목록, 캘린더, 알림함이 이전 사용자 데이터를 보여주지 않는지 확인한다.

### 4.2 Supabase DB / RLS / RPC

확인 파일:

- `docs/DATABASE.sql`
- `supabase/migrations/*.sql`
- `src/lib/database.types.ts`
- `src/features/recurring/repositories/*`
- `src/features/notifications/notification-inbox-repository.ts`

점검 순서:

1. 모든 사용자 데이터 테이블에 RLS가 켜져 있는지 확인한다.
2. select / insert / update / delete policy가 `auth.uid()` 기준인지 확인한다.
3. RPC가 `security invoker`인지 확인한다.
4. RPC 입력의 `p_user_id`, `item_id`, parent row가 현재 사용자와 일치하는지 확인한다.
5. 계정 A token으로 계정 B row 조회 / 생성 / 수정 / 삭제를 시도한다.
6. 로그아웃 상태에서 같은 작업이 실패하는지 확인한다.

출시 차단 조건:

- RLS가 꺼져 있거나 `auth.uid()` 조건이 빠진 테이블이 있다.
- 계정 A가 계정 B row를 읽거나 바꿀 수 있다.
- RPC가 parent row 소유자 검증 없이 다른 사용자 item을 수정한다.
- `notification_delivery_jobs` 또는 `notification_delivery_attempts`를 앱 클라이언트가 임의로 조작할 수 있다.
- service role 경로가 parent row 소유자 검증 없이 사용자 데이터를 처리한다.

완화 조치:

- 모든 사용자 데이터 테이블에 RLS와 `with check`를 적용한다.
- delivery job / attempt 변경은 worker 또는 제한된 RPC로 좁힌다.
- 알림함은 `notification_inbox_items`만 사용자-facing source로 사용한다.
- RPC 내부에서 item 소유자와 `auth.uid()`를 다시 확인한다.

재검증 방법:

- 계정 A / B로 각 테이블의 CRUD 거부 여부를 확인한다.
- RPC에 다른 사용자의 `user_id` 또는 `item_id`를 넣고 실패하는지 확인한다.
- 앱에서 delivery job / attempt를 직접 위조할 수 없는지 확인한다.

### 4.3 개인 일정 / occurrence / 완료 기록

확인 파일:

- `docs/DOMAIN_LOGIC.md`
- `src/features/recurring/repositories/recurring-items-repository.ts`
- `src/features/recurring/repositories/completion-logs-repository.ts`
- `src/features/calendar-view`
- `src/features/recurring/components/recurring-item-detail-screen.tsx`

점검 순서:

1. 반복 항목 원본 row가 현재 사용자 기준으로만 조회되는지 확인한다.
2. schedule version과 occurrence 계산이 현재 사용자 item만 사용하는지 확인한다.
3. 상세 이동 시 `itemId`와 `scheduledAtUtc`가 함께 유지되는지 확인한다.
4. 완료 / 건너뜀 기록이 현재 사용자 item과 occurrence에만 기록되는지 확인한다.
5. 수정 / 삭제 / 보관 이후 화면과 알림 job이 같은 사용자 범위로 재계산되는지 확인한다.

출시 차단 조건:

- 다른 사용자 일정이 홈, 목록, 캘린더, 상세에 보인다.
- `scheduledAtUtc` 누락으로 다른 occurrence 상태가 변경된다.
- 완료 / 건너뜀 기록이 다른 사용자 item에 생성된다.
- 보관 또는 삭제된 item의 future notification job이 남아 발송된다.

완화 조치:

- route와 mutation은 `itemId`와 `scheduledAtUtc`를 함께 검증한다.
- repository query는 `user_id` 조건을 명시한다.
- mutation 후 notification job을 같은 user / item / occurrence 기준으로 다시 동기화한다.
- 보관 / 삭제 시 pending job을 취소한다.

재검증 방법:

- 계정 A / B에 같은 제목과 같은 시간의 반복 항목을 만들고 화면 / mutation을 반복한다.
- 캘린더, 알림함, OS 푸시 tap에서 열린 상세 occurrence가 동일한지 확인한다.
- 완료 / 건너뜀 후 DB row와 화면 상태가 같은 occurrence를 가리키는지 확인한다.

### 4.4 원격 푸시 / 알림함

확인 파일:

- `src/features/notifications/notification-bootstrap.tsx`
- `src/features/notifications/device-push-token-registration.ts`
- `src/features/recurring/repositories/device-push-tokens-repository.ts`
- `src/features/recurring/repositories/notification-delivery-jobs-repository.ts`
- `src/features/notifications/notification-inbox-repository.ts`
- `supabase/functions/push-delivery-worker/index.ts`
- `supabase/migrations/202604160003_remote_push_worker_schedule.sql`
- `supabase/migrations/202604230001_notification_inbox_items.sql`

점검 순서:

1. token 등록, 갱신, 로그아웃, 권한 거부, invalid token 비활성화를 확인한다.
2. worker가 활성 token과 `permission_status = granted`만 대상으로 하는지 확인한다.
3. worker 호출 권한이 cron / 내부 호출로 제한되는지 확인한다.
4. 일반 사용자 JWT 또는 anon JWT로 worker가 due job을 처리할 수 있는지 확인한다.
5. 성공한 provider attempt만 inbox row를 만드는지 확인한다.
6. inbox identity가 `(user_id, item_id, item_scheduled_at_utc)`로 중복을 막는지 확인한다.

출시 차단 조건:

- 일반 사용자 또는 anon JWT가 worker를 호출해 job 처리, attempt 기록, inbox 생성, token 비활성화를 수행할 수 있다.
- 다른 사용자 token으로 푸시가 발송된다.
- 로그아웃 또는 권한 거부 후 token이 발송 대상에 남는다.
- invalid APNs / FCM token이 비활성화되지 않는다.
- 실제 성공 푸시 없이 클라이언트가 inbox row를 만들 수 있다.
- 알림 tap이 다른 사용자 item 또는 다른 occurrence로 이동한다.

완화 조치:

- worker 호출에 별도 내부 secret 또는 cron 전용 검증을 추가한다.
- service role key는 Edge Function env에만 둔다.
- delivery job / attempt 조작은 worker 경로로 제한한다.
- invalid provider 응답은 token 비활성화로 연결한다.
- inbox 생성은 성공 attempt가 있는 worker 경로로만 제한한다.

재검증 방법:

- anon JWT, 일반 사용자 JWT, cron 호출을 분리해서 worker 호출 결과를 확인한다.
- iOS / Android 실기기에서 권한 허용, 권한 거부, 로그아웃, invalid token 상황을 확인한다.
- job / attempt / inbox row가 같은 `user_id`, `item_id`, `item_scheduled_at_utc`를 가리키는지 확인한다.

### 4.5 로컬 저장소 / 캐시 / 로그

확인 파일:

- `src/lib/supabase.ts`
- `src/lib/sentry.ts`
- `src/features/notifications/notification-bootstrap.tsx`
- React Query query key와 로그 출력 코드

점검 순서:

1. SecureStore에 저장되는 값과 일반 저장소에 저장되는 값을 구분한다.
2. 로그아웃과 계정 전환 뒤 React Query cache가 이전 사용자 데이터를 노출하지 않는지 확인한다.
3. 오류 재현 뒤 Sentry event에 민감정보가 없는지 확인한다.
4. Edge Function 로그와 Supabase 로그에 push token, provider payload, 일정 제목 / 본문이 없는지 확인한다.

출시 차단 조건:

- auth token, push token, service credential이 로그 또는 Sentry에 남는다.
- 다른 사용자 일정 제목 / 본문이 cache 또는 로그에 남아 화면에 노출된다.
- 로그 증빙에 token 원문이나 credential 원문을 저장한다.

완화 조치:

- Sentry `beforeSend`에 민감 필드 제거 규칙을 추가한다.
- 로그에는 masked id, provider error code, count만 남긴다.
- 로그아웃 시 사용자별 cache를 제거한다.
- 보안 증빙 문서에는 원문 token이나 credential을 남기지 않는다.

재검증 방법:

- token, push payload, 일정 제목으로 Sentry / 콘솔 / Edge Function 로그를 검색한다.
- 계정 A 로그아웃 후 계정 B에서 홈, 목록, 캘린더, 알림함을 확인한다.
- 오류를 강제로 만들고 새 Sentry event가 마스킹되는지 확인한다.

### 4.6 환경 변수 / 빌드 / 의존성

확인 파일:

- `app.config.ts`
- `.gitignore`
- `docs/security/DEPENDENCY_AUDIT.md`
- `package.json`
- `pnpm-lock.yaml`
- `supabase/config.toml`
- Supabase Edge Function env
- EAS / CI env

점검 순서:

1. public env와 secret env를 분리한다.
2. `.env*.local`, `.google/`, native generated folder, private key 파일이 git에 추적되지 않는지 확인한다.
3. 출시 후보 빌드에 service role key, APNs / FCM private key, OAuth secret이 없는지 검색한다.
4. Edge Function env에 필요한 secret이 있고 앱 클라이언트에는 없는지 확인한다.
5. `pnpm audit --audit-level moderate` 결과를 확인한다.

출시 차단 조건:

- service role key, APNs / FCM private key, OAuth secret, Sentry auth token, EAS / CI token이 git, 앱 번들, 로그에 포함된다.
- `APNS_USE_SANDBOX`와 출시 채널이 맞지 않아 운영 빌드가 sandbox로 발송하거나 반대로 동작한다.
- runtime 또는 build pipeline에 영향을 주는 high / moderate 취약점을 판정하지 않았다.

완화 조치:

- secret은 EAS env 또는 Supabase Edge Function env로 이동한다.
- 노출된 credential은 폐기, 교체, 재배포, 새 빌드 생성을 모두 완료한다.
- audit 항목은 `docs/security/DEPENDENCY_AUDIT.md` 기준으로 runtime / build-time / dev-only로 분류한다.
- 예외는 근거, 검증 결과, 재검토 조건을 남긴다.

재검증 방법:

```bash
git ls-files .env.local .google/google-services.json ios/sentry.properties android/app/google-services.json android/sentry.properties
rg "SERVICE_ROLE|PRIVATE_KEY|APNS|FCM|SENTRY_AUTH|GOOGLE_AUTH|APPLE" . --glob '!node_modules/**' --glob '!ios/**' --glob '!android/**'
pnpm audit --audit-level moderate
```

## 5. 현재 코드 기준 필수 확인 후보

아래 항목은 문서 작성 중 확인된 출시 전 보안 게이트 후보이다.
아직 최종 취약점 판정은 아니며, 재현과 완화 여부를 확인해야 한다.

| ID     | 후보                                   | 확인할 내용                                                                                                                                                 | 기본 판정                            |
| ------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| SEC-01 | `push-delivery-worker` 호출 권한       | `verify_jwt = true`와 cron의 anon JWT 호출 구조에서 일반 사용자 또는 anon JWT가 worker를 호출해 due job을 처리할 수 있는지 확인한다.                        | 처리 가능하면 출시 차단              |
| SEC-02 | delivery job / attempt 클라이언트 조작 | `notification_delivery_jobs`, `notification_delivery_attempts`의 insert / update / delete policy가 앱 클라이언트에서 발송 상태 위조로 이어지는지 확인한다.  | 위조 가능하면 출시 차단              |
| SEC-03 | RLS / RPC 사용자 격리                  | RPC 입력과 parent row 소유자 검증이 계정 A / B 교차 쓰기를 막는지 확인한다.                                                                                 | 실패하면 출시 차단                   |
| SEC-04 | Sentry 마스킹 범위                     | 현재 `beforeSend`는 email 제거만 한다. token, push payload, 일정 제목 / 본문이 남는지 확인한다.                                                             | token / credential 노출은 출시 차단  |
| SEC-05 | 의존성 audit 실패                      | `pnpm audit --audit-level moderate`는 현재 9건을 보고한다. `lodash`, `@xmldom/xmldom`, `uuid`, `postcss` 경로를 runtime / build-time / dev-only로 분류한다. | 미분류 상태면 출시 전 수정 권장 이상 |
| SEC-06 | local secret 파일                      | `.env*.local`, `.google/`, native generated folder, private key 파일이 git과 출시 번들에 없는지 확인한다.                                                   | 노출되면 출시 차단                   |

### SEC-01 / SEC-02 조치 기록

실행일: 2026-04-26
Supabase 적용일: 2026-04-27

| ID     | 정적 확인 결과                                                                                                                                                | 조치                                                                                                                                                                                                                                                                                | 재검증                                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01 | `push-delivery-worker`가 `verify_jwt = true`만 요구하고 내부 호출자를 구분하지 않았다. 기존 cron 호출은 anon JWT만 사용했다.                                  | worker에 `x-push-delivery-worker-secret` 검증을 추가했다. cron 호출 함수는 Supabase Vault의 `push_delivery_worker_anon_key`, `push_delivery_worker_secret`으로 JWT와 내부 secret header를 보낸다.                                                                                   | anon / 일반 사용자 JWT는 내부 secret 없이 401이어야 한다. cron은 Edge Function env `PUSH_DELIVERY_WORKER_SECRET`와 Vault `push_delivery_worker_secret`이 일치할 때만 200이어야 한다. |
| SEC-02 | `notification_delivery_jobs`, `notification_delivery_attempts`의 own row insert / update / delete policy가 앱 클라이언트의 발송 상태 위조로 이어질 수 있었다. | jobs / attempts 직접 쓰기 policy를 제거하고 `anon`, `authenticated`의 insert / update / delete 권한을 회수했다. job 생성 / 취소는 제한 RPC가 `auth.uid()`, 반복 항목 소유자, payload target, 14일 동기화 범위, 허용 상태 전이를 검증한다. attempt와 발송 결과 요약은 worker만 쓴다. | 앱의 job 재계산은 RPC로 성공해야 한다. 직접 REST insert / update / delete는 401 또는 403이어야 한다. attempt 직접 insert / update / delete는 실패해야 한다.                          |

Supabase MCP 적용 결과:

- `release_security_sec01_sec02`: 적용됨
- `harden_notification_rpc_execute_grants`: 적용됨
- `push-delivery-worker`: ACTIVE, `verify_jwt = true`
- `notification_delivery_jobs`, `notification_delivery_attempts`: insert / update / delete policy 0개
- `anon`, `authenticated`: delivery job / attempt / inbox 직접 insert / update / delete grant 0개
- `notification_inbox_items`: authenticated는 `read_at`, `hidden_at` update만 가능
- Vault secret: `push_delivery_worker_anon_key`, `push_delivery_worker_secret` 각 1개 확인
- `invoke_push_delivery_worker`: anon / authenticated 실행 권한 없음

Supabase advisor 잔여 경고:

- `upsert_notification_delivery_jobs`, `cancel_notification_delivery_jobs`는 authenticated 실행 권한이 있는 `security definer` 함수로 표시된다.
- 두 RPC는 앱의 발송 job 재계산 경로라 authenticated 실행 권한을 유지한다.
- 내부에서 `auth.uid()`, 반복 항목 소유자, payload target, 14일 동기화 범위, 허용 상태 전이를 검증한다.
- anon 실행 권한은 회수했다.

### SEC-03 조치 기록

실행일: 2026-04-27
Supabase 적용일: 2026-04-27

| ID     | 정적 확인 결과                                                                                                                                                                                                                                                                                                           | 조치                                                                                                                                                                                               | 재검증                                                                                                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-03 | `upsert_notification_delivery_jobs`, `cancel_notification_delivery_jobs`는 `auth.uid()`와 parent `recurring_items` 소유자를 확인했다. 다만 `recurring_item_schedule_versions`, `completion_logs`의 RLS는 `user_id = auth.uid()`만 확인해 REST 직접 호출에서 타 사용자 `item_id`를 참조한 child row 삽입 가능성이 있었다. | `recurring_item_schedule_versions`, `completion_logs`의 select / insert / update / delete policy에 parent `recurring_items.id = item_id`와 `recurring_items.user_id = auth.uid()` 검증을 추가했다. | Supabase MCP 트랜잭션 검증에서 child RLS 5/5, delivery job / attempt / RPC 12/12, payload / cancel reason 2/2, inbox RLS / column grant 4/4 통과. `anon`은 `upsert_notification_delivery_jobs`, `cancel_notification_delivery_jobs` 실행 권한 없음. |

Supabase MCP 적용 결과:

- `harden_recurring_child_rls_parent_owner`: 적용됨
- `recurring_item_schedule_versions`: 현재 사용자 parent item row만 select / insert / update / delete 가능
- `completion_logs`: 현재 사용자 parent item row만 select / insert / update / delete 가능
- `upsert_notification_delivery_jobs`: 타 사용자 item, dedupe user mismatch, payload target mismatch 거부 확인
- `cancel_notification_delivery_jobs`: 타 사용자 job id를 넣어도 row 변경 없음, 완료 job은 취소하지 않음
- `notification_delivery_jobs`, `notification_delivery_attempts`: 직접 insert / update 거부 확인
- `notification_inbox_items`: 타 사용자 row 숨김 실패, `title` 등 본문 컬럼 update 거부 확인
- `anon`: delivery job RPC 실행 권한 없음

### SEC-04 조치 기록

실행일: 2026-04-27
Supabase 적용일: 2026-04-27

| ID     | 정적 확인 결과                                                                                                                                                                                                                                                                           | 조치                                                                                                                                                                                                                                                                                                                                                                                                           | 재검증                                                                                                                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-04 | Sentry `beforeSend`가 email만 제거했다. worker 응답은 `attempts` 배열을 그대로 반환해 push token, provider response payload가 pg_net 응답 저장소나 Edge Function 응답 로그에 남을 수 있었다. `notification_delivery_attempts`도 원문 `push_token`, provider response payload를 저장했다. | Sentry event sanitizer를 추가해 token, credential, Authorization header, push payload, provider payload, 일정 제목 / 본문 계열 필드를 마스킹한다. `push-delivery-worker`는 job별 status, token count, attempt status count만 반환하고 500 응답은 `internal-error`로 고정한다. attempt log는 원문 token 대신 `push_token_ref`를 저장하고 provider response payload는 status / code / HTTP status 요약만 남긴다. | sanitizer 단위 테스트로 token, Authorization header, email, push payload, 일정 제목 / 본문 마스킹을 확인했다. worker 응답은 `attemptCounts`, `jobId`, `status`, `tokenCount`만 포함하도록 정적 확인했다. |

Supabase MCP 적용 결과:

- `redact_notification_attempt_logs`: 적용됨
- `push-delivery-worker`: ACTIVE, version 10
- `notification_delivery_attempts.push_token` 제거, `push_token_ref`로 대체 확인
- unique constraint는 `(job_id, push_token_ref, attempt_number)` 기준 확인
- 기존 attempt row의 미마스킹 token 참조값 0건 확인
- 기존 attempt row의 non-empty `response_payload` 0건 확인

### SEC-05 조치 기록

실행일: 2026-04-27

| ID     | 정적 확인 결과                                                                                                                                                       | 조치                                                                                                                                 | 재검증                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-05 | `pnpm audit --audit-level moderate`는 9건을 보고했다. `lodash`는 `react-native-calendars` 런타임 경로와 `jest-expo` 경로에 있었고, 나머지는 Expo/Jest 도구 경로였다. | `pnpm.overrides`로 `lodash@4.18.1`, `@xmldom/xmldom@0.8.13`, `postcss@8.5.12`를 고정해 high 5건과 `postcss` moderate 1건을 제거했다. | `pnpm audit --audit-level moderate` 잔여는 `uuid` 1건이다. `pnpm audit --audit-level low` 잔여는 `uuid` 1건, `@tootallnate/once` 1건이다. |

운영 기준:

- 반복 운영 기준은 `docs/security/DEPENDENCY_AUDIT.md`를 따른다.

Audit 분류:

- `lodash`: runtime. `react-native-calendars`가 앱 캘린더 화면에서 사용된다. `4.18.1`로 업데이트 완료.
- `@xmldom/xmldom`: build-time. Expo config / plist / prebuild 도구 경로다. `0.8.13`으로 업데이트 완료.
- `postcss`: build-time. Expo Metro config 경로다. `8.5.12`로 업데이트 완료.
- `uuid`: build-time. Expo config plugin의 `xcode@3.0.1` 경로다. `xcode`는 현재 최신이고 `uuid@14`는 ESM-only라 CommonJS `require('uuid')`와 호환 리스크가 있다. 실제 `xcode` 사용 지점은 `uuid.v4()` 1곳으로, advisory의 v3 / v5 / v6 buffer write 경로와 다르다. Expo / xcode upstream 업데이트 전까지 잔여 예외로 둔다.
- `@tootallnate/once`: dev-only. `jest-expo` / jsdom / `http-proxy-agent` 테스트 경로다. low severity이며 `pnpm audit --audit-level moderate`에는 포함되지 않는다.

로컬 검증 결과:

- `npx expo config --json`: 통과
- `npx expo export --platform android --output-dir /tmp/ttokttak-export-android --clear`: 통과
- `npx expo export --platform ios --output-dir /tmp/ttokttak-export-ios --clear`: 통과
- `pnpm jest --runInBand`: 17 suites / 99 tests 통과
- `npx tsc --noEmit`: 통과
- `pnpm lint`: 통과
- `git diff --check`: 통과

배포 전 운영 설정:

```sql
select vault.create_secret('<supabase anon key>', 'push_delivery_worker_anon_key');
select vault.create_secret('<PUSH_DELIVERY_WORKER_SECRET와 같은 값>', 'push_delivery_worker_secret');
```

Edge Function env:

- `PUSH_DELIVERY_WORKER_SECRET`: 위 Postgres 설정과 같은 값

## 6. 강화 작업 순서

보안 강화는 아래 순서로 진행한다.

1. `push-delivery-worker` 호출 권한을 검증하고 필요하면 내부 secret 검증을 추가한다.
2. delivery job / attempt 테이블의 클라이언트 변경 가능 범위를 줄인다.
3. RLS와 RPC를 계정 A / B 테스트로 검증한다.
4. Sentry와 로그 마스킹을 강화한다.
5. 로그아웃 / 권한 거부 / invalid token 이후 token 비활성화를 재검증한다.
6. dependency audit 결과를 분류하고 업데이트 또는 예외 근거를 남긴다.
7. 전체 QA 체크리스트에서 보안 관련 시나리오를 다시 실행한다.

## 7. 실행 기록 양식

보안 게이트 실행 결과는 아래 형식으로 기록한다.

```md
### 실행 기록

- 실행일:
- 앱 빌드:
- Supabase 프로젝트:
- iOS 기기:
- Android 기기:
- 계정 A:
- 계정 B:
- 실행자:

| ID     | 자산        | 결과   | 증빙 | 판정 | 수정 여부 | 재검증 |
| ------ | ----------- | ------ | ---- | ---- | --------- | ------ |
| SEC-01 | push worker | 미실행 |      |      |           |        |
```

## 8. 완료 기준

출시 전 보안 게이트는 아래 조건을 모두 만족해야 완료다.

- 보호 자산별 점검 순서가 실행되었다.
- 보호 자산별 확인 방법과 증빙이 남아 있다.
- 출시 차단 항목이 모두 수정되고 재검증되었다.
- 출시 전 수정 권장 항목은 수정했거나 보류 사유와 추적 계획이 있다.
- 계정 / 세션과 RLS / DB 접근 권한은 계정 A / B와 로그아웃 상태로 재검증되었다.
- 원격 푸시는 iOS / Android 실기기에서 권한 허용, 권한 거부, 로그아웃, 알림 tap까지 확인되었다.
- `pnpm audit --audit-level moderate` 결과가 업데이트 또는 예외 근거와 함께 정리되었다.
- secret이 git, 앱 번들, Sentry, Edge Function 로그, EAS / CI 로그에 없음을 확인했다.
