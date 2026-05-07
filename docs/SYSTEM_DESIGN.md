# System Design

## 1. Technical Overview

이 문서는 `PRODUCT_SPEC.md`에서 정의한 제품 범위와 용어를 구현 관점으로 풀어낸다.
제품 정의와 MVP 포함/제외 범위의 기준 서술은 `PRODUCT_SPEC.md`를 따른다.
반복 계산, 상태 판정, 알림 동기화 절차의 상세 규칙은 `DOMAIN_LOGIC.md`를 따른다.

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
- 기기 로컬 알림 중심
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
   - local notification scheduler
   - timezone utils
   - auth/session
   - logging/monitoring

### Presentation UI implementation rules

UI 관련 작업은 아래 규칙을 따른다.
이 규칙은 새 화면, 리디자인, UI 리팩터링에 모두 적용한다.

#### AppText

- 텍스트 스타일은 `AppText`의 `variant`를 우선 사용한다.
- `AppText`에 외부 `style`을 주입할 때는 variant가 이미 가진 타이포 값을 중복 지정하지 않는다.
- 글자 크기, 굵기, 줄 높이, 자간은 임시 스타일로 덮어쓰지 않는다.
- 색상, 정렬, flex 관련 레이아웃 속성은 화면 맥락에 따라 외부 `style`로 주입할 수 있다.
- 필요한 텍스트 스타일은 `AppText` variant 또는 typography token으로 추가한다.

#### Style placement

- `styles`만 담는 파일로 분리하지 않는다.

#### Render structure

- `renderItem`, `renderHeader`, `renderFooter`처럼 `render~` 이름의 별도 함수나 변수를 만들지 않는다.
- 반복 UI가 복잡해지면 렌더 함수로 빼지 말고 컴포넌트로 분리한다.
- `FlatList`처럼 API가 `renderItem` prop을 요구하는 경우에도 화면 파일에는 짧은 연결 JSX만 남긴다.

#### Loading placeholder

- `AppStatePlaceholder`는 레거시 로딩 UI다.
- 새 화면에서는 `AppStatePlaceholder`를 새로 사용하지 않는다.
- 로딩 UI는 화면 구조에 맞는 전용 placeholder로 만든다.
- 여러 화면에서 같은 구조가 반복될 때만 새 기준의 공용 placeholder를 만든다.

#### Icon button

- 아이콘만 있는 버튼은 `IconButton`을 우선 사용한다.
- 헤더의 아이콘-only 액션은 기본적으로 `IconButton` `size="lg"`와 lucide icon `size={20}`을 사용한다.
- 채워진 원형 배경처럼 버튼 자체의 시각 구조가 다른 경우에만 화면 전용 버튼을 만든다.

#### Component order

- 외부 입력과 훅을 먼저 둔다.
- 로컬 상태를 그다음에 둔다.
- 파생 값은 상태와 쿼리 결과 아래에 둔다.
- 이벤트 핸들러와 액션 함수는 `useEffect`보다 위에 둔다.
- `useEffect`는 의존하는 값과 함수가 선언된 뒤에 둔다.
- 마지막에 JSX 또는 훅의 반환 객체를 둔다.

### Core components

- **Auth/session**
  - 로그인 상태 복원
  - 현재 사용자와 현재 기기 식별
- **Repositories**
  - recurring item 메타, schedule versions, completion logs, devices 조회/저장
- **Domain services**
  - recurrence calculation
  - occurrence derivation
  - status resolution
  - next occurrence logic
- **Notification bootstrap**
  - 알림 권한 상태 확인
  - 현재 기기 pending local notification 점검
  - mutation 이후 로컬 알림 재예약
- **Local notification scheduler**
  - future occurrence 기준 로컬 알림 예약
  - 일정 변경과 completion log 변경에 따른 예약 취소/재예약
  - 알림 tap routing payload 관리
- **Presentation surfaces**
  - 홈, 목록, 상세, 달력, 설정, 위젯에 필요한 파생 데이터를 조합

### Data flow overview

1. 사용자가 항목을 생성/수정/완료/건너뜀한다.
2. mutation은 서버에 item 메타, schedule version, completion log를 저장한다.
3. 저장된 데이터와 사용자 timezone을 기준으로 occurrence를 다시 계산한다.
4. 계산 결과로 홈/목록/상세/달력/위젯에 필요한 파생 목록을 만든다.
5. 알림이 필요한 occurrence만 현재 기기 로컬 알림으로 다시 맞춘다.

핵심 원칙:

- 서버 row가 원본 데이터다.
- occurrence와 화면 목록은 저장하지 않고 계산한다.
- 로컬 알림 예약은 계산 결과를 반영하는 기기별 파생 상태다.

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
- 알림이 켜진 항목은 현재 기기 로컬 알림을 다시 예약한다.

