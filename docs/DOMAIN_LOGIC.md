# Domain Logic

이 문서는 현재 코드에서 사용하는 반복 일정 규칙과 상태 계산만 정의한다.
제품 범위는 `PRODUCT_SPEC.md`, 구현 구조는 `SYSTEM_DESIGN.md`를 따른다.

## Core Model

### Recurring Item

일정은 사용자가 관리하는 반복 생활 항목이다.
일정은 제목, 설명, 시작일, 색상, 보관 여부를 가진다.
제목과 설명은 도메인에서는 평문으로 다루지만 저장소에서는 암호화된다.

### Schedule Version

반복 규칙의 source of truth는 schedule version이다.
하나의 일정은 시간순 schedule version 목록을 가진다.
현재 화면 표시는 최신 schedule version을 기준으로 한다.

schedule version은 다음 값을 가진다.

- `effectiveFromUtc`.
- `recurrenceType`.
- `intervalValue`.
- `weekdayMask`.
- `reminderTimeLocal`.
- `anchorType`.
- `seedStartDateLocal`.
- `endDateLocal`.
- `notificationsEnabled`.

### Occurrence

occurrence는 저장 row가 아니라 계산 결과다.
식별자는 `(itemId, scheduledAtUtc)`이다.

### Completion Log

completion log는 특정 occurrence에 대한 처리 기록이다.
`action`은 `completed` 또는 `skipped`만 가진다.
하나의 occurrence에는 최대 하나의 completion log만 연결된다.

## Supported Values

### Recurrence Type

- `once`.
- `daily`.
- `interval_days`.
- `weekly`.
- `interval_weeks`.
- `monthly`.
- `interval_months`.

### Anchor Type

- `fixed`: 원래 반복 규칙 기준으로 다음 occurrence를 계산한다.
- `completion_based`: 마지막 완료일을 기준으로 다음 occurrence를 계산한다.

`completion_based`는 `daily`, `interval_days`, `monthly`, `interval_months`에서만 허용한다.
`once`, `weekly`, `interval_weeks`는 고정 패턴을 유지한다.

### Occurrence Status

- `scheduled`: 아직 처리되지 않았고 local date가 오늘 또는 이후다.
- `completed`: 완료 log가 있다.
- `skipped`: 건너뛰기 log가 있다.
- `overdue`: 처리 log가 없고 local date가 오늘보다 이전이다.

### Color Key

일정 색상은 `red`, `orange`, `yellow`, `green`, `blue`, `indigo`, `purple` 중 하나다.
새 일정의 기본값은 `red`다.
일정 색상은 occurrence 상태에 따라 바뀌지 않는다.

## Validation

- 제목은 빈 문자열일 수 없다.
- 시작일은 `YYYY-MM-DD` 형식이다.
- 종료일이 있으면 `YYYY-MM-DD` 형식이다.
- 알림 시간은 필수이며 `HH:mm` 형식이다.
- 시간대는 비어 있을 수 없다.
- `interval_days`, `interval_weeks`, `interval_months`는 1 이상의 `intervalValue`가 필요하다.
- interval 규칙이 아니면 `intervalValue`를 저장하지 않는다.
- `weekly`, `interval_weeks`는 중복 없는 0~6 범위의 `weekdayMask`가 필요하다.
- weekly 규칙이 아니면 `weekdayMask`를 저장하지 않는다.
- `once`는 종료일을 저장하지 않는다.
- 종료일이 있으면 시작일보다 빠를 수 없다.
- 종료일이 있으면 시작일과 종료일 사이에 최소 1개 occurrence가 있어야 한다.
- 생성 중 시작일을 종료일보다 뒤로 바꾸면 종료일을 새 시작일로 보정한다.

## Schedule Version Policy

- 각 version의 활성 시작은 자신의 `effectiveFromUtc`다.
- 활성 끝은 다음 version의 `effectiveFromUtc` 직전이다.
- version은 자신의 `seedStartDateLocal`부터 occurrence를 만든다.
- version은 종료일이 있으면 자신의 `endDateLocal`까지 occurrence를 만든다.
- 계산 결과 중 `scheduledAtUtc < effectiveFromUtc`인 occurrence는 버린다.
- 일정 수정은 과거 occurrence를 다시 쓰지 않고 future occurrence에만 반영한다.
- 시작일은 생성 후 수정하지 않는다.
- 규칙 영향 필드가 바뀌면 새 schedule version을 추가한다.

규칙 영향 필드는 다음과 같다.

- 반복 규칙.
- interval 값.
- 요일 목록.
- 알림 시간.
- 알림 켜기/끄기.
- anchor type.
- 종료일.

## Recurrence Rules

### once

`seedStartDateLocal`과 `reminderTimeLocal`에 한 번 발생한다.

### daily

매일 같은 local time에 발생한다.

### interval_days

기준일에서 `n`일마다 발생한다.

### weekly

