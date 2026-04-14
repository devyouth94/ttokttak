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
- 가까운 14일 범위만 알림 예약
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
   - notification scheduler
   - timezone utils
   - auth/session
   - logging/monitoring

### Core components

- **Auth/session**
  - 로그인 상태 복원
  - 현재 사용자와 현재 기기 식별
- **Repositories**
  - recurring items, completion logs, devices, notification reservation metadata 조회/저장
- **Domain services**
  - recurrence calculation
  - occurrence derivation
  - status resolution
  - next occurrence logic
- **Notification scheduler**
  - 현재 기기 기준 예약/취소 수행
  - device-scoped metadata 동기화
- **Presentation surfaces**
  - 홈, 상세, 히스토리, 달력, 설정, 위젯에 필요한 파생 데이터를 조합

### Data flow overview

1. 사용자가 항목을 생성/수정/완료/건너뜀한다.
2. mutation은 서버에 item 또는 completion log를 저장한다.
3. 저장된 데이터와 사용자 timezone을 기준으로 occurrence를 다시 계산한다.
4. 계산 결과로 홈/히스토리/달력/위젯에 필요한 파생 목록을 만든다.
5. 알림이 필요한 occurrence만 현재 기기 기준으로 다시 예약한다.

핵심 원칙:

- 서버 row가 원본 데이터다.
- occurrence와 화면 목록은 저장하지 않고 계산한다.
- 로컬 알림은 계산 결과를 반영하는 파생 상태다.

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
- 홈, 히스토리, 달력, 위젯은 재계산 결과를 다시 반영한다.
- 알림이 켜진 항목은 현재 기기 기준 notification sync를 다시 실행한다.

---

## 3. Source of Truth

### Server

Supabase Postgres를 데이터의 최종 source of truth로 사용한다.

### Client

클라이언트는 서버 데이터를 조회하고 변경한다. 완전한 오프라인 일관성은 목표가 아니다.

### Notifications

알림 자체는 source of truth가 아니다. DB 기준으로 occurrence를 다시 계산하고, 그 결과에 따라 로컬 알림을 예약한다.

---

## 4. Data Model Overview

### Core entities

- users / profiles
- devices
- recurring_items
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

- 알림은 occurrence 예정 시각에 1회 발송
- 앞으로 14일 범위만 예약
- 항목 변경 시 관련 알림 재계산
- 앱 시작 시 전체 동기화 보정

### Why not schedule everything forever

- 변경/삭제 대응이 어려움
- 장기 일정 관리가 비효율적
- 예약 상태와 데이터 정합성이 깨질 수 있음

### Notification sync triggers

- app start
- auth session restored
- item created
- item updated
- item archived or deleted
- occurrence completed
- occurrence skipped

### Scheduling algorithm

1. 현재 사용자와 현재 기기 확인
2. 14일 범위 내 relevant occurrence 계산
3. 기존 기기 알림 예약 목록 확인
4. 더 이상 유효하지 않은 알림 취소
5. 새 occurrence에 대한 알림 예약
6. 예약된 notification id를 device-scoped metadata에 저장

전제조건:

- auth/session 계층이 현재 사용자와 현재 기기를 식별할 수 있어야 한다.
- 사용자 timezone과 item 데이터가 서버에서 조회 가능해야 한다.
- 알림은 `notifications_enabled = true`인 항목만 대상으로 한다.

예상 예외:

- notification permission denied
- network error
- auth expired
- invalid recurrence config

운영 후속 액션:

- 예약 결과는 현재 기기용 metadata에만 반영한다.
- 실패 시 홈에서 오류를 명확히 보여주고 재시도 가능한 액션을 제공한다.
- 권한 거부 상태면 설정 이동 경로를 제공하고, 데이터 자체는 서버 기준으로 유지한다.

---

## 9. Device Model and Multi-device Strategy

### Product stance

- 멀티 디바이스 확장 가능하게 설계
- MVP에서는 고급 충돌 해결 UX는 제공하지 않음

### Why devices table exists

- 알림은 로컬 디바이스에서만 울린다
- 어느 기기에서 어떤 알림을 예약했는지 추적해야 한다

### Key rule

- 각 기기는 자신의 로컬 알림만 예약/취소한다
- 서버는 아이템/로그 데이터의 source of truth
- 알림 예약 메타데이터는 device-scoped로 관리한다

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
- `recurring_items.reminder_time_local`: local time string
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
    calendar.tsx
    history.tsx
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
    notification-sync/
    home-feed/
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
- home / history / calendar
- notification sync

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
5. 서버 중심 구조에서 로컬 알림을 어떻게 동기화했는가
6. 멀티 디바이스 확장을 고려했지만 MVP 복잡도를 어떻게 통제했는가
