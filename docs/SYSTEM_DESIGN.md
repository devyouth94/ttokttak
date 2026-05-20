# System Design

이 문서는 현재 코드의 구현 구조와 데이터 흐름만 설명한다.
제품 범위는 `PRODUCT_SPEC.md`, 도메인 계산 규칙은 `DOMAIN_LOGIC.md`를 따른다.

## Stack

- Expo.
- React Native.
- Expo Router.
- Expo Updates.
- TypeScript.
- React Hook Form.
- Zod.
- TanStack Query.
- Supabase Auth.
- Supabase Postgres.
- Supabase Edge Functions.
- Expo Notifications.
- Expo SecureStore.
- Expo Crypto.
- date-fns / date-fns-tz.
- Sentry.

## Architecture

현재 앱은 기능 단위 모듈과 얇은 repository 계층을 사용한다.

### Presentation

- `app`: Expo Router route.
- `src/application`: provider, bootstrap, session wiring, route params wiring.
- `src/screens/home`: 홈 피드 화면, 섹션 view model, 화면 controller.
- `src/screens/schedule-list`: 일정 목록 화면, 정렬, empty/loading/error 상태.
- `src/screens/calendar`: 캘린더 화면, 월 상태, 날짜별 일정 표시.
- `src/screens/schedule-detail`: 일정 상세 화면, 요약, 히스토리, 보관 진입점.
- `src/screens/schedule-create`: 일정 생성 route-facing 화면.
- `src/screens/schedule-edit`: 일정 수정 route-facing 화면.
- `src/screens/schedule-form`: 생성/수정이 공유하는 form 화면 구현.
- `src/screens/login`: 로그인 화면.
- `src/screens/settings`: 설정 화면.
- `src/shared/ui`: 공통 텍스트, 화면, 카드, 버튼, token.

### Application

- 화면 controller hook이 query, mutation, navigation, 알림 후속 처리를 조합한다.
- React Query가 서버 데이터 조회와 무효화를 담당한다.
- mutation 성공 뒤에는 관련 query를 무효화하고 로컬 알림을 다시 맞춘다.

### Domain

- `src/entities/schedule/model`: 일정 타입, 반복 규칙, occurrence 계산, occurrence projection, validation, 수정 정책.
- `src/entities/schedule/lib`: 일정 날짜, 시간, 반복 규칙 표시 helper.
- `src/entities/schedule/api`: 일정 persistence, Supabase row mapping, RPC 호출, 일정 내용 암복호화 fallback.
- `src/entities/schedule/ui`: 일정 색상 표시와 일정 요약 row.
- `src/entities/profile`: profile 복원과 표시 이름 저장.
- `src/features/create-schedule`: 일정 생성 use case.
- `src/features/update-schedule`: 일정 수정 use case.
- `src/features/archive-schedule`: 일정 보관 use case.
- `src/features/home-feed-occurrence-action`: 홈 피드의 완료와 건너뛰기 use case.
- `src/features/sign-in`: Apple/Google 로그인 use case와 provider adapter.
- `src/features/delete-account`: 계정 삭제 use case와 Apple 계정 삭제 재인증 adapter.
- `src/features/sync-local-notifications`: 기기 로컬 알림 예약, 재동기화 정책, lifecycle.
- `src/features/notifications`: 알림 권한 context와 알림 tap payload 판정.
- `src/features/recurring/model`: 일정 mutation 이후 query 무효화와 로컬 알림 재동기화 후속 흐름.
- 도메인 함수는 Supabase client 모양을 알지 않는다.

### Infrastructure

- `src/shared/lib/notifications`: Expo Notifications adapter, 알림 권한 adapter, 로컬 reminder identifier/payload helper.
- `src/shared/lib/privacy`: AES-GCM primitive, content key 저장/복구 helper, content key 복구 저장소, privacy 공통 helper.
- `src/shared/api`: Supabase client와 schema type.
- `src/shared/config`: Sentry 같은 app-level 외부 도구 설정.
- `src/shared/lib/*`: QueryClient, error helper, privacy sanitizer 같은 공통 기반 lib.

## Routing

하단 탭은 홈, 목록, 캘린더, 설정으로 구성한다.
상세, 생성, 수정은 하단 탭을 숨기는 집중 화면이다.

주요 route:

- `/`: 로그인 또는 인증 후 홈 redirect.
- `/(tabs)/home`: 홈.
- `/(tabs)/schedule`: 일정 목록.
- `/(tabs)/calendar`: 캘린더.
- `/(tabs)/settings`: 설정.
- `/items/new`: 일정 생성.
- `/items/[itemId]`: 일정 상세.
- `/items/[itemId]/edit`: 일정 수정.

