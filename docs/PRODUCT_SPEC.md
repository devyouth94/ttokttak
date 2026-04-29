# Product Spec

## 1. Product Summary

**Product working title:** Personal Recurring Schedule App

**One-line definition:**  
반복되는 생활 항목을 등록하고 알림을 받아 실행을 돕는 개인 반복 일정 앱.

### Document role

- 이 문서는 제품 범위, 사용자 시나리오, 화면 요구사항, 제품 수준 결정을 정의한다.
- 구현 순서와 검토 단위는 `IMPLEMENTATION_PLAN.md`를 따른다.
- 화면 시안 검토가 필요하면 이 문서의 화면 요구사항과 UX 방향을 기준으로 한다.
- 시스템 구조, 구성요소 책임, 데이터 흐름은 `SYSTEM_DESIGN.md`를 따른다.
- 반복 계산, 상태 판정, 알림 동기화 규칙의 세부 동작은 `DOMAIN_LOGIC.md`를 따른다.

### Product boundary

이 앱은 전통적인 habit tracker보다 범위가 넓다. 예를 들어 다음 항목을 다룬다.

- 매일 오전 9시에 복용하는 약
- 3일마다 복용하는 약
- 매일 저녁 해야 하는 필사, 듀오링고
- 1달마다 교체해야 하는 면도기 날
- 3개월마다 교체해야 하는 칫솔
- 1년에 한 번 해야 하는 엔진오일 교체

핵심은 습관 자체보다 **반복 주기가 있는 생활 항목을 등록하고, 알림 받고, 완료 또는 건너뜀 처리하고, 히스토리를 남기는 것**이다.

### Core terminology

- **생활 항목(item)**: 사용자가 관리하려는 반복 대상
- **반복 일정 항목(recurring item)**: 반복 규칙, 시작일, 알림 설정을 가진 생활 항목
- **반복 규칙(recurrence rule)**: `once`, `daily`, `interval_days`, `weekly`, `interval_weeks`, `monthly`, `interval_months`, `yearly` 중 하나의 주기 정의
- **occurrence**: 반복 일정 항목에서 계산으로 파생되는 개별 예정 시점
- **completion log**: 특정 occurrence에 대해 `completed` 또는 `skipped`를 기록한 로그
- **anchor type**: 다음 occurrence 계산 기준
- **`fixed`**: 원래 예정 규칙 기준
- **`completion_based`**: 실제 완료 시점 기준
- **occurrence status**: occurrence의 현재 상태. `scheduled`, `completed`, `skipped`, `overdue`를 사용한다
- **reminder time**: occurrence를 local timezone에서 언제 실행할지 정하는 시각
- **user timezone**: 입력 해석, 화면 표시, local datetime 계산의 기준이 되는 사용자 timezone
- 사용자-facing 화면에서는 반복 관리 대상을 기본적으로 `일정`이라고 부른다.
- `알림`은 notification 의미에만 사용한다.

위 용어를 기준으로 이후 문서에서 같은 개념을 동일하게 사용한다.

---

## 2. Problem

기존 습관 앱은 주로 매일 반복되는 루틴에 맞춰져 있다. 하지만 실제 생활에는 아래와 같은 패턴이 많다.

- 매일 / n일 / 매주 / n주 / 매달 / n달 / n년
- 정해진 시간에 해야 하는 일
- 완료 시점 기준으로 다음 일정이 잡혀야 하는 일
- 해야 했지만 놓친 일정
- 복용, 교체, 정비, 실천 같은 서로 다른 종류의 반복 항목

즉, 사용자는 단순한 체크리스트보다 **주기성 있는 생활 항목을 안정적으로 관리하는 도구**가 필요하다.

---

## 3. Target Users

### Primary target

- 일반 사용자
- 반복되는 생활 관리 항목을 잊지 않고 챙기고 싶은 사람

### Example users

- 약 복용 알림이 필요한 사용자
- 정기적인 교체/정비 항목을 챙기고 싶은 사용자
- 루틴 실천과 생활 유지 항목을 한 앱에서 관리하고 싶은 사용자

---

## 4. Product Goals

### Primary goals

1. 반복 일정을 빠르게 등록할 수 있어야 한다.
2. 신뢰할 수 있는 알림을 제공해야 한다.
3. 오늘 해야 할 일, 다가오는 일정, 미완료 일정을 쉽게 확인할 수 있어야 한다.
4. 완료/건너뜀 처리 후 다음 일정이 예측 가능하게 계산되어야 한다.
5. 로그인 기반으로 데이터를 보존하고 장기적으로 멀티 디바이스 확장이 가능해야 한다.

