# System Design

## 1. Technical Overview

이 문서는 `PRODUCT_SPEC.md`에서 정의한 제품 범위와 용어를 구현 관점으로 풀어낸다.
제품 정의와 MVP 포함/제외 범위의 기준 서술은 `PRODUCT_SPEC.md`를 따른다.
반복 계산, 상태 판정, 알림 동기화 절차의 상세 규칙은 `DOMAIN_LOGIC.md`를 따른다.
구현 순서와 사용자 검토 단위는 `IMPLEMENTATION_PLAN.md`를 따른다.

### Stack

- Expo
- React Native
- TypeScript
- Expo Router
- Zustand
- React Hook Form
- Zod
- Supabase Auth
- Supabase Postgres
- Expo Notifications
- date-fns
- Sentry

### Strategy summary

- 서버 중심 구조
- 오프라인 제한
- 사용자 timezone 기반 로컬 입력/표시
- UTC 저장
- occurrence는 저장하지 않고 계산
- 가까운 14일 범위만 원격 푸시 발송 job 생성
- 멀티 디바이스 확장 가능한 모델

### Terminology baseline

- `recurring item`, `occurrence`, `completion log`, `anchor type`은 `PRODUCT_SPEC.md`의 정의를 그대로 사용한다.
- 이 문서는 각 용어의 구현 방식과 제약만 추가로 설명한다.

---

## 2. High-level Architecture

### Document focus

- 이 문서는 시스템 구조, 계층 책임, 핵심 구성요소, 데이터 흐름을 설명한다.
- 화면 목적과 사용자 시나리오는 `PRODUCT_SPEC.md`를 따른다.
- 도메인 규칙의 세부 알고리즘은 `DOMAIN_LOGIC.md`를 따른다.

### Layers

1. **Presentation**
   - screens
   - widgets input shaping
   - form state
2. **Application**
   - use cases
   - query orchestration
   - mutation flows
3. **Domain**
   - recurrence calculation
   - occurrence derivation
   - status resolution
   - next occurrence logic
4. **Infrastructure**
   - Supabase repositories
   - notification bootstrap
   - remote push delivery worker
   - timezone utils
   - auth/session
   - logging/monitoring

### Core components

- **Auth/session**
  - 로그인 상태 복원
  - 현재 사용자와 현재 기기 식별
- **Repositories**
  - recurring item 메타, schedule versions, completion logs, devices, device push token 조회/저장
- **Domain services**
  - recurrence calculation
  - occurrence derivation
  - status resolution
  - next occurrence logic
- **Notification bootstrap**
  - 알림 권한 상태 확인
  - 현재 기기 원격 푸시 토큰 등록/비활성화
  - mutation 이후 서버 발송 job 재계산 요청
- **Remote push delivery worker**
  - future occurrence 기준 발송 job upsert
  - APNs / FCM fan-out 발송
  - token 단위 성공/실패 기록
- **Presentation surfaces**
  - 홈, 목록, 상세, 달력, 설정, 위젯에 필요한 파생 데이터를 조합

### Data flow overview

1. 사용자가 항목을 생성/수정/완료/건너뜀한다.
2. mutation은 서버에 item 메타, schedule version, completion log를 저장한다.
3. 저장된 데이터와 사용자 timezone을 기준으로 occurrence를 다시 계산한다.
4. 계산 결과로 홈/목록/상세/달력/위젯에 필요한 파생 목록을 만든다.
5. 알림이 필요한 occurrence만 서버 발송 job으로 다시 맞춘다.

핵심 원칙:

- 서버 row가 원본 데이터다.
- occurrence와 화면 목록은 저장하지 않고 계산한다.
- 원격 푸시 발송 job은 계산 결과를 반영하는 파생 상태다.

전제조건:

- 현재 사용자 세션이 복원되어 있어야 한다.
- 사용자 timezone이 설정되어 있어야 한다.
- mutation과 조회는 서버 기준 최신 row를 다시 읽을 수 있어야 한다.

예상 예외:

- network error
- auth expired
- invalid recurrence config
- server mutation conflict-like race

후속 액션:

- mutation 성공 후 서버 기준 파생 목록을 다시 조회한다.
- 홈, 목록, 상세, 달력, 위젯은 재계산 결과를 다시 반영한다.
- 알림이 켜진 항목은 서버 발송 job을 다시 계산한다.

---

## 3. Source of Truth

### Server

Supabase Postgres를 데이터의 최종 source of truth로 사용한다.