## Source Of Truth

Supabase Postgres가 서버 데이터의 최종 기준이다.
클라이언트는 서버 row를 읽고, 화면에 필요한 occurrence를 런타임에서 계산한다.

저장하지 않는 값:

- occurrence row.
- 홈 섹션 row.
- 달력 marker row.
- 로컬 알림 예약 metadata row.

기기 로컬 알림은 현재 기기 OS에 예약된 파생 상태다.
알림 예약은 source of truth가 아니다.

## Update Delivery

앱은 `expo-updates`와 EAS Update를 사용한다.
production 빌드는 `production` channel을 사용한다.
preview 빌드는 `preview` channel을 사용한다.
`runtimeVersion`은 `appVersion` 정책을 사용한다.

같은 앱 버전과 runtime 안에서는 JS와 asset 변경을 OTA로 받을 수 있다.
네이티브 코드, 권한, entitlements, native dependency 변경은 새 스토어 빌드가 필요하다.
현재 OTA 운영 대상은 iOS와 Android다.
web export는 운영 대상이 아니므로 EAS Update는 플랫폼별로 발행한다.

## Data Model

현재 주요 table은 다음과 같다.

- `profiles`: 사용자 timezone과 앱 표시 이름.
- `recurring_items`: 일정 메타, 보관 여부, 색상, 암호화된 제목/설명.
- `recurring_item_schedule_versions`: 반복 규칙 version.
- `completion_logs`: occurrence 처리 기록.
- `user_content_encryption_keys`: content key 복구용 wrapped key.
- `content_key_recovery_audit_events`: 서버 측 내용 복구 호출 감사 이벤트.

기준 스키마에는 원격 푸시용 `device_push_tokens`, `notification_delivery_jobs`, `notification_delivery_attempts`, `notification_inbox_items`를 두지 않는다.

## Auth And Session

Supabase Auth를 사용한다.
세션은 `expo-secure-store` 기반 Supabase auth storage에 보존한다.

세션 복원 시 profile을 확인한다.
profile이 없으면 현재 기기 timezone과 provider metadata 이름으로 생성한다.
사용자가 설정에서 수정한 표시 이름은 provider metadata로 덮어쓰지 않는다.

### Account Deletion

로그인된 사용자의 계정 삭제는 JWT 검증이 켜진 `delete-account` Supabase Edge Function에서 처리한다.
클라이언트는 service role key를 절대 보유하지 않는다.

처리 흐름:

1. 앱은 사용자 확인 UI를 거친 뒤 Edge Function을 호출한다.
2. Apple 계정이면 앱은 삭제 직전에 Apple 재인증을 요청하고 authorization code를 Edge Function에 전달한다.
3. Edge Function은 현재 JWT로 사용자 id와 provider를 확인한다.
4. Edge Function은 Apple 계정인데 authorization code가 없으면 삭제를 거부한다.
5. Apple authorization code가 있으면 Edge Function이 Apple token revoke를 먼저 처리하고 Apple identity 일치를 확인한다.
6. Edge Function은 service role 권한으로 Supabase Auth user를 삭제한다.
7. `auth.users` 삭제는 `profiles`와 사용자 데이터의 cascade 삭제를 발생시킨다.
8. 앱은 로컬 세션과 현재 기기의 Ttokttak 로컬 알림을 정리한다.

계정 삭제 실패 응답은 내부 삭제 단계나 service role key 경계를 노출하지 않는다.
앱은 세션 없음 또는 만료만 별도 안내하고, 그 외 실패는 단순 실패 안내로 표시한다.

Apple token revoke에 필요한 Team ID, Key ID, Client ID, private key는 Edge Function secret으로만 관리한다.
클라이언트는 Apple private key나 service role key를 절대 보유하지 않는다.

공개 웹의 계정 삭제 요청은 로그인할 수 없는 사용자를 위한 접수 경로다.
해당 요청은 자동 삭제가 아니라 운영 확인 뒤 처리한다.

## Recurring Item Flow

### Create

1. form 입력을 검증한다.
2. 제목과 설명을 암호화한다.
3. `create_recurring_item_with_initial_version` RPC로 item과 초기 schedule version을 함께 만든다.
4. 기기 로컬 알림을 전체 재동기화한다.
5. query를 무효화한다.

### Update