### Non-goals for MVP

- snooze
- 협업
- AI 기능
- 복잡한 통계/그래프
- 고급 일정 편집
- 완전한 오프라인 지원
- 위젯에서 직접 완료 액션

---

## 5. Core User Scenarios

### Scenario A: 약 복용 일정 등록

1. 사용자는 “탈모약” 항목을 생성한다.
2. 반복 규칙을 “매일”로 선택한다.
3. 시간을 “오전 9시”로 설정한다.
4. 알림을 활성화한다.
5. 홈 화면과 위젯에서 오늘 할 일로 노출된다.
6. 오전 9시에 알림을 받는다.
7. 사용자는 홈에서 즉시 완료 처리한다.

### Scenario B: 교체형 항목 등록

1. 사용자는 “칫솔 교체” 항목을 생성한다.
2. 반복 규칙을 “3개월마다”로 설정한다.
3. 기본은 고정형(fixed)으로 생성된다.
4. 더보기 옵션에서 “완료한 날짜 기준으로 다음 일정 계산”을 활성화한다.
5. 완료 시점 기준으로 다음 일정이 재계산된다.

### Scenario C: 일정 놓침

1. 사용자는 오늘 해야 하는 항목을 완료하지 못했다.
2. 오늘 날짜가 지나기 전까지는 오늘 섹션에 남아 있다.
3. 날짜가 넘어가면 해당 occurrence는 자동으로 넘어가지 않고 overdue 상태가 된다.
4. 홈 화면의 overdue 섹션에서 확인할 수 있다.
5. 사용자는 나중에 완료 또는 건너뜀 처리할 수 있다.

---

## 6. MVP Feature Scope

### Included

- 회원가입/로그인
  - Supabase Auth
  - Google / Apple 로그인 연동 가능 구조
- 반복 일정 생성 / 수정 / 삭제
- 반복 규칙 설정
  - 한 번
  - 매일
  - n일마다
  - 매주
  - n주마다
  - 매달
  - n달마다
  - n년마다
- 알림 시간 설정
- 고급 옵션
  - 기본값: 고정형(fixed)
  - 옵션: 완료한 날짜 기준(completion_based)
- 홈 화면
  - Today
  - Upcoming
  - Overdue
- 일정 목록 화면
  - 등록된 일정 조회
  - 정렬 변경
- 완료 / 건너뜀
- 항목 상세의 최근 히스토리 조회
- 달력 화면
  - read-only
  - scheduled / completed / overdue 상태 확인
- 읽기 전용 위젯
- 알림 권한 UX
- 멀티 디바이스 확장 가능한 데이터 구조

### Excluded

- Snooze
- 자동 미루기
- 반복 재알림
- 팀 공유
- 소셜 기능
- 통계 대시보드
- 위젯 직접 액션
- 완전한 충돌 해결 UX

---

## 7. Key Product Decisions

### 7.1 Schedule calculation mode

- 기본값은 `fixed`
- 사용자가 더보기 옵션에서 `completion_based`를 선택할 수 있다
- MVP에서는 `completion_based`를 `once`, `daily`, `interval_days`, `monthly`, `interval_months`, `yearly`에만 노출한다
- `weekly`, `interval_weeks`는 사용자 기대가 요일 패턴에 더 가깝기 때문에 MVP에서는 `fixed`만 지원한다
- `completion_based`에서는 `completed`만 다음 일정 계산 기준을 이동시키고 `skipped`는 이동시키지 않는다

### 7.1.1 Reminder time requirement

- `reminder_time_local`은 알림 발송 여부와 무관하게 모든 item의 필수 값이다
- `notifications_enabled = false`여도 예정 시각 계산, 정렬, 화면 표시 기준으로 사용한다
- 현재 규칙 조회와 화면 표시는 latest schedule version 기준으로 해석한다
- 생성 시 시작일이 오늘이면 알림 시간이 이미 지났더라도 첫 occurrence는 오늘로 유지한다

#### fixed

원래 예정일 기준으로 다음 일정을 계산한다.

#### completion_based

실제 완료한 날짜를 기준으로 다음 일정을 계산한다.

---

### 7.1.2 Multi-device duplicate action handling

- 같은 occurrence를 여러 기기에서 거의 동시에 처리하면 서버 기준 최신 상태를 다시 조회한다
- 사용자에게는 "이미 다른 기기에서 처리되어 목록을 새로고침했습니다" 수준의 짧은 안내 메시지를 1회 표시한다
- 완전한 충돌 해결 UX는 MVP 범위에 포함하지 않는다