### Client

클라이언트는 서버 데이터를 조회하고 변경한다. 완전한 오프라인 일관성은 목표가 아니다.

### Notifications

알림 자체는 source of truth가 아니다. DB 기준으로 occurrence를 다시 계산하고, 그 결과에 따라 원격 푸시 발송 대상을 다시 맞춘다.

---

## 4. Data Model Overview

### Core entities

- users / profiles
- devices
- device_push_tokens
- recurring_items
- recurring_item_schedule_versions
- completion_logs

### Derived concepts

- occurrence
- today list
- upcoming list
- overdue list
- calendar day summaries

occurrence는 테이블로 저장하지 않고 런타임에서 계산한다.

---

## 5. Recurrence Model

### Supported recurrence types

- once
- daily
- interval_days
- weekly
- interval_weeks
- monthly
- interval_months
- yearly

### Schedule anchor type

- `fixed`
- `completion_based`

### Why anchor type exists

같은 “3개월마다”라도 의미가 다를 수 있기 때문이다.

예:

- 고정형 일정: 일정표 자체가 기준
- 교체형 일정: 실제 완료한 날짜가 기준

기본값은 `fixed`이고, 필요하면 `completion_based`를 활성화할 수 있다.
MVP에서는 `completion_based`를 `once`, `daily`, `interval_days`, `monthly`, `interval_months`, `yearly`에만 연다.
`weekly`, `interval_weeks`는 사용자 기대가 요일 패턴에 고정되기 쉬워 MVP에서는 `fixed`만 지원한다.

---

## 6. Occurrence Computation

Occurrence는 아래 입력을 기반으로 계산한다.

- recurrence type
- interval
- weekday mask or weekly rule
- start date local
- reminder time local
- anchor type
- last completion log
- current user's timezone

### Important rule

사용자에게 노출되는 날짜/시간 의미는 항상 **user timezone 기준**이다.

### Examples

#### fixed

- start: 2026-04-01 09:00 Asia/Seoul
- interval: every 3 months
- occurrence:
  - 2026-04-01 09:00
  - 2026-07-01 09:00
  - 2026-10-01 09:00

#### completion_based

- start: 2026-04-01 09:00 Asia/Seoul
- interval: every 3 months
- completed: 2026-04-05 10:30 Asia/Seoul
- next occurrence:
  - 2026-07-05 09:00

---

## 7. Status Resolution

### Canonical statuses

- `scheduled`
- `completed`
- `skipped`
- `overdue`

### Resolution rules

1. 특정 occurrence에 대응하는 completion log가 있으면 completed/skipped
2. completion log가 없고 scheduled local date가 오늘보다 이전이면 overdue
3. completion log가 없고 scheduled local date가 오늘이면 scheduled

### Important note

- 자동 미루기 없음
- snooze 없음
- overdue는 별도 상태로 남는다

---

## 8. Notification Design

### Policy

- 알림은 occurrence 예정 시각에 1회 원격 푸시로 발송한다.
- 앞으로 14일 범위만 서버 발송 job으로 관리한다.
- 항목 생성, 수정, 완료, 건너뜀, 보관 뒤 관련 발송 job을 재계산한다.
- item edit로 인한 재계산 대상은 `scheduled_at_utc >= effective_from_utc` 미래 범위만 포함한다.
- item edit 후 생성 대상은 새 schedule version 기준 future occurrence만 포함한다.
- 앱은 로컬 알림을 예약하지 않는다.
- 로컬 알림과 앱 내부 이벤트는 MVP inbox row 생성과 inbox 목록 조회의 입력으로 사용하지 않는다.
- 앱은 푸시 권한 확인과 현재 기기 token 등록만 맡는다.

### Why not create jobs forever

- 변경/삭제 대응이 어려움
- 장기 일정 관리가 비효율적
- 발송 상태와 데이터 정합성이 깨질 수 있음

### Notification sync triggers

- item created
- item updated
- item archived or deleted
- occurrence completed
- occurrence skipped

### App token lifecycle

1. 로그인 직후 세션 복원 시 현재 기기 token을 등록한다.
2. 알림 권한 허용 직후 현재 기기 token을 등록한다.
3. `addPushTokenListener`로 token 갱신 시 다시 등록한다.
4. 로그아웃 시 현재 기기 token을 `logout`으로 비활성화한다.
5. 권한 거부 시 현재 기기 token을 `permission-denied`로 비활성화한다.
6. provider가 만료 token을 반환하면 worker가 `delivery-failed`로 비활성화한다.

