# Personal Recurring Reminder App

반복되는 생활 항목을 등록하고, 알림을 받고, 완료 또는 건너뜀 처리할 수 있는 개인 리마인더 앱입니다.

이 앱은 단순한 habit tracker보다 범위가 넓습니다. 약 복용, 교체 주기, 정비 일정, 일상 루틴처럼 반복 규칙이 있는 항목을 관리하는 데 초점을 둡니다.

## 핵심 기능

- 반복 일정 생성, 수정, 삭제
- 다양한 반복 규칙 지원
- 알림 1회 발송
- Today / Upcoming / Overdue 구분
- 리마인더 목록 조회와 정렬
- 완료 / 건너뜀 처리
- 항목 상세 최근 히스토리 조회
- Supabase 로그인
- 읽기 전용 달력
- 읽기 전용 위젯

## 핵심 결정

- 기본 반복 기준은 `fixed`
- `completion_based`는 `once`, `daily`, `interval_days`, `monthly`, `interval_months`, `yearly`에만 사용
- `weekly`, `interval_weeks`는 MVP에서 `fixed`만 지원
- overdue는 자동으로 미루지 않음
- snooze는 MVP 범위에서 제외
- occurrence는 저장하지 않고 계산

## 용어

- `recurrence`: 반복 규칙 자체. 예: 매일, 3일마다, 매주 월/수
- `occurrence`: 반복 규칙으로부터 계산된 개별 일정 1개. 예: 4월 1일 오전 9시 약 복용
- `fixed`: 원래 일정 기준으로 다음 occurrence를 계산하는 방식
- `completion_based`: 실제 완료 시점을 기준으로 다음 occurrence를 계산하는 방식
- `overdue`: 예정 시각이 지났지만 완료 또는 건너뜀 처리되지 않은 상태

## 기술 스택

- Expo / React Native
- TypeScript
- Supabase
- Zustand
- React Hook Form
- Expo Notifications

## 문서

- 제품 요구사항: [docs/PRODUCT_SPEC.md](/Users/youngzin/Documents/coding/ttokttak/docs/PRODUCT_SPEC.md)
- 시스템 설계: [docs/SYSTEM_DESIGN.md](/Users/youngzin/Documents/coding/ttokttak/docs/SYSTEM_DESIGN.md)
- 도메인 규칙: [docs/DOMAIN_LOGIC.md](/Users/youngzin/Documents/coding/ttokttak/docs/DOMAIN_LOGIC.md)
- 구현 계획: [docs/IMPLEMENTATION_PLAN.md](/Users/youngzin/Documents/coding/ttokttak/docs/IMPLEMENTATION_PLAN.md)