---

### 7.1.3 Item edit history handling

- item 수정 시 과거 log는 유지한다
- 변경 내용은 미래 occurrence 계산에만 반영한다
- `startDateLocal`은 생성 후 수정할 수 없다
- 규칙 영향 수정은 기존 규칙 overwrite가 아니라 새 schedule version 추가로 저장한다
- 수정 영향이 큰 경우 "변경은 이후 일정에 적용됩니다" 수준의 안내 문구를 표시한다

---

### 7.2 Missed items

- 완료/건너뜀을 하지 않은 일정은 자동으로 다음날로 밀리지 않는다
- 상태는 `overdue`
- 자동 미루기 기능은 MVP에서 제외한다

---

### 7.3 Home sections

홈 화면은 아래 3개 섹션으로 구성한다.

1. **Today**
   - 오늘 발생하는 scheduled occurrence
2. **Upcoming**
   - 앞으로 예정된 occurrence
3. **Overdue**
   - 최근 overdue 항목 중심으로 노출

---

### 7.4 Completion UX

- 홈에서 바로 완료 가능
- 상세 화면에서도 완료 가능
- 스와이프 액션은 제외
- 체크 후 자연스럽게 사라지는 UX 적용

---

### 7.5 Notification strategy

- 알림은 예정 시각 1회만 발송
- 항목 생성/수정/삭제/완료/건너뜀 시 관련 원격 푸시 발송 job을 재계산
- 앞으로 14일 범위의 occurrence만 발송 job으로 관리
- 항목 수정 시에는 수정 시점 이후 미래 job만 재조정 대상으로 본다
- MVP 알림함은 성공 응답을 받은 원격 푸시만 저장하고 목록에 노출한다
- 원격 푸시 payload는 알림 유형과 대상 반복 항목을 식별할 수 있어야 한다
- 알림함 저장 target에는 사용자, 반복 항목, occurrence 예정 시각이 모두 있어야 한다
- target 정보가 누락되었거나 허용되지 않은 알림 유형이면 알림함 item을 만들지 않는다
- 알림함 row의 사용자-facing identity는 `(user_id, item_id, item_scheduled_at_utc)`이다
- 알림함 row는 대상 사용자, 반복 항목, 예정 시각, 원격 푸시 payload, 상세 이동 target을 함께 저장한다
- 알림함 row는 원격 푸시 발송 job과 별도 저장소에 둔다
- MVP 상세 이동 target은 `notificationKind = "reminder"`와 `source = "recurring-item"` 조합만 허용한다
- 이 조합의 상세 이동 route는 `/items/[itemId]`이며, `scheduledAtUtc`를 기준 occurrence 시각으로 전달한다
- 허용되지 않은 알림 유형이나 대상 엔티티 조합은 상세 이동을 수행하지 않는다
- 허용되지 않은 상세 이동 target도 알림함 row가 이미 만들어졌다면 목록에 남기고 일반 알림과 같은 읽음/삭제 액션을 허용한다
- 상세 이동 target을 열 수 없으면 알림함 item은 읽음 상태로 유지하고 fallback 안내를 표시한다
- fallback 안내는 알림함 item을 숨기거나 삭제하지 않는다
- fallback 안내는 local notification이나 앱 내부 이벤트로 대체 항목을 만들지 않는다
- 저장 기준은 worker가 APNs / FCM 성공 응답을 받은 시점이며, 기기 수신 확인과 사용자 tap 확인은 요구하지 않는다
- 발송 예정 job은 원격 푸시 성공 응답을 받기 전까지 알림함 저장 대상이 아니다
- 같은 사용자, 반복 항목, 예정 시각에 대해 여러 기기 발송이 성공해도 사용자 알림은 1건만 노출한다
- 알림함 목록 조회는 `notification_inbox_items`의 collapsed row를 기준으로 하며 token별 delivery record를 펼쳐서 목록을 만들지 않는다
- 알림함 UI는 collapsed 알림의 제목, 본문, 전달 시각, 읽음 여부만 표시한다
- 기기별 성공/실패 내역과 성공 기기 수 요약은 MVP UI에 표시하지 않는다
- `source_job_id`, `device_id`, `push_token_ref`, provider, provider 응답 요약은 사용자-facing identity에 포함하지 않는다
- `device_id`, `push_token_ref`, provider message id, provider 응답 요약은 사용자-facing 알림함 UI에 노출하지 않는다
- worker 재시도나 같은 send job 반복 처리로 같은 사용자, 반복 항목, 예정 시각의 성공 응답이 다시 기록되어도 알림함 item은 새로 만들지 않는다
- 중복 성공 응답은 `notification_delivery_attempts`에 token 단위 operation log로만 남기고 기존 알림함 item의 읽음/숨김 상태를 되돌리지 않는다
- 로컬 알림은 MVP 알림함 저장 대상과 목록 조회 대상에서 제외한다
- 앱 내부 이벤트는 MVP 알림함 저장 대상과 목록 조회 대상에서 제외한다
- 사용자가 알림을 탭하면 상세 이동 성공 여부와 관계없이 즉시 읽음 처리한다
- 전체 읽음 처리는 현재 사용자의 보이는 미읽음 row 전체에 적용하며 상세 이동 target 지원 여부로 제외하지 않는다
- 알림함 삭제는 현재 사용자의 inbox row만 `hidden_at`으로 숨긴다
- 알림함 삭제는 상세 이동 target 지원 여부와 관계없이 현재 사용자 row에 적용할 수 있다
- 알림함 삭제는 다른 사용자의 row에 영향을 주지 않는다
- 알림함 삭제는 발송 job, token별 attempt, provider 응답 로그를 삭제하거나 변경하지 않는다
- 알림함 삭제 flow는 `notification_delivery_jobs`를 update/delete하지 않고 delivery job/attempt 기록으로 cascade하지 않는다
- 구성요소 책임과 발송 흐름은 `SYSTEM_DESIGN.md`의 Notification Design을 따른다.
- 상태 계산과 동기화 절차의 세부 규칙은 `DOMAIN_LOGIC.md`의 Notification Delivery Logic을 따른다.