1. 기존 item과 schedule version을 읽는다.
2. 수정 정책으로 메타 변경과 규칙 변경을 구분한다.
3. 제목과 설명을 다시 암호화한다.
4. `update_recurring_item_with_edit_policy` RPC로 item을 갱신한다.
5. 규칙 변경이면 새 schedule version을 추가한다.
6. 기기 로컬 알림을 전체 재동기화한다.
7. query를 무효화한다.

### Archive

삭제 UX는 `archive_recurring_item` RPC로 `is_archived = true`를 저장한다.
보관 후 기기 로컬 알림을 전체 재동기화하고 query를 무효화한다.

### Complete / Skip

홈 피드 occurrence 처리 feature는 `completion_logs`에 기록을 만든다.
지난 일정 action은 이전 미해결 overdue occurrence도 함께 기록할 수 있다.
기록 후 query를 무효화하고 로컬 알림을 다시 맞춘다.

completion log 조회는 화면이나 후속 계산에 필요한 범위로 제한한다.
상세 화면의 최근 히스토리는 최신 5건만 표시한다.
MVP는 전체 completion log 탐색이나 무한 스크롤을 제공하지 않는다.
`completion_based` 일정의 다음 occurrence 계산에는 표시 범위 이전의 최신 완료 기록 1건을 별도 anchor로 사용할 수 있다.
탭 루트는 홈 피드, 일정 목록, 캘린더 같은 projection 목적을 넘긴다.
화면의 날짜 상태는 profile timezone을 기준으로 만든다.
반복 기능 hook이 active 일정 조회, completion log 조회 조건, query 상태를 함께 맞춘다.
화면별 섹션, 정렬, marker 구성은 각 화면 feature helper가 맡는다.

### 종료일 정책

종료일은 schedule version의 `endDateLocal`로 저장한다.
종료일이 있으면 occurrence local date가 종료일보다 늦은 occurrence는 만들지 않는다.
한 번 일정은 종료일을 갖지 않는다.
종료일은 nullable이며, 기존 일정과 종료일이 없는 반복 일정은 null을 유지한다.
종료일 변경은 규칙 변경으로 처리한다.
종료일 변경은 수정 시점 이후 occurrence에만 적용하고 과거 completion log를 다시 쓰지 않는다.
`completion_based` 일정도 완료한 날짜가 아니라 occurrence local date 기준으로 종료일을 적용한다.
anchor 조회는 화면 히스토리 조회와 섞지 않는다.

일정 목록은 MVP에서 active 일정 최대 500개를 조회한다.
500개를 넘는 사용자를 위한 검색과 페이지네이션은 후속 범위로 둔다.

조회 인덱스는 필터, 정렬, limit 패턴을 함께 기준으로 둔다.
일정 목록은 `user_id`, `is_archived`, `created_at desc` 순서를 기준으로 조회한다.
completion log 최신 히스토리는 `user_id`, `item_id`, `scheduled_at_utc desc` 순서를 기준으로 조회한다.
`completion_based` anchor 조회는 `user_id`, `item_id`, `action`, `acted_at_utc desc` 순서를 기준으로 조회한다.

## Content Privacy

일정 제목과 설명은 앱에서 AES-GCM으로 암호화한다.
암호화 key는 사용자별 content key다.

content key 흐름:

1. 앱은 content key를 생성하거나 SecureStore에서 읽는다.
2. 서버 복구를 위해 content key를 Edge Function secret으로 wrap한다.
3. wrapped key는 `user_content_encryption_keys`에 저장한다.
4. 새 기기에서 SecureStore key가 없으면 Edge Function으로 content key를 복구한다.
5. 복구된 key는 다시 SecureStore에 저장한다.

제한:

- 서버 DB table만으로 제목과 설명 평문을 복구할 수 없어야 한다.
- Edge Function은 content key만 wrap/recover하고 제목/설명 ciphertext를 복호화하지 않는다.
- strict E2EE는 아니다. 서버 실행 경계가 악의적이면 복구 순간 평문 접근 가능성이 있다.

복구 감사:

- `recover-content-key`는 호출 결과를 `content_key_recovery_audit_events`에 남긴다.
- 감사 이벤트는 user, action, key version, 낮은 해상도 result만 저장한다.
- 감사 이벤트는 제목, 설명, ciphertext, wrapped key, content key, exception message를 저장하지 않는다.
- 감사 이벤트 table은 authenticated 사용자에게 직접 조회 권한을 주지 않는다.

복호화 실패:

- 목록에서 일정은 숨기지 않는다.
- 제목은 복구 실패 fallback 문구로 표시한다.
- 설명은 비워 둔다.
- 상세 화면은 복구 실패 안내와 삭제 동작을 제공한다.
- 로컬 알림 예약 대상에서는 제외한다.