선택한 요일에 매주 발생한다.
첫 occurrence는 `seedStartDateLocal` 이상인 가장 가까운 선택 요일이다.

### interval_weeks

`seedStartDateLocal`이 속한 주를 기준으로 `n`주마다 선택 요일에 발생한다.
주의 시작은 일요일이다.
이미 지난 선택 요일은 첫 occurrence로 만들지 않는다.

### monthly

기준일의 day-of-month로 매달 발생한다.

### interval_months

기준일의 day-of-month로 `n`달마다 발생한다.

## Day Correction

월 단위 반복에서 대상 월에 같은 날짜가 없으면 그 달의 마지막 날로 보정한다.

예시:

- 1월 31일 매달 반복은 2월 28일 또는 29일, 3월 31일, 4월 30일로 이어진다.

## Time Construction

입력 날짜와 시각은 사용자 timezone의 local 의미로 해석한다.
저장과 비교는 UTC ISO 문자열을 사용한다.

절차:

1. `localDate`와 `reminderTimeLocal`을 결합한다.
2. 사용자 timezone에서 해석한다.
3. UTC로 변환한다.

## Anchor Rules

### fixed

항상 schedule version의 반복 규칙과 기준일을 따른다.
완료 시점은 다음 occurrence 계산 기준을 바꾸지 않는다.

### completion_based

마지막 `completed` log의 실제 처리일을 다음 계산 기준으로 사용한다.
`skipped`는 기준을 이동시키지 않는다.
새 schedule version 시작 시에는 `effectiveFromUtc` 이전 마지막 완료일을 초기 기준으로 사용할 수 있다.
종료일은 완료한 날짜가 아니라 occurrence local date 기준으로 적용한다.

미해결 occurrence가 남아 있는 완료일 기준 일정은 다음 알림 후보를 만들지 않는다.
사용자가 완료 또는 건너뛰기 처리한 뒤 다음 occurrence가 다시 계산된다.

## Status Resolution

상태 계산 순서는 다음과 같다.

1. 같은 `scheduledAtUtc`의 completion log를 찾는다.
2. log가 `completed`면 `completed`.
3. log가 `skipped`면 `skipped`.
4. log가 없고 scheduled local date가 오늘보다 이전이면 `overdue`.
5. 나머지는 `scheduled`.

오늘 날짜의 예정 시각이 이미 지나도 같은 local date이면 `scheduled`로 남는다.
지난 일정 여부는 시각이 아니라 local date 기준이다.

## Projections

### Home

홈은 occurrence 처리를 위한 projection을 만든다.

- 선택 날짜 섹션은 해당 local date의 `scheduled` occurrence를 보여준다.
- 오늘을 선택하면 지난 일정과 다가오는 일정도 함께 보여준다.
- 지난 일정은 각 일정별 최신 overdue occurrence를 우선 보여준다.
- 다가오는 일정은 오늘 이후 14일 범위의 `scheduled` occurrence를 보여준다.

### Schedule List

목록은 각 일정의 다음 `scheduled` occurrence를 계산한다.
다음 occurrence가 없으면 `예정 없음`으로 표시한다.
종료일이 지난 일정도 보관되지 않았으면 목록에 남긴다.

### Calendar

달력은 보이는 월 범위의 occurrence를 계산한다.
날짜 셀 marker는 일정 색상을 사용한다.
선택 날짜 목록은 occurrence 상태를 함께 보여준다.

### Detail

상세는 지난 일정이 있으면 최신 overdue occurrence를 대표 상태로 사용한다.
지난 일정이 없으면 다음 occurrence를 사용한다.

## Occurrence Actions

완료와 건너뛰기는 홈에서만 수행한다.

처리 절차:

1. 대상 occurrence를 확정한다.
2. 이미 completion log가 있는 occurrence는 새 기록을 만들지 않는다.
3. 지난 일정이면 대상 이전의 미해결 overdue occurrence도 함께 처리한다.
4. completion log를 생성한다.
5. 관련 쿼리를 무효화한다.
6. 현재 기기의 로컬 알림을 다시 맞춘다.

`completion_based` 일정의 `completed`는 완료일 기준 anchor를 이동시킨다.
`skipped`는 해당 occurrence만 소비하고 anchor를 이동시키지 않는다.

## Edit And Archive

수정은 메타 변경과 규칙 변경을 구분한다.

- 제목, 설명, 색상, 보관 여부만 바뀌면 item 메타만 갱신한다.
- 규칙 영향 필드가 바뀌면 새 schedule version을 추가한다.
- 새 version의 `seedStartDateLocal`은 수정 시점 이후 첫 future occurrence local date다.
- 종료일 변경은 새 schedule version을 추가한다.
- 종료일 제거는 수정 시점 이전의 occurrence를 새로 만들지 않는다.
- 과거 completion log는 유지한다.

삭제는 물리 삭제가 아니라 `isArchived = true`로 저장한다.
보관된 일정은 활성 화면과 future local notification 후보에서 제외한다.