---

### 7.6 Occurrence persistence strategy

- occurrence는 저장된 row로 두지 않는다
- item 메타, schedule version 목록, completion/skip 로그, 사용자 timezone을 기준으로 계산한다
- 계산 책임과 파생 데이터 구조는 `SYSTEM_DESIGN.md`를 따른다.
- 식별 규칙과 계산 함수는 `DOMAIN_LOGIC.md`를 따른다.

---

### 7.7 Month-based recurrence edge handling

- 월 단위 규칙에서 시작일이 29, 30, 31일일 수 있다
- 해당 월에 같은 날짜가 없으면 그 달의 마지막 날로 보정한다

---

### 7.8 Item edit effect policy

- 과거 completion/skip 히스토리는 유지한다
- 항목 수정은 이후 occurrence 계산에만 반영한다
- `startDateLocal`은 생성 후 수정할 수 없다
- 규칙 영향 필드 수정은 latest schedule version을 갱신하는 방식이 아니라 새 schedule version 추가로 저장한다
- 현재 규칙 표시는 latest schedule version 기준으로 읽는다

---

### 7.9 Timezone strategy

- UTC 저장
- 사용자 timezone 별도 저장
- 입력/표시 기준은 사용자 timezone
- 알림 발송 시각은 UTC로 변환
- 저장 패턴과 해석 규칙은 `SYSTEM_DESIGN.md`와 `DOMAIN_LOGIC.md`를 따른다.

---

### 7.10 Device strategy

- 서버는 source of truth
- 멀티 디바이스 확장 가능하게 설계
- MVP에서는 충돌 UX를 깊게 다루지 않는다
- 원격 푸시는 활성 토큰 전체로 fan-out 한다
- 디바이스별 토큰과 발송 책임은 `SYSTEM_DESIGN.md`를 따른다.

---

## 8. Functional Requirements

### FR-01 Authentication

- 사용자는 로그인할 수 있어야 한다.
- 사용자의 데이터는 계정별로 분리되어야 한다.

### FR-02 Item create

- 사용자는 반복 일정 항목을 생성할 수 있어야 한다.
- 항목 생성 시 아래 정보를 입력할 수 있어야 한다.
  - 제목
  - 설명(선택)
  - 카테고리(선택)
  - 반복 규칙
  - 시작일
  - 알림 시간
  - 알림 on/off
  - 고급 옵션(anchor type)

### FR-03 Item edit/delete

- 사용자는 기존 항목을 수정/삭제할 수 있어야 한다.
- 수정/삭제 시 원격 푸시 발송 job이 재조정되어야 한다.
- 규칙 영향 수정 시 재조정 대상은 수정 시점 이후 미래 job만 포함한다.