---

## 3. Source of Truth

### Server

Supabase Postgres를 데이터의 최종 source of truth로 사용한다.

### Client

클라이언트는 서버 데이터를 조회하고 변경한다. 완전한 오프라인 일관성은 목표가 아니다.

### Notifications

알림 자체는 source of truth가 아니다. DB 기준으로 occurrence를 다시 계산하고, 그 결과에 따라 현재 기기 로컬 알림 예약을 다시 맞춘다.

---

## 4. Data Model Overview

### Core entities

- users / profiles
- devices
- recurring_items
- recurring_item_schedule_versions
- completion_logs

`recurring_items`는 일정 메타로 일정 색상 key를 가진다. 저장값은 영문 팔레트 key이고, 사용자-facing 라벨은 한국어 색상 이름이다.

### Derived concepts

- occurrence
- 오늘 목록
- 다가오는 일정 목록
- 지난 일정 목록
- 캘린더 날짜 요약

occurrence는 테이블로 저장하지 않고 런타임에서 계산한다.

일정 색상은 occurrence 상태와 독립이다. 캘린더 월간 날짜 셀은 일정 색상 선을 표시한다.

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

- 알림은 occurrence 예정 시각에 1회 기기 로컬 알림으로 표시한다.
- 항목 생성, 수정, 완료, 건너뜀, 보관 뒤 현재 기기의 로컬 알림을 재예약한다.
- item edit로 인한 재예약 대상은 `scheduled_at_utc >= effective_from_utc` 미래 범위만 포함한다.
- item edit 후 생성 대상은 새 schedule version 기준 future occurrence만 포함한다.
- 알림함과 알림 기록 화면은 MVP에서 제거한다.
- 놓친 일정은 홈 피드와 overdue 상태로 다시 드러낸다.
- 일정 제목과 설명은 서버 DB에 평문으로 저장하지 않는다.
- 암호화 목표는 엄격한 E2EE가 아니라 Supabase DB, 운영 화면, 로그에서 일정 제목과 설명 평문을 제거하는 것이다.
- 새 기기 로그인과 앱 재설치 뒤에도 사용자가 별도 복구 비밀번호 없이 일정 제목과 설명을 복구할 수 있어야 한다.
- 앱은 사용자별 data encryption key로 일정 제목과 설명을 암호화한다.
- 서버 DB에는 제목/설명 암호문, key version, 암호화 메타데이터만 저장한다.
- data encryption key 원문은 일반 테이블에 저장하지 않는다.
- 복구를 위해 data encryption key는 사용자와 연결된 wrapped key로 저장한다.
- wrapped key 구조는 DB에서 제목과 설명 평문이 보이지 않게 하는 목표에 맞춘다.
- 서버 운영자가 악의적 클라이언트 업데이트를 배포하면 사용자가 앱에서 복호화하는 순간 내용을 볼 수 있다는 한계를 인정한다.
- 제목과 설명 기반 검색/정렬은 서버에서 수행하지 않는다.
- 목록 정렬은 앱이 데이터를 받은 뒤 복호화한 값을 사용해 클라이언트에서 수행한다.
- 서버 쿼리는 사용자 scope, 보관 여부, 변경 시각 같은 동기화와 필터링 기준만 사용한다.
- MVP 암호화 범위는 일정 제목과 설명으로 제한한다.
- 반복 규칙, 예정 시각, 완료/건너뛰기 기록, 색상, 보관 여부는 서버 동기화와 화면 계산을 위해 평문 메타데이터로 유지한다.
- 평문 메타데이터도 생활 패턴을 드러낼 수 있다는 한계를 인정한다.
- 로컬 알림 제목은 복호화한 일정 제목을 사용한다.
- 로컬 알림 본문에는 설명을 넣지 않고 예정 시각을 짧게 표시한다.
- 로컬 알림 본문 예시는 `오후 9:00` 형식이다.
- 설명은 앱 내부 상세와 입력 화면에서만 표시하는 개인 메모다.
- 설명은 로컬 알림, 원격 푸시 fallback, 서버 로그, 진단 값에 사용하지 않는다.
- 설명은 제목과 같은 방식으로 암호화해서 저장한다.
- 복호화 실패는 정상 사용자 흐름이 아니라 예외 상태다.
- 복호화에 실패한 일정은 목록에서 숨기지 않고 `복구가 필요한 일정` 같은 fallback 제목으로 표시한다.
- 복호화에 실패한 일정의 설명은 비워 둔다.
- 복호화에 실패한 일정 상세는 내용을 복구하지 못했다는 상태와 삭제 액션을 제공한다.
- 복호화에 실패한 일정은 로컬 알림 예약 대상에서 제외한다.
- 원격 푸시 fallback을 나중에 도입하면 제목과 본문은 일반 문구만 사용한다.
- 순수 로컬 알림만 사용할 때는 APNs / FCM 토큰과 서버 발송 worker가 필요하지 않다.
- 앱 active flow는 `device_push_tokens`, `notification_delivery_jobs`, `notification_delivery_attempts`, `notification_inbox_items`를 더 이상 읽거나 쓰지 않는다.
- `push-delivery-worker` Edge Function과 원격 푸시 cron 호출은 제거한다.
- 기존 migration 파일은 적용 이력으로 남기고, 새 migration으로 필요 없는 원격 푸시 테이블, RPC, cron을 제거한다.
- 개발 기간에는 기존 일정과 예정 알림 job 데이터를 보존하지 않아도 된다.
- 일정 제목과 설명 저장 방식을 바꿀 때 기존 평문 데이터는 새 구조로 마이그레이션하지 않고 삭제할 수 있다.
- implementation issue에는 개발 데이터 reset migration 작성을 포함한다.
- reset migration은 기존 migration 파일을 수정하지 않고, 새 migration에서 기존 일정 데이터와 원격 푸시 데이터를 삭제하거나 관련 저장소를 제거한다.
- 원격 푸시 fallback은 `docs/adr/0002-device-local-notifications.md`의 privacy boundary를 유지한 상태에서 별도 검토한다.

