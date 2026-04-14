# Domain Logic

이 문서는 `PRODUCT_SPEC.md`와 `SYSTEM_DESIGN.md`에서 이미 정한 제품 범위와 공통 용어를 그대로 사용한다.
여기서는 반복 규칙, occurrence 계산, 상태 판정처럼 도메인 규칙의 세부 동작만 정의한다.
시스템 계층 구조와 구성요소 책임은 `SYSTEM_DESIGN.md`를 기준으로 보고, 이 문서는 그 안에서 실행되는 계산 규칙과 mutation 후속 규칙만 다룬다.
구현 순서와 작업 분할은 `IMPLEMENTATION_PLAN.md`를 따르되, 계산 규칙의 기준은 이 문서를 따른다.

## 1. Core Types

```ts
export type RecurrenceType =
  | "once"
  | "daily"
  | "interval_days"
  | "weekly"
  | "interval_weeks"
  | "monthly"
  | "interval_months"
  | "yearly";

export type AnchorType = "fixed" | "completion_based";

export type OccurrenceStatus =
  | "scheduled"
  | "completed"
  | "skipped"
  | "overdue";

export interface RecurringItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  recurrenceType: RecurrenceType;
  intervalValue?: number | null;
  weekdayMask?: number[] | null;
  startDateLocal: string; // YYYY-MM-DD
  reminderTimeLocal?: string; // HH:mm
  notificationsEnabled: boolean;
  anchorType: AnchorType;
  timezone: string;
  isArchived: boolean;
  createdAt: string; // UTC ISO
  updatedAt: string; // UTC ISO
}

export interface CompletionLog {
  id: string;
  userId: string;
  itemId: string;
  scheduledAtUtc: string; // occurrence identity
  action: "completed" | "skipped";
  actedAtUtc: string;
  deviceId?: string | null;
  createdAt: string;
}

export interface DerivedOccurrence {
  itemId: string;
  scheduledAtUtc: string;
  scheduledAtLocal: string;
  localDate: string; // YYYY-MM-DD
  localTime?: string | null; // HH:mm
  status: OccurrenceStatus;
}
```

### Type Notes

- `RecurringItem`은 저장되는 원본 엔티티다.
- `occurrence`는 `RecurringItem`과 로그를 기준으로 계산되는 파생 개념이며 별도 row로 저장하지 않는다.
- `recurrenceType`이 `interval_days`, `interval_weeks`, `interval_months`면 `intervalValue`가 필요하다.
- `recurrenceType`이 `weekly`, `interval_weeks`면 `weekdayMask`가 필요하다.
- `startDateLocal`은 반복 계산의 local 시작 기준일이다.
- `reminderTimeLocal`은 local timezone 기준 예정 시각이다.
- MVP에서는 `reminderTimeLocal`을 필수 입력으로 보고 검증한다.
- `notificationsEnabled = false`여도 overdue 판단과 정렬 기준이 필요하므로 값은 유지한다.
- `notificationsEnabled = false`인 item은 알림 예약 대상에서는 제외된다.
- `anchorType`은 다음 future occurrence 계산 기준만 바꾸며, occurrence 상태 판정 규칙 자체를 바꾸지는 않는다.
- `isArchived = true`인 item은 활성 화면과 future notification 대상에서 제외하는 방향을 기본으로 본다.
- `CompletionLog`는 `(itemId, scheduledAtUtc)` 기준으로 특정 occurrence에 연결된다.
- `CompletionLog.action`은 `completed` 또는 `skipped`만 가진다.
- `DerivedOccurrence.scheduledAtUtc`는 occurrence identity로 사용한다.
- `scheduledAtLocal`, `localDate`, `localTime`은 사용자에게 보여줄 local 기준 값이다.

## 2. Occurrence Identity

Occurrence는 저장된 row가 아니라 계산 결과이므로 식별 기준이 필요합니다.

- identity: `(item_id, scheduled_at_utc)`
- 이유: completion / skip 로그를 정확히 연결하기 위해

## 3. Recurrence Rules

### once

- start date/time에 한 번만 발생
- 완료 또는 건너뜀 이후 추가 occurrence 없음

### daily

- 매일 같은 local time에 발생

### interval_days

- start date를 anchor로 `n`일마다 발생

### weekly

- 선택한 weekday에 매주 발생
- weekday가 하나도 없으면 invalid

### interval_weeks

- start date가 속한 주를 기준으로 `n`주마다 발생
- weekday가 하나도 없으면 invalid

### monthly

- start date의 day-of-month 기준으로 매달 발생

### interval_months

- start date의 day-of-month 기준으로 `n`달마다 발생

### yearly

- start date의 month/day 기준으로 매년 발생

## 4. Day-of-month Edge Cases

월 단위 규칙에서 시작일이 29, 30, 31일일 수 있습니다.

