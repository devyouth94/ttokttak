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
  startDateLocal: string; // YYYY-MM-DD
  timezone: string;
  isArchived: boolean;
  createdAt: string; // UTC ISO
  updatedAt: string; // UTC ISO
}

export interface RecurringItemScheduleVersion {
  id: string;
  itemId: string;
  userId: string;
  effectiveFromUtc: string; // UTC ISO
  recurrenceType: RecurrenceType;
  intervalValue?: number | null;
  weekdayMask?: number[] | null;
  reminderTimeLocal: string; // HH:mm
  notificationsEnabled: boolean;
  anchorType: AnchorType;
  seedStartDateLocal: string; // YYYY-MM-DD
  createdAt: string; // UTC ISO
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

- `RecurringItem`은 item identity와 메타를 가진다.
- recurrence 관련 source of truth는 `RecurringItemScheduleVersion` 목록이다.
- `occurrence`는 `RecurringItem`과 로그를 기준으로 계산되는 파생 개념이며 별도 row로 저장하지 않는다.
- `recurrenceType`이 `interval_days`, `interval_weeks`, `interval_months`면 `intervalValue`가 필요하다.
- `recurrenceType`이 `weekly`, `interval_weeks`면 `weekdayMask`가 필요하다.
- `startDateLocal`은 항목의 원래 시작점이며 생성 후 수정하지 않는다.
- `seedStartDateLocal`은 해당 version이 책임지는 첫 future occurrence local date다.
- `reminderTimeLocal`은 local timezone 기준 예정 시각이다.
- 생성 시 시작일이 오늘이면 알림 시간이 이미 지났더라도 첫 occurrence는 오늘로 유지한다.
- MVP에서는 `reminderTimeLocal`을 필수 입력으로 보고 검증한다.
- `notificationsEnabled = false`여도 overdue 판단과 정렬 기준이 필요하므로 값은 유지한다.
- `notificationsEnabled = false`인 version은 알림 예약 대상에서는 제외된다.
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

## 2.1 Schedule Version Policy

- 각 item은 시간순 `schedule version` 목록을 가진다.
- version 활성 구간 시작은 자신의 `effectiveFromUtc`다.
- version 활성 구간 끝은 다음 version의 `effectiveFromUtc` 직전이다.
- version은 자신의 `seedStartDateLocal`부터 occurrence를 생성한다.
- 생성 결과 중 `scheduledAtUtc < effectiveFromUtc` 값은 버린다.
- 수정은 과거 occurrence를 다시 계산하지 않고 미래 occurrence만 바꾼다.

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
- 새 version 시작 시 edit 이전 마지막 `completed`는 초기 anchor 결정에만 사용한다.
- 새 version occurrence는 `seedStartDateLocal` 이후부터만 생성한다.

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
  scheduleVersions,
  rangeStartUtc,
  rangeEndUtc,
  timezone,
  completionLogs
);
```

- 지정 범위 내 occurrence 계산
- 각 occurrence의 상태까지 resolve
- item 메타, schedule version 목록, completion log를 함께 사용한다.

### getNextOccurrence

```ts
getNextOccurrence(item, scheduleVersions, nowUtc, timezone, completionLogs);
```

- 현재 이후 가장 가까운 occurrence 계산
- version 경계를 따라 현재 시점 이후 첫 future occurrence를 찾는다.

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

## 10. Occurrence Action Visibility

완료, 건너뛰기 같은 occurrence 액션은
현재 처리 가능한 미해결 occurrence에만 노출한다.

기준:

- 상세 화면이 특정 occurrence를 기준으로 열렸다면 그 occurrence의 상태와 날짜를 기준으로 판단
- `status == overdue`면 노출
- `status == scheduled` 이고 `localDate == today(local timezone)`면 노출
- `status == scheduled` 이지만 오늘 이후 future date면 숨김
- `status == completed`면 숨김
- `status == skipped`면 숨김
- 대표 occurrence가 없으면 숨김

의도:

- 과거 기록 기준 상세와 현재 actionable occurrence를 섞어서 보이지 않는다.
- 이미 처리한 occurrence에는 중복 액션을 보이지 않는다.
- future occurrence에는 성급한 처리 액션을 보이지 않는다.
- 오늘 일정과 놓친 일정만 바로 처리할 수 있게 한다.
- 홈 화면과 상세 화면이 같은 기준을 사용한다.

## 11. Completion Flow

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

1. item 메타와 기존 version 목록 조회
2. 메타만 바뀌면 item 메타만 저장
3. 규칙 영향 필드가 바뀌면 `effectiveFromUtc` 확정
4. 수정 시점 이후 첫 future occurrence local date 계산
5. 새 schedule version 저장
6. 과거 completion log는 유지
7. 앱 시작 또는 즉시 sync에서 미래 알림만 재예약

전제조건:

- item validation rules를 먼저 통과해야 한다.
- 현재 사용자 세션과 사용자 timezone이 유효해야 한다.
- 수정 대상 item을 서버 기준 최신 상태로 읽을 수 있어야 한다.

MVP 확정 정책:

- 과거 log는 immutable
- 수정은 미래 occurrence 계산에만 반영
- `startDateLocal`은 edit 모드와 저장 계층 모두에서 수정 불가
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
- notification sync 삭제 대상은 `scheduled_at_utc >= effective_from_utc` 미래 reservation으로 제한한다.
- 동일 occurrence가 다른 기기에서 먼저 처리된 경우 최신 상태를 재조회하고 짧은 안내 메시지를 1회 표시한다.

## 13. Delete Item Flow

### deleteItem(itemId)

1. 사용자 액션은 delete로 보이되, 현재 스키마 기준 내부 상태는 `is_archived = true`로 반영
2. future notification 취소
3. 홈, 캘린더, 히스토리에서 제외

전제조건:

- 삭제 대상 item을 현재 사용자 소유 데이터로 확인할 수 있어야 한다.

예상 예외:

- network error
- auth expired

후속 액션:

- 미래 occurrence와 관련된 서버 발송 job을 취소한다.
- 홈, 캘린더, 히스토리에서 archive 반영 후 서버 기준 최신 상태를 다시 반영한다.

## 14. Notification Delivery Logic

### syncRemoteNotificationDeliveryJobs(userId, nowUtc)

1. 현재 사용자 timezone 조회
2. `notificationsEnabled = true` 아이템 조회
3. `range = [now, now + 14 days]`
4. 각 아이템 occurrence 계산
5. `scheduled` 상태만 추림
6. 기존 서버 발송 job 조회
7. 유효하지 않은 job 취소
8. 새 job upsert

전제조건:

- `userId`, `nowUtc`가 모두 현재 실행 컨텍스트와 일치해야 한다.
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

### syncRemotePushJobs(userId, nowUtc)

1. 현재 사용자 timezone 조회
2. `notificationsEnabled = true` 아이템 조회
3. `range = [now, now + 14 days]`
4. 각 아이템 occurrence 계산
5. `scheduled` 상태만 추림
6. occurrence별 `dedupeKey` 생성
7. future job upsert
8. 필요 없는 future job cancel

dedupe key 규칙:

- `reminder:${userId}:${itemId}:${scheduledAtUtc}`
- 같은 occurrence에는 job이 1개만 존재한다.
- 재시도는 같은 job row에서 처리한다.

job 상태 규칙:

- `pending`: 아직 발송 시각 전이거나 첫 발송 대기
- `processing`: worker가 현재 fan-out 중
- `retrying`: 재시도 대기 중
- `succeeded`: 모든 활성 token 발송 성공
- `partially-failed`: 일부 token만 성공
- `failed`: 재시도 종료 후 최종 실패
- `cancelled`: 더 이상 보낼 필요가 없음

cancel 규칙:

- item archive 시 future job을 `cancelled`로 전환한다.
- completion / skip 시 해당 occurrence와 future 재계산 범위 밖 job을 `cancelled`로 전환한다.
- edit 시 `effective_from_utc` 이후 future job만 다시 계산한다.
- 활성 token이 없으면 `cancel_reason = 'no-active-tokens'`로 끝낸다.

attempt 기록 규칙:

- APNs / FCM 호출마다 token별 attempt row를 1건 남긴다.
- 성공과 실패를 모두 기록한다.
- provider message id와 provider error code를 함께 저장한다.
- 무효 token 오류면 해당 token을 `delivery-failed`로 비활성화한다.

재시도 규칙:

- 네트워크 오류, provider 5xx, rate limit만 재시도한다.
- backoff는 1분, 5분, 15분 3회다.
- `next_retry_at <= nowUtc`가 되면 같은 job을 다시 처리한다.
- 영구 실패와 무효 token은 재시도하지 않는다.

## 15. Multi-device Notes

목표:

- MVP에서는 완전한 충돌 해결까지 다루지 않지만, 구조는 확장 가능해야 함

규칙:

- completion log는 append-only 성격 유지
- row마다 `createdAt`, `updatedAt` 유지
- item 업데이트 후 서버 재조회
- 기기별 notification reservation은 분리 저장
- 원격 푸시는 활성 token 전체 fan-out을 기본값으로 사용
- token 실패는 기기 전체 실패가 아니라 token 단위로 기록

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
  timezone: string
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
  status: OccurrenceStatus
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