### Why not schedule everything forever

- 변경/삭제 대응이 어려움
- iOS pending notification 제한을 넘길 수 있음
- 장기 반복 일정에서 시간대 변경과 DST 대응이 어려움

### Notification reschedule triggers

- item created
- item updated
- item archived or deleted
- occurrence completed
- occurrence skipped

### Local notification algorithm

1. 서버 데이터를 동기화한다.
2. 현재 사용자 timezone 기준으로 future occurrence를 계산한다.
3. `notificationsEnabled = true`이고 `scheduled` 상태인 occurrence만 예약 후보로 삼는다.
4. OS notification permission이 없으면 local notification 예약을 시도하지 않는다.
5. OS 반복 트리거로 표현 가능한 단순 반복은 반복 예약을 우선 검토한다.
6. 기본 예약 범위는 앞으로 30일이다.
7. 모든 일정은 30일 범위 밖이어도 일정별 다음 occurrence 1개를 추가 예약한다.
8. 기기 pending 예약 상한에 가까워지면 예정 시각이 가까운 알림을 우선 예약한다.
9. 상한 초과는 사용자에게 즉시 경고하지 않는다.
10. 예약하지 못한 먼 알림은 다음 sync에서 다시 시도한다.
11. 개발용 진단 값은 예약 후보 수, 실제 예약 수, 누락된 먼 알림 수를 포함한다.
12. 예약 content 제목에는 사용자 기기에서 복호화한 일정 제목을 사용한다.
13. 예약 content 본문에는 설명을 넣지 않고 예정 시각을 짧게 표시한다.
14. 예약 payload에는 `notificationKind`, `source`, `itemId`, `scheduledAtUtc`를 포함한다.
15. 예약 identifier는 occurrence 단위로 안정적으로 만든다.
16. 더 이상 유효하지 않은 future local notification은 취소한다.
17. 알림 tap payload가 유효하면 상세 화면으로 이동한다.

### Local notification privacy boundary

- 일정 제목과 설명은 서버 push payload에 넣지 않는다.
- 서버 로그, Sentry event, provider response summary에는 일정 제목과 설명을 남기지 않는다.
- 운영 디버깅은 `itemId`, `scheduledAtUtc`, 상태 코드처럼 표시 문구가 아닌 값으로 수행한다.
- 원격 푸시 fallback을 도입해도 제목은 일반 문구만 사용한다.

### Remote push fallback notes

원격 푸시 fallback은 현재 기본 설계가 아니다.
나중에 필요하면 `docs/adr/0002-device-local-notifications.md`의 privacy boundary를 유지한 상태에서 별도 설계한다.

### Legacy remote push implementation context

아래 원격 푸시 inbox와 provider 설정 설명은 제거 대상인 기존 구현을 이해하기 위한 legacy context다.
목표 구조는 기기 로컬 알림이며, 원격 푸시를 다시 도입할 때도 실제 일정 제목과 설명을 payload에 싣지 않는다.

### Notification inbox stored fields

`notification_inbox_items`는 collapsed user-facing 알림 1건의 필수 필드만 저장한다.
이 테이블은 `notification_delivery_jobs`와 분리된 사용자-facing inbox 저장소다.
delivery job row는 발송 상태와 재시도를 관리하고, inbox row는 성공한 원격 푸시의 조회/읽음/숨김 상태를 관리한다.

