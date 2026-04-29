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
- `notificationsEnabled = false`인 version은 알림 발송 대상에서 제외된다.
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
- 첫 occurrence는 start date 이상인 가장 가까운 선택 weekday다
- start date가 선택 weekday가 아니면 start date 당일 occurrence는 만들지 않는다

### interval_weeks

- start date가 속한 주를 기준으로 `n`주마다 발생
- weekday가 하나도 없으면 invalid
- 첫 occurrence도 start date 이상인 선택 weekday만 허용한다
- start date가 속한 주의 선택 weekday가 이미 지났으면 다음 유효 interval 주차에서 찾는다

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
4. 관련 쿼리 무효화
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

- mutation 성공 후 서버 기준 홈, 목록, 상세 데이터를 다시 읽는다.
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

- mutation 성공 후 서버 기준 홈, 목록, 상세 데이터를 다시 읽는다.
- 현재 기기 기준 notification sync를 다시 실행한다.

## 12. Edit Item Flow

### editItem(item)

1. item 메타와 기존 version 목록 조회
2. 메타만 바뀌면 item 메타만 저장
3. 규칙 영향 필드가 바뀌면 `effectiveFromUtc` 확정
4. 수정 시점 이후 첫 future occurrence local date 계산
5. 새 schedule version 저장
6. 과거 completion log는 유지
7. mutation 직후 미래 원격 푸시 job을 재계산

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
- 홈, 목록, 상세, 캘린더에서 서버 기준 최신 상태를 다시 반영한다.
- 서버 발송 job을 다시 계산한다.
- job 재계산 대상은 `scheduled_at_utc >= effective_from_utc` 미래 범위로 제한한다.
- 동일 occurrence가 다른 기기에서 먼저 처리된 경우 최신 상태를 재조회하고 짧은 안내 메시지를 1회 표시한다.

## 13. Delete Item Flow

### deleteItem(itemId)

1. 사용자 액션은 delete로 보이되, 현재 스키마 기준 내부 상태는 `is_archived = true`로 반영
2. archive와 pending/retrying notification job 취소는 서버 RPC에서 함께 처리
3. 홈, 목록, 캘린더에서 제외

전제조건:

- 삭제 대상 item을 현재 사용자 소유 데이터로 확인할 수 있어야 한다.

예상 예외:

- network error
- auth expired

후속 액션:

- 미래 occurrence와 관련된 서버 발송 job을 취소한다.
- worker는 발송 직전 archived/missing item을 다시 확인하고 provider 요청 없이 job을 취소한다.
- 홈, 목록, 캘린더에서 archive 반영 후 서버 기준 최신 상태를 다시 반영한다.

## 14. Notification Delivery Logic

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
- stale job은 삭제하지 않고 `cancelled`로 전환한다.

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

payload 식별 규칙:

- 원격 푸시 payload는 `notificationKind`, `source`, `itemId`, `scheduledAtUtc`를 필수로 포함한다.
- `notificationKind = 'reminder'`는 MVP 알림 유형을 식별한다.
- `source = 'recurring-item'`는 상세 이동 대상 엔티티 계열을 식별한다.
- `itemId`는 상세 이동 대상 반복 항목을 식별한다.
- `scheduledAtUtc`는 대상 occurrence를 식별한다.
- payload 필수 필드가 없거나 허용 값이 아니면 앱은 상세 이동을 수행하지 않는다.
- token, device, provider 식별자는 사용자-facing payload 필수 필드가 아니다.

상세 이동 mapping:

- `notificationKind = 'reminder'`와 `source = 'recurring-item'`만 route 생성 대상이다.
- route는 `/items/[itemId]`다.
- `itemId`는 반복 항목 상세 path parameter로 전달한다.
- `scheduledAtUtc`는 상세 화면 기준 occurrence query parameter로 전달한다.
- 알림함 목록에서 진입하면 `returnTo = '/(tabs)/home/notifications'`를 전달한다.
- OS 원격 푸시 tap에서 진입하면 `returnTo = '/home'`을 전달한다.
- mapping에 없는 알림 유형이나 대상 엔티티는 읽음 처리 외 상세 이동을 하지 않는다.
- mapping에 없는 알림 유형이나 대상 엔티티는 목록 액션 실패로 취급하지 않는다.
- route mapping은 유효하지만 대상 반복 항목이 없거나 접근할 수 없으면 상세 fallback 상태를 보여준다.
- 상세 fallback 상태는 알림함 목록 진입이면 알림함으로 돌아가고, OS 원격 푸시 tap 진입이면 홈으로 돌아간다.

inbox ingestion trigger:

