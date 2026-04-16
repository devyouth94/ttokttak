# Implementation Plan

이 문서는 이미 확정된 제품/설계/도메인 결정을 구현 순서로 재배열한 작업 계획이다.
제품 범위와 화면 요구사항의 기준은 `PRODUCT_SPEC.md`를 따른다.
구성요소 책임과 데이터 흐름의 기준은 `SYSTEM_DESIGN.md`를 따른다.
반복 계산, 상태 판정, 알림 동기화 규칙의 기준은 `DOMAIN_LOGIC.md`를 따른다.
UI 시안 검토가 필요할 때는 `PRODUCT_SPEC.md`의 화면 요구사항과 UX 방향을 기준으로 한다.

## 1. Build order

각 phase는 사용자가 완료 여부를 바로 확인할 수 있는 1~3개 작업 단위로 나눈다.
각 phase는 아래 작업을 모두 확인하면 완료로 본다.

### 1단계: 앱 셸

- [x] Expo 앱 초기화
- [x] Expo Router 설정

### 2단계: 세션 및 프로필 부트스트랩

- [x] Supabase 클라이언트
- [x] 인증/세션 부트스트랩
- [x] 프로필 시간대 초기화

### 3단계: 기본 앱 인프라

- [x] 기본 디자인 시스템
- [x] Sentry 설정

### 4단계: 도메인 모델

- [x] 반복 규칙 타입
- [x] 반복 규칙 검증

### 5단계: 발생 일정 계산

- [x] 발생 일정 계산
- [x] 상태 판정

### 6단계: 앵커 및 경계 사례

- [x] anchorType 로직
- [x] 경계 사례 테스트

### 7단계: 핵심 리포지토리

- [x] 반복 항목 리포지토리
- [x] 완료 로그 리포지토리

### 8단계: 디바이스 및 예약 리포지토리

- [x] 디바이스 리포지토리
- [x] 알림 예약 리포지토리

### 9단계: 로그인

- [x] Google 로그인
- [x] Apple 로그인

### 10단계: 항목 설정

- [x] 항목 생성
- [x] 항목 수정

### 11단계: 홈 피드

- [x] 홈 피드
- [x] 1 페이즈: 최상단 헤더
- [x] 2 페이즈: 날짜 캐러셀
- [x] 3 페이즈: 카드 섹션

### 12단계: 발생 일정 액션

- [x] 완료
- [x] 건너뛰기

### 13단계: 상세 페이지

- [x] 상세 페이지

### 14단계: 히스토리

- [x] 히스토리

### 15단계: 캘린더

- [x] 캘린더

### 16단계: 수정 시점 기준 일정 전환

- [x] schedule version 저장 구조
- [x] 수정 시점 이후 occurrence 계산
- [x] 시작일 수정 제한 / 알림 시간 수정 허용
- [x] 수정 영향 안내 문구

17~19단계 로컬 알림 체크포인트는 `NOTIFICATION_PHASE_CHECKPOINTS.md`를 따른다.
원격 푸시 전환 체크포인트는 `REMOTE_PUSH_MIGRATION_CHECKPOINTS.md`를 따른다.

### 17단계: 알림 권한 및 시작 시 동기화

- [x] 권한 플로우
- [x] 앱 시작 시 동기화

### 18단계: 변경 시 알림 동기화

- [ ] 변경 시 동기화

### 19단계: 디바이스 범위 알림 영속화

- [ ] 디바이스 범위 예약 영속화

### 20단계: 위젯

- [ ] 읽기 전용 위젯

### 21단계: UX 다듬기

- [ ] 빈 상태 / 로딩 / 에러 상태
- [ ] UX 개선

### 22단계: QA 안정화

- [ ] 버그 수정

### 23단계: README 및 데모 마무리

- [ ] README
- [ ] 데모 자산

---

## 2. Engineering priorities

1. domain logic correctness
2. predictable UX
3. notification consistency
4. architecture clarity
5. implementation speed

---

## 3. Scope control rules

Do not add:

- snooze
- auto postpone
- statistics dashboard
- collaborative features
- widget action buttons
- full offline sync

---

## 4. Portfolio documentation points

Capture during implementation:

- why occurrence is derived instead of stored
- why anchorType exists
- why server-first with limited offline was chosen
- how timezone is handled
- how device-scoped notifications support future multi-device expansion
