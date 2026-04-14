# Phase 16 Edit Effect Policy

## 1. 역할

이 문서는 항목 수정 시 변경 내용을 언제부터 적용할지 확정한다.

목표는 아래 3가지를 동시에 만족하는 것이다.

- 과거 completion/skip log를 유지한다.
- 과거 occurrence 해석을 유지한다.
- 수정 내용은 미래 occurrence 계산에만 반영한다.

이 문서는 `IMPLEMENTATION_PLAN.md`의 16단계 구현 기준이다.
제품 기준은 `PRODUCT_SPEC.md`를 따른다.
도메인 계산 규칙은 `DOMAIN_LOGIC.md`를 따른다.

중요:

- 이번 설계는 기존 DB 호환을 목표로 하지 않는다.
- 개발 데이터는 리셋 가능하다고 가정한다.
- 따라서 새 구조를 기준 구조로 바로 정의한다.

이 단계 구현이 끝나면 `PRODUCT_SPEC.md`, `DOMAIN_LOGIC.md`, `SYSTEM_DESIGN.md`, `DATABASE.sql`에 최종 구조를 반영한다.

## 2. 현재 문제

현재 구현은 `recurring_items` 한 행만 수정한다.
현재 occurrence 계산은 item 하나의 현재 규칙만 보고 전체 시퀀스를 다시 해석한다.

이 구조에서는 아래 문제가 생긴다.

- 간격이나 요일을 수정하면 과거 occurrence 의미도 흔들린다.
- 과거 completion log는 남아 있어도 새 규칙의 occurrence와 `scheduledAtUtc`가 달라질 수 있다.
- 문서상 정책인 `수정은 미래 occurrence 계산에만 반영`을 구현할 수 없다.

## 3. 확정 정책

### 3.1 수정 적용 시점

- 항목 수정은 수정 저장 시점 이후의 미래 occurrence에만 반영한다.
- 과거 completion/skip log는 유지한다.
- 과거 occurrence 해석도 유지한다.

### 3.2 시작일 정책

- 생성 후 `startDateLocal`은 수정할 수 없다.
- `startDateLocal`은 항목의 원래 시작점으로 유지한다.
- 이 제한은 UI와 저장 계층 둘 다에서 적용한다.

이 정책을 두는 이유는 아래와 같다.

- 시작일까지 수정 가능하면 과거 occurrence 기준이 다시 흔들린다.
- `미래만 반영` 정책과 충돌한다.

### 3.3 수정 가능 항목

메타 성격 필드:

- 제목
- 설명
- 카테고리

규칙 영향 필드:

- 반복 규칙
- 간격
- 요일
- 알림 시간
- anchor type
- 알림 on/off

메타 성격 필드는 item 메타만 수정한다.
규칙 영향 필드는 새 schedule version으로 저장한다.

## 4. 목표 동작

예시:

- 시작일: `2026-04-10`
- 기존 규칙: `3일마다`
- 수정 시점: `2026-04-14 10:00`
- 새 규칙: `4일마다`

기대 결과:

- 과거 `2026-04-10`, `2026-04-13` occurrence와 log는 그대로 유지
- 수정 이후 첫 future occurrence부터 새 규칙 적용
- 이후 occurrence는 `2026-04-17`, `2026-04-21`, ... 형태로 이어짐

중요:

- 이 동작은 `fixed` / `completion_based` 여부와 별개로
  `사용자가 직접 수정한 시점 이후부터 미래 일정이 바뀐다`는 제품 정책을 우선한다.

## 5. 저장 구조

### 5.1 recurring_items

`recurring_items`는 item identity와 메타 정보만 가진다.

유지 컬럼:

- `id`
- `user_id`
- `title`
- `description`
- `category`
- `start_date_local`
- `is_archived`
- `created_at`
- `updated_at`

원칙:

- recurrence 관련 source of truth는 `recurring_item_schedule_versions` 하나로 통일한다.
- `recurring_items`에는 recurrence 관련 컬럼을 두지 않는다.

### 5.2 recurring_item_schedule_versions

새 테이블:

- `recurring_item_schedule_versions`

필수 컬럼:

- `id`
- `item_id`
- `user_id`
- `effective_from_utc`
- `recurrence_type`
- `interval_value`
- `weekday_mask`
- `reminder_time_local`
- `anchor_type`
- `seed_start_date_local`
- `notifications_enabled`
- `created_at`

컬럼 의미:

- `effective_from_utc`
  이 version이 유효해지는 수정 저장 시각이다.
- `seed_start_date_local`
  이 version이 생성해야 하는 첫 future occurrence의 local date다.

### 5.3 completion_logs

`completion_logs`는 유지한다.

- `item_id`
- `scheduled_at_utc`
- `action`

이 구조는 바꾸지 않는다.
과거 log는 immutable로 유지한다.

## 6. 도메인 계산

### 6.1 입력 구조

occurrence 계산은 아래 입력을 받는다.

- item 메타 정보
- item의 schedule version 목록
- completion log 목록

단일 규칙 계산기 자체는 유지한다.
다중 version orchestration layer를 추가한다.

### 6.2 version 활성 구간

version 활성 구간:

- 시작: 자신의 `effective_from_utc`
- 끝: 다음 version의 `effective_from_utc` 직전
- 다음 version이 없으면 열린 구간

### 6.3 계산 순서

1. 조회 범위와 겹치는 version 목록을 구한다.
2. 각 version의 활성 구간을 계산한다.
3. 각 version은 자기 `seed_start_date_local`부터 occurrence를 생성한다.
4. 생성된 occurrence 중 `scheduledAtUtc < effective_from_utc`인 값은 버린다.
5. 생성된 occurrence 중 version 활성 구간 밖 값은 버린다.
6. 전체 occurrence를 합쳐 정렬한다.

### 6.4 fixed 규칙

`fixed`는 각 version의 규칙만 보고 occurrence를 생성한다.
과거 version의 future occurrence는 다음 version 경계에서 끊긴다.

### 6.5 completion_based 규칙

`completion_based`는 아래 규칙을 따른다.

- 새 version 시작 시 edit 이전 마지막 `completed`를 초기 anchor로 승계한다.
- 단, 새 version occurrence는 `seed_start_date_local` 이후부터만 생성한다.
- 새 version 안에서는 새 version이 생성한 occurrence에 대응하는 log만 매칭한다.
- 과거 version의 completion log는 새 version의 초기 anchor 결정에만 사용한다.

즉, `completion_based`에서도 `수정 시점 이후부터 미래만 바뀐다` 정책을 우선한다.
이 규칙은 제품 정책을 유지하기 위해 필요한 최소 복잡도로 본다.

## 7. 수정 저장 플로우

### 7.1 생성 시 저장

항목 생성 시 아래를 함께 저장한다.

1. `recurring_items` 메타 insert
2. initial schedule version insert

initial version 규칙:

- `effective_from_utc`는 생성 저장 시각
- `seed_start_date_local`은 `startDateLocal`
- recurrence 관련 입력값은 모두 initial version에 저장

### 7.2 메타만 바뀐 경우

예:

- 제목
- 설명
- 카테고리

처리:

- `recurring_items`만 update

### 7.3 규칙 영향 수정인 경우

예:

- `recurrenceType`
- `intervalValue`
- `weekdayMask`
- `reminderTimeLocal`
- `anchorType`
- `notificationsEnabled`

처리:

1. 현재 item 메타 조회
2. 기존 version 목록 조회
3. 수정 저장 시각을 `effective_from_utc`로 확정
4. 새 규칙의 첫 future occurrence local date 계산
5. 그 값을 `seed_start_date_local`로 확정
6. 새 version insert
7. 이후 future notification 재동기화 트리거

### 7.4 첫 future occurrence 계산 원칙

새 version은 과거 occurrence를 다시 만들면 안 된다.

따라서:

- 수정 시점 이전 occurrence는 기존 version이 책임진다.
- 새 version은 수정 시점 이후 첫 future occurrence부터 시작한다.
- 그 local date를 `seed_start_date_local`에 기록한다.

### 7.5 저장 원자성