- ingestion 입력은 push delivery worker의 token별 발송 결과다.
- APNs / FCM 호출이 성공 응답을 반환하면 해당 attempt를 `succeeded`로 본다.
- worker가 같은 job의 attempt 결과를 받은 직후 성공 attempt 존재 여부를 판단한다.
- 성공 attempt가 1건 이상이면 inbox 저장 대상이 된다.
- 이 판단은 기기 수신 확인, OS 표시 확인, 사용자 tap 확인을 기다리지 않는다.

inbox 생성 규칙:

- inbox row 생성 시점은 worker가 성공 attempt를 확인한 직후다.
- 발송 예정 job은 성공 attempt가 생기기 전까지 inbox 저장 대상이 아니다.
- scheduled send 대기, 실패 job, local notification, 앱 내부 이벤트는 inbox 대상이 아니다.
- local notification과 앱 내부 이벤트는 storage 요구사항과 listing 요구사항 모두에서 제외한다.
- 모든 token 발송이 실패해 job이 `retrying` 또는 `failed`가 되면 inbox row를 만들지 않는다.
- device receipt 확인과 사용자 tap 확인은 inbox 생성 조건이 아니다.
- user-facing notification identity와 collapse key는 `(user_id, item_id, item_scheduled_at_utc)`이다.
- `user_id`는 알림함 소유자, `item_id`는 반복 항목, `item_scheduled_at_utc`는 occurrence 예정 시각이다.
- 같은 사용자의 같은 반복 항목, 같은 예정 시각에 대해 여러 기기 token 발송이 성공해도 inbox row는 1개만 만든다.
- collapse는 `notification_inbox_items` upsert와 unique constraint로 보장한다.
- `source_job_id`, `push_token_ref`, `device_id`, `push_provider`는 사용자-facing inbox 고유성 기준이 아니다.
- MVP의 inbox 알림 종류는 `reminder` 하나이며, 고유성 기준에 `notification_kind`를 추가하지 않는다.
- token별 성공/실패 상세는 `notification_delivery_attempts`에만 남긴다.

inbox 필수 저장 필드:

- 대상 사용자: `user_id`
- collapse 및 상세 기준: `item_id`, `item_scheduled_at_utc`
- 발송 출처: `source_job_id`, `notification_kind`
- 사용자-facing 문구: `title`, `body`
- push payload: `payload`
- 성공 응답 시각: `delivered_at_utc`
- 사용자 액션 상태: `read_at`, `hidden_at`

payload 규칙:

- payload는 알림 탭과 inbox 상세 이동에 필요한 최소 routing 값을 포함한다.
- `notificationKind`는 `reminder`다.
- `source`는 `recurring-item`이다.
- `itemId`는 `notification_inbox_items.item_id`와 같아야 한다.
- `scheduledAtUtc`는 `notification_inbox_items.item_scheduled_at_utc`와 같아야 한다.
- provider 응답 payload와 token별 발송 결과는 이 `payload`에 병합하지 않는다.

target validation 규칙:

- inbox 생성 target 필수 값은 `user_id`, `item_id`, `item_scheduled_at_utc`, `notification_kind`, `payload.notificationKind`, `payload.source`, `payload.itemId`, `payload.scheduledAtUtc`다.
- `notification_kind`와 `payload.notificationKind`는 모두 `reminder`여야 한다.
- `payload.source`는 `recurring-item`이어야 한다.
- `payload.itemId`는 job의 `item_id`와 같아야 한다.
- `payload.scheduledAtUtc`는 job의 `item_scheduled_at_utc`와 같아야 한다.
- 필수 target 값이 없거나 빈 문자열이면 inbox row를 만들지 않는다.
- payload와 job target 값이 서로 다르면 inbox row를 만들지 않는다.
- target validation 실패는 push service 성공 응답을 취소하지 않는다.
- target validation 실패는 token별 성공 attempt와 job operation log에 남기고 사용자-facing inbox item만 생략한다.
- target validation 실패는 local notification이나 앱 내부 이벤트로 보정하지 않는다.

inbox idempotency 규칙:

- 첫 성공 응답이 같은 collapse 기준의 inbox row를 만든다.
- 같은 job이 재시도되거나 worker가 같은 job을 반복 처리해도 같은 collapse 기준의 inbox row는 추가로 만들지 않는다.
- 중복 성공 응답은 `notification_delivery_attempts`에 새 attempt로 남길 수 있다.
- 같은 collapse 기준으로 다른 `source_job_id`가 들어와도 새 사용자-facing inbox row를 만들지 않는다.
- 기존 inbox row가 있으면 `read_at`, `hidden_at`, `delivered_at_utc`를 덮어쓰지 않는다.
- 사용자가 숨긴 inbox row는 같은 occurrence 재처리로 다시 보이게 만들지 않는다.

inbox 조회 규칙:

- 목록 조회 source는 `notification_inbox_items` 단일 테이블이다.
- 사용자는 자신의 inbox row 중 `hidden_at is null`인 row만 본다.
- 조회 정렬은 `delivered_at_utc desc`다.
- 조회 결과는 성공한 원격 푸시 기반 row만 포함한다.
- 성공 여부는 inbox row 생성 시점에 확정되므로 조회 시점에 delivery job이나 attempt 상태를 다시 계산하지 않는다.
- 조회는 `notification_delivery_attempts`를 join하지 않는다.
- token별 delivery record가 여러 개 있어도 같은 `(user_id, item_id, item_scheduled_at_utc)` logical event는 목록 row 1개로 반환한다.
- route mapping에 없는 target도 이미 생성된 row라면 목록 조회에서 제외하지 않는다.
- `pending`, `processing`, `retrying` 상태의 발송 예정 job은 inbox 목록에 노출하지 않는다.
- local notification과 앱 내부 이벤트는 조회 fallback이나 임시 목록 항목으로 만들지 않는다.

inbox 표시 규칙:

- MVP 목록은 collapsed inbox row의 `title`, `body`, `delivered_at_utc`, 읽음 여부만 표시한다.
- 목록과 상세 진입 UI는 기기별 성공/실패 내역을 표시하지 않는다.
- 성공 기기 수, 실패 기기 수, provider별 요약 배지는 MVP UI에 두지 않는다.
- `device_id`, `push_token_ref`, `push_provider`, provider message id, provider 응답 요약은 사용자 UI에 노출하지 않는다.
- 기기별 delivery detail은 `notification_delivery_attempts`의 token 참조값과 provider error code로 확인한다.
- 사용자 UI는 기기별 detail을 숨긴 상태로 들고 있지 않고, 목록 조회 단계에서 아예 가져오지 않는다.

inbox 액션 규칙:

- 사용자가 inbox 알림을 탭하면 즉시 `read_at`을 기록한다.
- 읽음 처리는 상세 화면 이동 성공 여부와 분리한다.
- 지원하지 않는 target이라 상세 이동을 생략해도 해당 row의 읽음 처리는 성공해야 한다.
- 전체 읽음은 현재 사용자의 `hidden_at is null` 미읽음 row 전체를 갱신하며 target 지원 여부로 필터링하지 않는다.
- 상세 화면 이동이 실패해도 이미 탭한 inbox row는 읽음 상태를 유지한다.
- 상세 fallback 상태는 이미 기록한 `read_at`을 되돌리지 않는다.
- 상세 fallback 상태는 inbox row를 숨김 처리하거나 삭제하지 않는다.
- 상세 fallback 상태는 local notification이나 앱 내부 이벤트로 대체하지 않는다.
- 사용자가 inbox 알림을 삭제하면 해당 row의 `hidden_at`을 기록한다.
- 삭제 mutation은 `id`와 `user_id`를 함께 조건으로 사용한다.
- 삭제 mutation은 target 지원 여부를 검사하지 않는다.
- 삭제된 row는 현재 사용자 inbox 목록에서만 숨긴다.
- 삭제는 현재 사용자 소유 row에만 적용되며 다른 사용자의 row를 변경하지 않는다.
- 삭제는 `notification_delivery_jobs`와 `notification_delivery_attempts`를 변경하지 않는다.
- 삭제 flow는 `notification_delivery_jobs`를 update/delete하지 않고 delivery job/attempt 기록으로 cascade하지 않는다.
- 삭제된 row는 operation/send log 감사 목적을 위해 물리 삭제하지 않는다.

token 선택 규칙:

- `device_push_tokens.is_active = true`
- `permission_status = 'granted'`
- iOS token은 `push_provider = 'apns'`만 사용한다.
- Android token은 `push_provider = 'fcm'`만 사용한다.
- 활성 token이 여러 개면 모두 발송한다.

provider 오류 규칙:

- APNs `BadDeviceToken`, `Unregistered`는 무효 token으로 본다.
- FCM `UNREGISTERED`, `INVALID_ARGUMENT`는 무효 token으로 본다.
- 무효 token은 재시도하지 않는다.

재시도 규칙:

- 네트워크 오류, provider 5xx, rate limit만 재시도한다.
- backoff는 1분, 5분, 15분 3회다.
- `next_retry_at <= nowUtc`가 되면 같은 job을 다시 처리한다.
- 재시도 성공으로 이미 inbox row가 있는 occurrence가 다시 성공해도 inbox row는 추가 생성하지 않는다.
- 영구 실패와 무효 token은 재시도하지 않는다.

## 15. Multi-device Notes

목표:

- MVP에서는 완전한 충돌 해결까지 다루지 않지만, 구조는 확장 가능해야 함

규칙:

- completion log는 append-only 성격 유지
- row마다 `createdAt`, `updatedAt` 유지
- item 업데이트 후 서버 재조회
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