## Local Notifications

알림은 Expo Notifications 기반 기기 로컬 알림이다.
서버 원격 푸시는 사용하지 않는다.
추후 필요하면 별도 작업으로 설계한다.

예약 조건:

- OS 알림 권한이 `granted`.
- 일정이 보관되지 않음.
- 일정의 `notificationsEnabled`가 true.
- 일정 내용이 복구 불가 상태가 아님.
- occurrence 상태가 `scheduled`.
- occurrence local date가 종료일 이하이거나 종료일이 없음.

예약 범위:

- 기본 범위는 현재부터 30일이다.
- 각 일정의 다음 occurrence는 30일 밖이어도 후보에 추가한다.
- pending notification 상한은 코드 기준 60개다.
- 상한에 가까우면 예정 시각이 가까운 후보를 우선한다.

identifier:

```txt
ttokttak:reminder:{userId}:{itemId}:{scheduledAtUtc}
```

payload:

- `notificationKind = "reminder"`.
- `source = "recurring-item"`.

표시 content:

- title: 복호화한 일정 제목.
- body: 사용자 timezone 기준 예정 시각.
- 설명은 알림에 넣지 않는다.

## Notification Lifecycle

전체 재동기화 trigger:

- 세션 복원.
- 앱 foreground 복귀.
- 알림 tap.

범위 재동기화 trigger:

- 일정 생성.
- 일정 수정.
- 일정 보관.
- occurrence 완료.
- occurrence 건너뛰기.

세션이 없으면 알림 tap 동기화를 보류한다.
로그아웃 또는 세션 없음 상태가 되면 현재 기기의 Ttokttak 로컬 알림을 모두 취소한다.
취소 실패는 Sentry에 기록하되 로그아웃 자체를 막지 않는다.

## Notification Tap Routing

알림 tap은 payload를 검증한 뒤 `/home`으로 이동한다.
지원하지 않는 payload는 navigation을 수행하지 않는다.

## Security And Observability

앱 번들에는 `EXPO_PUBLIC_*` public env만 포함한다.
service role key, private key, OAuth client secret, Sentry auth token은 앱 번들에 넣지 않는다.

Sentry event는 민감한 field를 마스킹한다.
제목, 설명, token, secret, authorization, email, payload 계열 값은 기록 전에 필터링한다.

Edge Function secret은 Supabase 서버 실행 환경에만 둔다.
`recover-content-key`와 `delete-account`는 JWT 검증을 켠 상태로 배포한다.
두 함수는 인증된 `POST` 호출만 처리하고 응답에는 `Cache-Control: no-store`를 둔다.

민감 Edge Function에는 공개 health check endpoint를 만들지 않는다.
native 앱 호출 기준이므로 CORS `OPTIONS` 응답과 origin allowlist는 MVP에서 구현하지 않는다.
Expo web 또는 공개 웹 자동 처리 요구가 생기면 CORS를 별도 범위로 추가한다.

`recover-content-key`는 persistent 감사 이벤트와 사용자별 best-effort rate limit을 가진다.
`delete-account`는 사용자별 best-effort rate limit을 가진다.
두 rate limit은 Edge Function instance 메모리 기준이며 분산 전역 제한은 아니다.
분산 제한이 필요하면 Redis 같은 외부 저장소 기반 제한을 별도 강화 범위로 둔다.

## Operational Data Protection

Supabase Postgres 백업은 출시 전 운영 확인 대상이다.
운영 프로젝트는 자동 백업이 켜져 있어야 한다.

PITR(Point-in-Time Recovery, 특정 시점 복구)은 권장 설정이다.
PITR을 유료 기능으로만 사용할 수 있으면 첫 출시는 PITR 없이 진행할 수 있다.
이 경우 Supabase Dashboard에서 최신 자동 백업 상태와 보존 기간을 확인한다.

출시 전 확인 기록에는 다음을 남긴다.

- 확인 일시.
- Supabase project ref.
- 자동 백업 상태.
- 백업 보존 기간.
- PITR 사용 여부.
- PITR 미사용 사유.

## Testing Guardrails

현재 테스트는 다음 회귀를 확인한다.

- 반복 규칙과 occurrence 계산.
- 일정 수정 정책.
- repository mapping.
- 홈 occurrence action flow.
- 로컬 알림 예약과 lifecycle.
- 알림 tap routing.
- 원격 푸시 코드 경로 없음.
- content key 복구 정적 key 없음.
- 복구 감사 이벤트의 민감 정보 저장.