규칙 영향 수정은 논리적으로 한 번에 처리해야 한다.

- 새 schedule version insert
- 필요한 메타 변경 반영

구현은 DB transaction 성격을 가져야 한다.
구현 방식은 고정하지 않는다.
중요한 것은 schedule version 생성과 관련 변경이 함께 반영되는 것이다.

## 8. UI 정책

### 8.1 시작일

- edit 모드에서는 비활성화
- helper text 노출:
  `시작일은 생성 후 변경할 수 없습니다.`

### 8.2 안내 문구

규칙 영향 수정이 있을 때 아래 문구를 보여준다.

- `변경은 이후 일정에만 적용됩니다.`

필요하면 더 구체적으로 아래 문구를 쓸 수 있다.

- `과거 기록은 유지되고, 다음 일정부터 새 규칙이 적용됩니다.`

### 8.3 저장 계층 보호

폼에서 시작일을 막는 것만으로 끝내지 않는다.
edit 저장 경로에서도 `startDateLocal` 변경은 허용하지 않는다.

### 8.4 현재 규칙 표시

폼 초기값, 상세 화면 현재 규칙 표시, 단건 조회는 latest schedule version에서 읽는다.

## 9. 알림 재예약 경계

규칙 영향 수정 시 미래 예약만 재조정해야 한다.

이 단계에서 고정하는 계약:

- 삭제 대상은 `scheduled_at_utc >= effective_from_utc`인 미래 reservation
- 생성 대상은 새 version 기준 future occurrence

주의:

- 실제 로컬 notification 예약 orchestration은 phase 18 구현 범위다.
- phase 16에서는 삭제/생성 기준만 문서로 고정한다.

## 10. 구현 항목

### 10.1 DB

- `recurring_items`를 메타 중심 구조로 재정의
- `recurring_item_schedule_versions` 테이블 추가
- `completion_logs` 유지
- 리셋 기준 새 스키마 작성

### 10.2 타입

- `RecurringItemScheduleVersion` 타입 추가
- repository row/insert 타입 추가
- version 포함 조회 타입 추가

### 10.3 repository

- item 메타 조회
- version 목록 조회
- version 생성
- 메타 수정 mutation과 규칙 영향 수정 mutation 분리
- latest schedule version 조회 경로 추가

### 10.4 domain

- version-aware `getOccurrencesInRange`
- version-aware `getNextOccurrence`
- edit 이후 첫 future occurrence 계산 helper
- `completion_based` version 경계 처리 추가

### 10.5 UI

- edit 모드 시작일 비활성화
- 안내 문구 추가
- 저장 후 최신 데이터 refetch
- edit 저장 시 `startDateLocal` patch 제거
- 화면 표시용 현재 규칙은 latest schedule version에서 조회

### 10.6 notification sync

- version 기준 future reservation 재생성 계약 반영

## 11. 테스트 기준

- 과거 log는 수정 후에도 그대로 보인다.
- 수정 이전 occurrence는 기존 규칙대로 유지된다.
- 수정 이후 첫 future occurrence부터 새 규칙이 적용된다.
- `startDateLocal`은 edit 모드에서 수정되지 않는다.
- 저장 계층에서도 `startDateLocal` 변경이 반영되지 않는다.
- `reminderTimeLocal` 수정은 미래 occurrence에만 반영된다.
- `completion_based`에서도 edit 이전 마지막 `completed`를 초기 anchor로 승계한다.
- `completion_based`에서도 수정 시점 이후부터만 새 규칙이 적용된다.
- 생성 직후 initial version이 올바르게 저장된다.
- 현재 규칙 조회는 latest schedule version 기준으로 동작한다.
- 미래 notification reservation만 재예약된다.

## 12. 비목표

이번 단계에서 하지 않는 것:

- 기존 DB 호환 마이그레이션
- backfill 로직
- 과거 log 일괄 재해석
- 과거 occurrence 이관 도구
- 규칙 버전 타임라인 UI
- 사용자가 임의의 적용 시점을 직접 고르는 기능
- 로컬 notification orchestration 전체 구현