### Remote push delivery algorithm

1. future occurrence 계산 결과를 기준으로 `notification_delivery_jobs`를 upsert 한다.
2. job의 `dedupe_key`로 occurrence 단위 중복 생성을 막는다.
3. Supabase `pg_cron`이 매분 Edge Function worker를 호출한다.
4. worker가 `status in ('pending', 'retrying')` 이고 `deliver_at_utc <= now()` 인 job을 조회한다.
5. 조회 시점의 활성 `device_push_tokens`를 읽는다.
6. iOS + `apns` token은 APNs 직접 발송으로 보낸다.
7. Android + `fcm` token은 FCM 직접 발송으로 보낸다.
   payload에는 `notificationKind`, `source`, `itemId`, `scheduledAtUtc`를 포함한다.
8. token별 결과를 `notification_delivery_attempts`에 남긴다.
9. APNs / FCM 성공 응답 attempt가 1건 이상이면 inbox target을 검증한다.
   필수 target은 `user_id`, `item_id`, `item_scheduled_at_utc`, `notification_kind`, payload routing 값이다.
   target이 누락되었거나 payload routing 값이 job target과 다르면 inbox row를 만들지 않는다.
10. target이 유효하면 즉시 `notification_inbox_items`를 upsert 한다.
   upsert 기준은 `(user_id, item_id, item_scheduled_at_utc)`이다.
   같은 key가 이미 있으면 기존 row를 갱신하지 않고 operation log만 추가한다.
   발송 예정 job과 성공 attempt가 없는 `retrying` 또는 `failed` job은 inbox row를 만들지 않는다.
11. job 요약 상태와 재시도 시각을 갱신한다.
12. 무효 token은 `delivery-failed`로 비활성화한다.

### Notification inbox stored fields

`notification_inbox_items`는 collapsed user-facing 알림 1건의 필수 필드만 저장한다.
이 테이블은 `notification_delivery_jobs`와 분리된 사용자-facing inbox 저장소다.
delivery job row는 발송 상태와 재시도를 관리하고, inbox row는 성공한 원격 푸시의 조회/읽음/숨김 상태를 관리한다.

- `user_id`: 알림함 소유자이자 조회, 읽음, 숨김 액션의 사용자 scope
- `item_id`: 상세 이동 대상 반복 항목
- `item_scheduled_at_utc`: 상세 이동 시 기준 occurrence 시각이자 collapse key 일부
- `source_job_id`: 성공 응답을 만든 delivery job 추적용 링크
- `notification_kind`: MVP에서는 `reminder`만 허용
- `title`, `body`: APNs / FCM에 보낸 사용자-facing 문구의 사본
- `payload`: 원격 푸시 payload 사본
- `delivered_at_utc`: worker가 성공 응답을 확인한 시각
- `read_at`: 사용자가 알림을 탭하거나 읽음 처리한 시각
- `hidden_at`: 사용자 scope 삭제로 목록에서 숨긴 시각

payload 필수 값:

- `notificationKind = "reminder"`
- `source = "recurring-item"`
- `itemId = item_id`
- `scheduledAtUtc = item_scheduled_at_utc`

상세 이동은 payload의 `itemId`, `scheduledAtUtc`를 사용한다.
`push_token`, `device_id`, `push_provider`, provider 응답 body는 inbox 필드가 아니다.
이 값들은 device-level operation log인 `notification_delivery_attempts`에만 남긴다.

### Notification inbox query

목록 조회는 `notification_inbox_items`를 단일 source로 사용한다.
이 테이블은 worker가 성공 응답 후 만든 collapsed user-facing row다.
조회 시점에 `notification_delivery_attempts`를 join해 token별 결과를 펼치지 않는다.

조회 조건:

- `user_id = current user`
- `hidden_at is null`
- 정렬은 `delivered_at_utc desc`
- page limit은 앱 query option으로만 제한한다.

중복 방지:

- logical event 기준은 `(user_id, item_id, item_scheduled_at_utc)`이다.
- 여러 기기 delivery record는 `notification_delivery_attempts`에만 여러 row로 남는다.
- 목록 query는 device delivery record 개수와 관계없이 logical event 1건당 inbox row 1건을 반환한다.
- 성공 여부는 inbox row 생성 시점에 확정하므로 목록 query에서 job/attempt 상태를 다시 계산하지 않는다.