- `user_id`: 알림함 소유자이자 조회, 읽음, 숨김 액션의 사용자 scope
- `item_id`: 상세 이동 대상 반복 항목
- `item_scheduled_at_utc`: 상세 이동 시 기준 occurrence 시각이자 collapse key 일부
- `source_job_id`: 성공 응답을 만든 delivery job 추적용 링크
- `notification_kind`: MVP에서는 `reminder`만 허용
- `title`: APNs / FCM에 보낸 반복 항목 제목의 사본
- `body`: 반복 항목 설명이 있을 때만 APNs / FCM에 보낸 사용자-facing 본문의 사본
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
`push_token_ref`, `device_id`, `push_provider`, provider 응답 요약은 inbox 필드가 아니다.
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
- `body`: 값이 있을 때만 제목 옆에 표시
- `delivered_at_utc`: 날짜와 시간으로 분리해 표시
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
- `push_token_ref`
- `push_provider`
- provider message id
- provider 응답 요약 또는 error code

운영자가 기기별 결과를 확인해야 하면 `notification_delivery_attempts`의 token 참조값과 provider error code를 조회한다.
사용자 inbox 화면은 기기별 delivery details를 숨기거나 요약하지 않고 처음부터 조회하지 않는다.

상세 이동 target:

| `notificationKind` | `source`         | 대상 엔티티          | route             | route params               |
| ------------------ | ---------------- | -------------------- | ----------------- | -------------------------- |
| `reminder`         | `recurring-item` | 반복 항목 occurrence | `/items/[itemId]` | `itemId`, `scheduledAtUtc` |

라우팅 규칙:

- MVP에서 지원하는 상세 이동 조합은 `reminder` + `recurring-item` 하나다.
- `itemId`는 route path parameter로 사용한다.
- `scheduledAtUtc`는 상세 화면이 기준 occurrence를 선택하는 query parameter로 사용한다.
- OS 원격 푸시 tap에서 진입하면 `returnTo = "/home"`을 함께 전달한다.
- 허용되지 않은 알림 유형이나 대상 엔티티 조합은 route를 만들지 않는다.
- 지원하지 않는 상세 이동 target은 navigation failure로만 처리한다.

fallback 규칙:

- route mapping이 없으면 현재 화면을 유지하고 상세 이동을 시도하지 않는다.
- route mapping은 유효하지만 대상 반복 항목을 찾을 수 없거나 현재 사용자가 접근할 수 없으면 상세 fallback 화면을 표시한다.
- fallback 화면은 "알림 대상을 열 수 없습니다." 문구와 돌아가기 액션을 제공한다.
- OS 원격 푸시 tap에서 진입한 fallback의 돌아가기 액션은 홈으로 돌아간다.

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
- `notification_delivery_attempts`는 원문 token을 제외한 token 단위 결과 log다
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

### Profile

- 앱 표시 이름의 source of truth는 `profiles.display_name`이다.
- Apple / Google metadata 이름은 profile 생성 또는 비어 있는 profile 보정에만 사용한다.
- 사용자가 설정에서 수정한 앱 표시 이름은 provider metadata로 덮어쓰지 않는다.

### Authorization

- RLS로 user_id 기준 접근 제한
- 사용자는 본인 데이터만 읽고 수정할 수 있어야 한다

### Secret and public env boundary

- secret은 git, 앱 번들, Sentry event, Supabase 로그, Edge Function 로그, EAS / CI 로그에 남기지 않는다.
- 앱 번들에는 `EXPO_PUBLIC_*` public env만 포함할 수 있다.
- `EXPO_PUBLIC_*`에는 service role key, private key, OAuth client secret, Sentry auth token, EAS / CI token을 넣지 않는다.
- Supabase service role key와 provider private key는 서버 실행 환경에만 둔다.
- 예시 파일이 필요하면 secret 없는 placeholder만 둔다.
- secret 노출이 확인되면 해당 credential을 폐기하고 새 값으로 교체한 뒤, 필요한 경우 새 앱 빌드와 재배포까지 수행한다.

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

## 15. Portfolio Talking Points

1. 반복 일정 앱의 도메인 모델을 어떻게 설계했는가
2. 고정형과 완료 기준형을 한 UX 안에서 어떻게 공존시켰는가
3. 지난 일정 상태를 자동 미루기 없이 어떻게 처리했는가
4. occurrence를 저장하지 않고 계산하는 이유
5. 개인 정보 보호를 위해 알림을 기기 로컬 책임으로 둔 이유
6. 멀티 디바이스 확장을 고려했지만 MVP 복잡도를 어떻게 통제했는가