- rule: 해당 월에 같은 날짜가 없으면 그 달의 마지막 날로 보정
- example: Jan 31 monthly -> Feb 28(or 29), Mar 31, Apr 30
- example: Aug 31 every 2 months -> Oct 31, Dec 31, Feb 28(or 29)

## 5. Anchor Type Rules

### fixed

원래 recurrence rule 기준으로 occurrence를 계산합니다.

예시:

- item: every 3 months
- scheduled: Apr 1
- actual completion: Apr 5
- next: Jul 1

### completion_based

마지막 `completed` 시점을 기준으로 다음 occurrence를 계산합니다.

- `completed`만 anchor를 이동시킴
- `skipped`는 anchor를 이동시키지 않음

예시:

- item: every 3 months
- completed: Apr 5
- next: Jul 5

권장 사항:

- 우선 적용 대상: once, daily, interval_days, monthly, interval_months, yearly
- MVP에서는 weekly, interval_weeks에 completion_based를 적용하지 않는다
- weekly 계열은 사용자 기대가 요일 패턴에 더 가깝기 때문에 fixed만 지원한다

## 6. Scheduled Datetime Construction

입력:

- local date
- local time
- user timezone

출력:

- UTC datetime

규칙:

1. local date와 local time을 결합한다.
2. user timezone으로 해석한다.
3. UTC ISO로 변환한다.

MVP에서는 reminder time을 필수로 둔다. 이 값은 알림 발송 여부와 별개로 예정 일시 계산, 정렬, 화면 표시 기준에 사용한다.

## 7. Range Query Functions

### getOccurrencesInRange

```ts
getOccurrencesInRange(
  item,
  rangeStartUtc,
  rangeEndUtc,
  timezone,
  completionLogs,
);
```

- 지정 범위 내 occurrence 계산
- 각 occurrence의 상태까지 resolve

### getNextOccurrence

```ts
getNextOccurrence(item, nowUtc, timezone, completionLogs);
```

- 현재 이후 가장 가까운 occurrence 계산

### getLastCompletedLog

```ts
getLastCompletedLog(itemId, logs);
```

- completion_based 계산용 마지막 완료 로그 조회

## 8. Status Resolution

입력:

- occurrence `scheduledAtUtc`
- completion logs
- current time `nowUtc`

출력:

- `scheduled | completed | skipped | overdue`

알고리즘:

1. `scheduledAtUtc`에 대응하는 log를 찾는다.
2. `log.action === "completed"`면 `completed`
3. `log.action === "skipped"`면 `skipped`
4. log가 없고 `scheduledLocalDate < today(local timezone)`면 `overdue`
5. 나머지는 `scheduled`

## 9. Home Feed Construction

### Today

- `localDate == today(local timezone)`
- `status == scheduled`

### Upcoming

- `scheduledAtUtc > nowUtc`
- today 이후 범위
- `status == scheduled`

### Overdue

- `status == overdue`

UI 정책:

- 홈에서는 오래된 overdue 전체를 다 보여주지 않고 최근 항목 위주로 제한 노출

## 10. Completion Flow

### completeOccurrence(itemId, scheduledAtUtc)

1. occurrence identity 확인
2. `action = completed` 로그 생성
3. 서버 저장
4. 홈/히스토리 쿼리 무효화
5. 현재 기기 notification sync 실행

전제조건:

- `itemId`와 `scheduledAtUtc`로 occurrence identity를 확정할 수 있어야 한다.
- 현재 사용자 세션과 사용자 timezone이 유효해야 한다.
- completion log 저장 권한이 있어야 한다.

부수 효과:

- `fixed`: 원래 recurrence 기준 유지
- `completion_based`: 마지막 completed 시점 기준으로 future occurrence 재계산

예상 예외:

- network error
- auth expired
- server mutation conflict-like race

후속 액션:

- mutation 성공 후 서버 기준 홈/히스토리 데이터를 다시 읽는다.
- 현재 기기 기준 notification sync를 다시 실행한다.

## 11. Skip Flow

### skipOccurrence(itemId, scheduledAtUtc)

1. occurrence identity 확인
2. `action = skipped` 로그 생성
3. 서버 저장
4. 관련 쿼리 무효화
5. notification sync 실행

전제조건:

- `itemId`와 `scheduledAtUtc`로 occurrence identity를 확정할 수 있어야 한다.
- 현재 사용자 세션과 사용자 timezone이 유효해야 한다.
- skip 로그 저장 권한이 있어야 한다.

중요 규칙:

- skipped는 해당 occurrence만 소비
- completion_based anchor는 이동시키지 않음

예상 예외:

- network error
- auth expired
- server mutation conflict-like race

후속 액션:

- mutation 성공 후 서버 기준 홈/히스토리 데이터를 다시 읽는다.
- 현재 기기 기준 notification sync를 다시 실행한다.

## 12. Edit Item Flow

### editItem(item)

1. item 저장
2. 미래 occurrence 재계산
3. 과거 completion log는 유지
4. 앱 시작 또는 즉시 sync에서 알림 재예약

전제조건:

- item validation rules를 먼저 통과해야 한다.
- 현재 사용자 세션과 사용자 timezone이 유효해야 한다.
- 수정 대상 item을 서버 기준 최신 상태로 읽을 수 있어야 한다.

주의:

- 반복 규칙을 크게 바꾸면 과거 로그와 미래 occurrence의 의미가 달라질 수 있음

MVP 확정 정책:

- 과거 log는 immutable
- 수정은 미래 occurrence 계산에만 반영
- 수정 영향이 큰 경우 “변경은 이후 일정에 적용됩니다” 같은 안내 문구를 표시한다

예상 예외:

- invalid recurrence config
- network error
- auth expired
- server mutation conflict-like race

후속 액션:

- mutation 성공 후 미래 occurrence를 다시 계산한다.
- 홈, 캘린더, 히스토리에서 서버 기준 최신 상태를 다시 반영한다.
- 현재 기기 기준 notification sync를 다시 실행한다.
- 동일 occurrence가 다른 기기에서 먼저 처리된 경우 최신 상태를 재조회하고 짧은 안내 메시지를 1회 표시한다.

## 13. Delete Item Flow

### deleteItem(itemId)

1. 사용자 액션은 delete로 보이되, 현재 스키마 기준 내부 상태는 `is_archived = true`로 반영
2. future notification 취소
3. 홈, 캘린더, 히스토리에서 제외

전제조건:

- 삭제 대상 item을 현재 사용자 소유 데이터로 확인할 수 있어야 한다.
- 현재 기기 알림 예약 metadata를 조회할 수 있어야 한다.

예상 예외:

- network error
- auth expired

후속 액션:

- 미래 occurrence와 관련된 현재 기기 알림을 취소한다.
- 홈, 캘린더, 히스토리에서 archive 반영 후 서버 기준 최신 상태를 다시 반영한다.

## 14. Notification Sync Logic

### syncNotificationsForCurrentDevice(userId, deviceId, nowUtc)

1. 현재 사용자 timezone 조회
2. `notificationsEnabled = true` 아이템 조회
3. `range = [now, now + 14 days]`
4. 각 아이템 occurrence 계산
5. `scheduled` 상태만 추림
6. 현재 기기의 기존 예약 메타데이터 조회
7. 유효하지 않은 예약 취소
8. 새 예약 생성
9. device notification metadata upsert

전제조건:

- `userId`, `deviceId`, `nowUtc`가 모두 현재 실행 컨텍스트와 일치해야 한다.
- 사용자 timezone과 알림 대상 item 데이터를 조회할 수 있어야 한다.
- 현재 기기의 기존 예약 metadata를 읽고 쓸 수 있어야 한다.

예상 예외:

- notification permission denied
- network error
- auth expired
- invalid recurrence config

후속 액션:

- 유효하지 않은 예약은 취소하고 새 예약 결과를 metadata에 반영한다.
- 실패 시 재시도 가능한 동기화 경로를 남기고, 서버 데이터를 source of truth로 유지한다.

device-scoped metadata 예시:

- itemId
- scheduledAtUtc
- localNotificationId
- deviceId

## 15. Multi-device Notes

목표:

- MVP에서는 완전한 충돌 해결까지 다루지 않지만, 구조는 확장 가능해야 함

규칙:

- completion log는 append-only 성격 유지
- row마다 `createdAt`, `updatedAt` 유지
- item 업데이트 후 서버 재조회
- 기기별 notification reservation은 분리 저장

향후 문제 영역:

- 같은 occurrence를 여러 기기에서 동시에 completed
- item 수정 경쟁 상태
- 동일 계정의 다중 기기 알림 정책

## 16. Validation Rules

- title: required
- recurrenceType: required
- intervalValue: interval 계열에서는 required, 1 이상
- weekdayMask: weekly / interval_weeks에서는 최소 1개 필요
- startDateLocal: required
- reminderTimeLocal: required for MVP
- timezone: valid IANA string

## 17. Pseudocode Example

```ts
function resolveOccurrenceStatus(
  scheduledAtUtc: string,
  logsByOccurrence: Map<string, CompletionLog>,
  nowUtc: string,
  timezone: string,
): OccurrenceStatus {
  const log = logsByOccurrence.get(scheduledAtUtc);

  if (log?.action === "completed") return "completed";
  if (log?.action === "skipped") return "skipped";
  if (scheduledLocalDate < todayLocalDate) return "overdue";
  return "scheduled";
}
```

```ts
function shouldIncludeInToday(
  localDate: string,
  todayLocalDate: string,
  status: OccurrenceStatus,
) {
  return localDate === todayLocalDate && status === "scheduled";
}
```

## 18. Guidance Summary

구현 우선순위:

1. recurrence domain pure functions
2. occurrence identity
3. status resolution
4. completion/skip mutations
5. notification sync orchestration

핵심 로직은 반드시 UI 바깥 domain layer에서 테스트 가능해야 합니다.