### Notification inbox display

MVP UI는 collapsed inbox row만 표시한다.
기기별 발송 성공 여부는 숨김이나 요약 표시가 아니라 UI 범위에서 제외한다.

목록 row 표시 값:

- `title`
- `body`
- `delivered_at_utc`
- 읽음 여부: `read_at is not null`

상세 이동에 사용하는 값:

- `item_id`
- `item_scheduled_at_utc`
- `payload.notificationKind`
- `payload.source`

표시하지 않는 값:

- 성공한 기기 수
- 실패한 기기 수
- 기기 이름 또는 `device_id`
- `push_token`
- `push_provider`
- provider message id
- provider 응답 body 또는 error code

운영자가 기기별 결과를 확인해야 하면 `notification_delivery_attempts`와 Edge Function 로그를 조회한다.
사용자 inbox 화면은 기기별 delivery details를 숨기거나 요약하지 않고 처음부터 조회하지 않는다.

상세 이동 target:

| `notificationKind` | `source` | 대상 엔티티 | route | route params |
| --- | --- | --- | --- | --- |
| `reminder` | `recurring-item` | 반복 항목 occurrence | `/items/[itemId]` | `itemId`, `scheduledAtUtc` |

라우팅 규칙:

- MVP에서 지원하는 상세 이동 조합은 `reminder` + `recurring-item` 하나다.
- `itemId`는 route path parameter로 사용한다.
- `scheduledAtUtc`는 상세 화면이 기준 occurrence를 선택하는 query parameter로 사용한다.
- inbox 목록에서 진입하면 `returnTo = "/(tabs)/home/notifications"`를 함께 전달한다.
- OS 원격 푸시 tap에서 진입하면 `returnTo = "/home"`을 함께 전달한다.
- 허용되지 않은 알림 유형이나 대상 엔티티 조합은 route를 만들지 않는다.
- 지원하지 않는 상세 이동 target은 navigation failure로만 처리한다.
- 지원하지 않는 상세 이동 target도 이미 저장된 inbox row의 조회, 읽음, 전체 읽음, 숨김 액션을 막지 않는다.

fallback 규칙:

- route mapping이 없으면 현재 화면을 유지하고 상세 이동을 시도하지 않는다.
- route mapping이 없어도 알림함 tap으로 시작한 `read_at` 기록은 유지한다.
- route mapping이 없어도 알림함 목록 새로고침, 전체 읽음, 삭제는 평소처럼 동작한다.
- route mapping은 유효하지만 대상 반복 항목을 찾을 수 없거나 현재 사용자가 접근할 수 없으면 상세 fallback 화면을 표시한다.
- fallback 화면은 "알림 대상을 열 수 없습니다." 문구와 돌아가기 액션을 제공한다.
- 알림함 목록에서 진입한 fallback의 돌아가기 액션은 알림함으로 돌아간다.
- OS 원격 푸시 tap에서 진입한 fallback의 돌아가기 액션은 홈으로 돌아간다.
- fallback은 해당 inbox row의 `read_at`을 되돌리지 않는다.
- fallback은 해당 inbox row의 `hidden_at`을 기록하지 않는다.
- fallback은 local notification이나 앱 내부 이벤트를 새 inbox item으로 만들지 않는다.

전제조건:

- auth/session 계층이 현재 사용자와 현재 기기를 식별할 수 있어야 한다.
- 사용자 timezone과 item 데이터가 서버에서 조회 가능해야 한다.
- 알림은 `notifications_enabled = true`인 항목만 대상으로 한다.
- Edge Function에는 APNs/FCM secret이 설정되어 있어야 한다.

예상 예외:

- notification permission denied
- network error
- auth expired
- invalid recurrence config
- provider credential error

운영 후속 액션:

- 발송 결과는 job과 attempt row에 기록한다.
- 사용자 inbox는 성공한 원격 푸시만 노출한다.
- inbox 생성은 성공한 push service 응답 직후 처리하며 기기 수신 확인이나 사용자 tap을 요구하지 않는다.
- 사용자 inbox 목록은 로컬 알림, 앱 내부 이벤트, 발송 대기 job을 섞지 않는다.
- 실패 job과 재시도 예정 job은 inbox에 노출하지 않는다.
- inbox 알림 tap은 `read_at` 기록을 먼저 시작하고 상세 이동 결과를 기다리지 않는다.
- inbox 전체 읽음은 현재 사용자의 `hidden_at is null` 미읽음 row를 대상으로 하며 route mapping 지원 여부와 무관하다.
- inbox 삭제는 현재 사용자 row의 `hidden_at`만 기록한다.
- inbox 삭제는 route mapping 지원 여부와 무관하게 row id와 현재 사용자 scope로 처리한다.
- inbox 삭제는 다른 사용자 row를 변경하지 않는다.
- inbox 삭제는 delivery job과 token별 attempt log를 보존한다.
- inbox 삭제 flow는 `notification_delivery_jobs`를 update/delete하지 않고 delivery job/attempt 기록으로 cascade하지 않는다.
- worker 재시도나 반복 실행은 이미 만든 inbox row의 `read_at`, `hidden_at`, `delivered_at_utc`를 초기화하지 않는다.
- 실패 원인은 provider error code와 Edge Function 로그에서 확인한다.
- 권한 거부 상태면 설정 이동 경로를 제공하고, 데이터 자체는 서버 기준으로 유지한다.

핵심 원칙:

- job은 occurrence 단위 상태를 가진다.
- attempt는 token 단위 fan-out 결과를 가진다.
- inbox item의 user-facing notification identity는 `(user_id, item_id, item_scheduled_at_utc)`이다.
- `source_job_id`, token, device, provider는 identity가 아니라 추적/운영 로그의 속성이다.
- 여러 기기 token 성공은 `notification_delivery_attempts`에 각각 남기고, inbox에는 사용자 알림 1건으로만 접는다.
- 사용자가 inbox에서 삭제해도 operation/send log는 유지한다.
- 사용자가 inbox에서 삭제해도 remote push delivery job record는 변경하거나 삭제하지 않는다.
- 멀티 디바이스 기본값은 활성 token 전체 발송이다.
- 재시도는 같은 job row에서 관리하고 새 dedupe key를 만들지 않는다.
- inbox idempotency key는 job id나 token id가 아니라 `(user_id, item_id, item_scheduled_at_utc)`이다.

### Remote push payload contract

MVP payload 필수 필드:

- `notificationKind`: 알림 유형. MVP 값은 `reminder`만 허용한다.
- `source`: 대상 엔티티 계열. MVP 값은 `recurring-item`만 허용한다.
- `itemId`: 상세 이동 대상 반복 항목 id.
- `scheduledAtUtc`: 대상 occurrence 예정 시각. 상세 화면의 대표 occurrence 선택에 사용한다.

payload 규칙:

- 위 필드가 없으면 앱은 알림 tap 상세 이동을 수행하지 않는다.
- `notificationKind`와 `source` 조합이 route mapping에 없으면 앱은 상세 이동을 수행하지 않는다.
- inbox 생성 전에도 같은 target 규칙을 적용한다.
- target validation 실패 시 push 성공 attempt는 보존하고 inbox row만 만들지 않는다.
- inbox row의 `payload`는 성공한 원격 푸시 payload를 그대로 보존한다.
- inbox 고유성은 payload가 아니라 `user_id`, `item_id`, `item_scheduled_at_utc` 컬럼으로 판단한다.
- token, device, provider 식별자는 payload 필수 필드가 아니며 operation log에만 남긴다.

### Provider configuration

Edge Function secret:

- `APNS_KEY_ID`
- `APNS_TEAM_ID`
- `APNS_BUNDLE_ID`
- `APNS_PRIVATE_KEY`
- `APNS_USE_SANDBOX`
- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`
- `FCM_PRIVATE_KEY_ID`

운영 규칙:

- 개발 빌드는 `APNS_USE_SANDBOX=true`를 사용한다.
- TestFlight와 운영 빌드는 `APNS_USE_SANDBOX=false`를 사용한다.
- provider secret은 앱 클라이언트에 노출하지 않는다.

---

## 9. Device Model and Multi-device Strategy

### Product stance

- 멀티 디바이스 확장 가능하게 설계
- MVP에서는 고급 충돌 해결 UX는 제공하지 않음

### Why devices table exists

- 같은 계정의 여러 기기를 구분해야 한다
- 토큰과 발송 실패를 기기 단위로 추적해야 한다

### Key rule

- `devices`는 기기 identity를 유지한다
- `device_push_tokens`는 현재 발송 가능한 토큰만 유지한다
- `notification_delivery_jobs`는 occurrence 단위 발송 기준 row다
- `notification_delivery_attempts`는 token 단위 결과 log다
- 서버는 아이템/로그 데이터의 source of truth
- 로컬 알림 예약 metadata는 사용하지 않는다

### Practical implication

같은 계정으로 여러 기기를 사용할 수는 있지만,  
MVP에서는 “여러 기기 동시 편집에 대한 완전한 conflict UX” 대신 다음 원칙을 사용한다.

- row-level timestamp 기반 최신 상태 조회
- mutation 성공 후 서버 재조회
- completion log는 고유 id로 기록
- UI는 서버 기준으로 최신 상태를 다시 반영
- 동일 occurrence 중복 처리 감지 시 짧은 안내 메시지를 1회 표시한다

---

## 10. Timezone Strategy

### Decision

- UTC 저장
- user timezone 별도 저장

### Why

- 일정 앱의 시간 의미를 안정적으로 유지하기 위해
- 서버/클라이언트/다중 기기 계산 일관성을 확보하기 위해

### Storage pattern

- `profiles.timezone`: IANA timezone string
- `recurring_items.start_date_local`: local calendar date
- `recurring_item_schedule_versions.reminder_time_local`: local time string
- `recurring_item_schedule_versions`는 recurrence rule source of truth다
- 필요한 시점에 local datetime을 timezone 기준으로 UTC로 변환

### Interpretation

입력과 표시는 항상 local 의미를 유지하고,  
저장/전송/비교는 UTC를 사용한다.

---

## 11. Auth and Authorization

### Auth

- Supabase Auth 사용
- Google / Apple provider 추가 가능 구조

### Authorization

- RLS로 user_id 기준 접근 제한
- 사용자는 본인 데이터만 읽고 수정할 수 있어야 한다

---

## 12. Error Handling Strategy

### Expected cases

- network error
- auth expired
- notification permission denied
- invalid recurrence config
- server mutation conflict-like race

### UX principles

- 홈에서 오류를 명확히 보여줄 것
- 재시도 가능한 액션 제공
- 알림 권한 거부 시 설정 이동 제공

---

## 13. Widget Strategy

### MVP widget

- 읽기 전용
- 오늘 할 일 중심
- 직접 완료 액션 없음

### Data source

- 서버 조회 결과를 앱이 가공해 위젯에 전달하는 구조를 기본 전제로 설계
- 구현 시 플랫폼 제약에 따라 공유 스토리지/앱 그룹 전략 추가 가능

### Scope warning

위젯은 MVP 범위에 포함되지만 최소 읽기 전용 수준으로 제한한다.

---

## 14. Suggested Folder Structure

```txt
app/
  (auth)/
    login.tsx
  (tabs)/
    home.tsx
    schedule.tsx
    calendar.tsx
    settings.tsx
  item/
    new.tsx
    [id].tsx
    edit/[id].tsx

src/
  entities/
    recurring-item/
    completion-log/
    device/
  features/
    auth/
    create-item/
    edit-item/
    complete-occurrence/
    skip-occurrence/
    notification-delivery-sync/
    home-feed/
    reminder-list/
    calendar-view/
  shared/
    ui/
    lib/
    hooks/
    config/
    constants/
    types/
    validation/
  services/
    supabase/
    notifications/
    timezone/
    monitoring/
    widget/
  domain/
    recurrence/
    occurrence/
    status/
```

---

## 15. Implementation Phase Reference

이 문서의 구현 단계 설명은 구조 이해를 위한 상위 묶음만 남긴다.

사용자가 직접 검토하는 상세 phase와 작업 단위는 `IMPLEMENTATION_PLAN.md`를 단일 기준으로 본다.

### Foundation

- auth / session bootstrap
- profile timezone initialization
- base app infrastructure

### Core product flows

- recurrence / occurrence domain logic
- item CRUD
- home / reminder list / item detail / calendar
- remote push sync

### Hardening and finish

- widget read-only
- device-scoped metadata hardening
- monitoring
- polish

---

## 16. Portfolio Talking Points

1. 반복 일정 앱의 도메인 모델을 어떻게 설계했는가
2. 고정형과 완료 기준형을 한 UX 안에서 어떻게 공존시켰는가
3. overdue 상태를 자동 미루기 없이 어떻게 처리했는가
4. occurrence를 저장하지 않고 계산하는 이유
5. 서버 중심 구조에서 원격 푸시 발송 대상을 어떻게 동기화했는가
6. 멀티 디바이스 확장을 고려했지만 MVP 복잡도를 어떻게 통제했는가