### FR-04 Occurrence visibility

- 사용자는 오늘, 다가오는 일정, overdue 일정을 확인할 수 있어야 한다.
- 달력에서 특정 날짜의 일정을 확인할 수 있어야 한다.
- 사용자는 목록 화면에서 등록된 일정을 한 번에 확인할 수 있어야 한다.

### FR-05 Completion / skip

- 사용자는 occurrence를 완료 처리할 수 있어야 한다.
- 사용자는 occurrence를 건너뛸 수 있어야 한다.

### FR-06 Item detail history

- 사용자는 항목 상세에서 완료/건너뜀 최근 히스토리를 조회할 수 있어야 한다.

### FR-07 Notification permission UX

- 앱은 알림 권한이 없는 경우 명확히 안내해야 한다.
- 설정 화면으로 이동할 수 있어야 한다.

### FR-08 Widget

- 위젯은 읽기 전용으로 오늘 할 일 중심 정보를 보여줘야 한다.

### FR-09 Notification inbox

- 사용자는 성공한 원격 푸시 알림을 알림함에서 확인할 수 있어야 한다.
- 홈 화면은 미읽음 알림이 있으면 알림 진입 버튼에 작은 표시를 보여줘야 한다.
- 사용자는 알림함 item을 탭해 연결된 반복 항목 상세 화면으로 이동할 수 있어야 한다.
- 연결된 반복 항목을 열 수 없으면 사용자는 fallback 안내와 돌아가기 액션을 볼 수 있어야 한다.
- 사용자는 알림함 item을 읽음 처리할 수 있어야 한다.
- 사용자는 알림함의 미읽음 item을 한 번에 모두 읽음 처리할 수 있어야 한다.
- 사용자는 알림함 item을 삭제할 수 있어야 한다.
- 지원하지 않는 상세 이동 target도 읽음, 전체 읽음, 삭제, 목록 새로고침 대상에서 제외하지 않는다.
- 알림함 item 삭제는 현재 사용자 row만 숨김 처리한다.
- 알림함 item 삭제는 발송/operation log를 보존한다.
- 알림함 item 삭제는 원격 푸시 delivery job record를 update/delete/cascade하지 않는다.

---

## 9. Non-functional Requirements

### NFR-01 Predictability

- 다음 일정 계산은 사용자가 납득 가능한 방식이어야 한다.

### NFR-02 Reliability

- 알림 스케줄은 데이터 변경 시 일관되게 재계산되어야 한다.

### NFR-03 Performance

- 홈 화면은 일반적인 데이터 양에서 빠르게 렌더링되어야 한다.

### NFR-04 Maintainability

- 반복 규칙 계산 로직은 UI 계층에서 분리되어야 한다.

### NFR-05 Extensibility

- 멀티 디바이스 지원, 향후 충돌 해결, 위젯 액션 확장이 가능해야 한다.

---

## 10. Information Architecture

### Primary screens

1. Auth
2. Home
3. Add/Edit Item
4. Item Detail
5. Reminder List
6. Calendar
7. Settings

---

## 11. Screen Requirements

### 11.1 Auth

- 로그인 버튼
- 소셜 로그인 진입점
- 세션 복원 처리

### 11.2 Home

- Today / Upcoming / Overdue 섹션
- 빠른 완료
- 빠른 건너뜀
- 빈 상태 / 로딩 상태 / 에러 상태

### 11.3 Add/Edit Item

- 제목
- 설명
- 카테고리
- 반복 규칙 선택
- 시간 선택
- 시작일 선택
- 알림 토글
- 더보기 옵션
  - 완료한 날짜 기준 계산 체크박스
- edit 모드에서는 시작일을 수정할 수 없다
- edit 모드에서 현재 규칙은 latest schedule version 기준으로 보여준다
- 규칙 영향 수정 시 “변경은 이후 일정에만 적용됩니다” 안내를 보여준다

### 11.4 Item Detail

- 항목 정보
- 다음 예정일
- 최근 히스토리
- 완료 / 건너뜀
- 수정 / 삭제
- 현재 반복 규칙과 알림 상태는 latest schedule version 기준으로 보여준다

### 11.5 Schedule List

- 화면 제목은 `일정 목록`을 사용한다.
- 하단 탭은 `홈`, `목록`, `캘린더`, `설정` 순서로 구성한다.
- 목록은 등록된 일정을 세로 카드 리스트로 보여준다.
- 일정이 없으면 화면 중앙에 추가 유도 문구를 보여준다.
- 빈 상태에서도 일정 추가 화면으로 이동할 수 있어야 한다.
- 일정 추가 버튼은 하단 floating 버튼으로 제공한다.
- 카드에는 제목, 반복 규칙 요약, 다음 예정일 값을 기본 표시한다.
- 반복 일정은 현재 이후 다음 발생을 보여주고 `다음 일정` 라벨을 붙인다.
- `한 번` 일정에는 `다음 일정` 라벨을 붙이지 않는다.
- 카드에는 수정, 삭제 버튼을 직접 노출하지 않는다.
- 카드를 누르면 기존 항목 상세 화면으로 이동한다.
- 수정과 삭제는 상세 화면의 기존 관리 메뉴를 사용한다.
- 기본 정렬은 다음 예정일 빠른순이다.
- 정렬 선택지는 `최근 생성순`, `제목순`, `다음 예정일 빠른순`만 제공한다.
- 다음 예정일 빠른순에서는 다음 예정이 없는 일정을 목록 가장 아래에 둔다.
- 최근 생성순과 제목순에서는 다음 예정 유무와 무관하게 선택한 기준을 따른다.
- 필터 UI는 MVP 범위에서 제외한다.

### 11.6 Calendar

- 날짜 선택
- 일정 유무 표시
- scheduled / completed / overdue 상태 확인

### 11.7 Settings

- 알림 권한 안내
- timezone 확인
- 계정 정보
- 로그아웃

---

## 12. UX Notes

### UX principles

- 등록은 최대한 빨라야 한다
- 오늘 해야 할 것을 즉시 확인할 수 있어야 한다
- 완료 액션은 홈에서 가장 빠르게 이뤄져야 한다
- overdue는 명확하게 구분되어야 한다
- 고급 옵션은 기본 UI를 복잡하게 만들지 않도록 숨겨야 한다
- 빈 상태, 로딩, 에러 상태는 화면마다 다른 톤으로 흩어지지 않아야 한다
- 사용자가 보는 문구는 부드러운 `~요` 체를 우선한다
- 에러 액션 문구는 `다시 시도`로 통일한다
- 개발자용 오류와 화면 판별용 문자열은 사용자 문구와 분리한다

### Design direction

- 가볍고 신뢰감 있는 개인 생산성 앱
- 과도한 게임화 요소보다 명확한 상태 표현 우선
- 카드 기반 섹션 구조
- 캘린더는 보조 탐색 수단
- 홈이 핵심
- 홈, 일정 목록, 캘린더, 알림함, 상세 화면의 상태 UI는 공통 톤을 따른다
- 초기 로딩은 전체 spinner보다 placeholder row로 화면 구조를 유지한다
- 빈 상태와 에러 상태는 짧은 제목, 필요한 설명, 기존 동작에 연결되는 액션으로 구성한다
- 리스트 row는 알림함 row처럼 얇은 border와 작은 텍스트 톤을 사용한다
- 리스트 row의 기본 톤은 `colors.surface`, `colors.outlineSoft`, `StyleSheet.hairlineWidth`, `borderRadius.md`다
- 홈, 일정 목록, 캘린더 선택 날짜, 상세 최근 히스토리 리스트에는 무거운 `AppCard` 톤을 사용하지 않는다
- 카드 내부 정보, press 동작, 상태 배지, 의미 색상은 유지한다
- 홈과 목록의 빈 상태 CTA는 기존 생성 화면으로 이동한다
- 알림함의 읽음, 선택, 삭제 처리와 row press 동작은 유지한다
- 상세 진입과 occurrence 액션은 `scheduledAtUtc` 전달을 유지한다

---

## 13. Success Criteria

### Product success

- 사용자가 반복 일정 등록 후 실제로 알림을 받고 완료 처리까지 이어질 수 있다
- 홈 화면에서 오늘/다가오는/미완료를 명확히 구분해서 볼 수 있다
- 교체형 항목도 자연스럽게 관리 가능하다

### Portfolio success

- 제품 정의부터 설계, UX, 앱 구현, 인프라 연결까지 일관된 스토리를 설명할 수 있다
- 반복 규칙, 상태 모델, 알림 발송 job 재계산 구조를 명확히 설명할 수 있다
- MVP 범위 통제와 확장 전략을 설명할 수 있다

---

## 14. Future Enhancements

- snooze
- 위젯 직접 완료 액션
- 통계/대시보드
- 고급 필터링
- 충돌 해결 UX
- 멀티 디바이스 동시 편집 처리 강화
- 오프라인 캐시 및 동기화
