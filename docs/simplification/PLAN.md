# 코드베이스 단순화

이 문서는 코드베이스 단순화 작업의 합의 기준이다.
작업이 끝나면 필요한 결정만 기준 문서와 ADR에 옮기고 이 문서는 삭제한다.

## 목표

- 코드를 처음 읽는 사람이 화면 동작을 짧게 추적할 수 있게 한다.
- 파일, 계층, 이름과 코드 줄을 필요한 만큼만 남긴다.
- 파일 수나 코드 줄의 수치 목표는 두지 않는다.
- 각 페이지 작업 후 결과를 확인하며 다음 단순화 범위를 정한다.

## 보존 대상

다음 항목은 단순화하지 않는다.

- 현재 사용자-facing 동작.
- 기존 저장 데이터 호환성.
- 개인정보와 보안 경계.
- 현재 UI 전체.

UI 보존 범위에는 레이아웃, 스타일, 문구, 상태 표현, 애니메이션과 접근성이 포함된다.
단순화는 내부 구현에만 적용한다.

## 목표 구조

Expo Router와 평평한 기능 모듈을 사용한다.
별도의 아키텍처 프레임워크는 도입하지 않는다.

예상 구조는 다음과 같다.
파일과 디렉터리는 실제 의존 관계에 따라 더 합칠 수 있다.

```text
app/                         # 라우트와 화면
  _layout.tsx
  index.tsx
  (tabs)/
  items/

src/
  schedule/                  # 일정 규칙, 조회, 저장과 처리
  notifications.ts
  session.tsx
  supabase.ts
  i18n.ts
  theme.tsx
  ui/                        # 실제로 재사용하는 UI만
```

기존 `application`, `screens`, `features`, `entities`, `shared` 계층은 폐기한다.
하나의 동작이 계층별 전달 파일을 차례로 통과하지 않게 한다.

```text
기존: route → screen → controller → feature → repository → persistence
목표: route 화면 → 기능 모듈 → 외부 시스템
```

파일은 다음 경우에만 나눈다.

- 여러 화면에서 실제로 재사용한다.
- occurrence 계산처럼 독립적으로 복잡하고 별도 검증이 필요하다.
- Supabase, 알림, SecureStore처럼 외부 시스템과 만나는 seam이다.

한 구현만 존재하는 interface, 전달만 하는 wrapper와 배럴 `index.ts`는 만들지 않는다.

## 작업 방식

검토 단위는 페이지다.
공통 로직은 해당 페이지 안에 복제하지 않고 실제 공유 모듈에서 수정한다.

페이지 하나를 다음 순서로 처리한다.

1. 현재 UI와 동작을 확인한다.
2. 페이지가 사용하는 흐름을 끝까지 추적한다.
3. 새 위치에서 기존 구현을 교체한다.
4. 연결된 기존 파일을 즉시 삭제한다.
5. 관련 테스트, 타입 검사와 lint를 실행한다.
6. 변경 결과를 사용자에게 보여주고 멈춘다.

별도 `v2` 구조를 만들지 않는다.
기존 구조와 새 구조를 연결하는 임시 호환 계층도 만들지 않는다.

## 첫 페이지

첫 작업 대상은 일정 목록이다.
읽기 전용 페이지에서 목표 구조를 먼저 검증한다.

일정 목록은 한 번에 바꾸지 않고 다음 네 페이즈로 나눈다.

### 1. 라우트 통합

- `ScheduleListScreen`을 라우트로 이동한다.
- 전달만 하는 route와 screen `index.ts`를 삭제한다.
- 조회 로직과 지역 이름은 바꾸지 않는다.

### 2. 페이지 코드 정리

- 목록 전용 `Row`, `Sort`, `toRows`를 정리한다.
- 로딩, 빈 상태, 오류와 정렬 UI는 삭제 테스트로 합칠지 판단한다.
- 렌더링 결과는 그대로 유지한다.

### 3. 조회 흐름 축소

- 목록 조회 interface를 `useItems`로 줄인다.
- 조회 context와 현재 시각 처리를 interface 내부로 숨긴다.
- 목록 전용 전달 계층과 사용되지 않는 타입을 삭제한다.

### 4. 테스트와 잔여 코드 정리

- 목록 동작 테스트를 새 interface 기준으로 통합한다.
- 사용되지 않는 export와 배럴 파일을 삭제한다.
- 전체 검증과 전후 결과를 보고한다.

각 페이즈는 실행 가능한 상태로 끝낸다.
검증 결과와 diff를 전달한 뒤 사용자가 확인할 때까지 다음 페이즈를 시작하지 않는다.

페이즈 1부터 3까지는 관련 테스트, 타입 검사와 lint를 실행한다.
페이즈 4에서는 전체 Jest를 추가로 실행한다.

목록 페이지의 지역 이름과 interface는 다음 방향으로 줄인다.

```text
ScheduleListScreen                        → 라우트에 합쳐 삭제
useScheduleListOccurrenceProjectionQuery → useItems
ScheduleListOccurrenceProjectionReadModel → 반환 타입 추론
ScheduleListEntry                         → Row
ScheduleListSortMode                      → Sort
buildScheduleListEntries                  → toRows
RecurringItemSummaryRow                   → ItemRow
useScheduleReadContext                    → useItems 내부로 숨김
useOccurrenceProjectionNow                → useItems 내부로 숨김
```

`RecurringItem`과 `ScheduleVersion` 같은 공용 도메인 이름은 이번 페이지에서 일부만 바꾸지 않는다.
전체 호출자를 확인한 뒤 별도로 다시 합의한다.

## 테스트

테스트는 깊은 모듈의 interface와 사용자가 관찰하는 결과를 기준으로 통합한다.

- occurrence 계산과 상태 판정.
- 일정 저장, 수정과 처리.
- 알림 예약과 lifecycle.
- 세션, 암호화와 계정 삭제.
- 핵심 화면 동작.
- Edge Function 보안 경계.

내부 함수별 테스트, 구현 문자열 검사와 삭제된 과거 구조를 감시하는 테스트는 제거한다.
테스트 파일 수나 coverage 수치 목표는 두지 않는다.

## 문서

최종 문서는 다음 역할만 남기는 것을 목표로 한다.

```text
AGENTS.md
README.md
CONTEXT.md                 # 순수 용어집
docs/PRODUCT.md            # 제품 범위와 동작 규칙
docs/ARCHITECTURE.md       # 구조, 데이터 흐름과 보안 경계
docs/DATABASE.sql          # 기준 스키마
docs/RELEASE.md            # iOS, Android와 스토어 운영
docs/adr/                  # 되돌리기 어려운 결정
```

기존 문서의 필요한 내용은 위 문서로 옮긴다.
같은 설명은 한 문서에만 둔다.
평평한 기능 모듈 결정은 기존 FSD ADR을 대체하는 ADR로 기록한다.

## 확인 방식

페이지마다 별도 브랜치를 사용한다.
브랜치 이름에는 `codex`를 넣지 않는다.
일정 목록 브랜치는 `refactor/simplify-schedule-list`를 사용한다.

각 페이지가 끝나면 다음 변화를 보고한다.

- 삭제하거나 합친 파일.
- 코드 줄 변화.
- 줄어든 의존 단계.
- 실행한 검증과 결과.

특정 수치를 달성하기 위해 관련 없는 코드를 합치지 않는다.
사용자가 확인한 뒤에만 다음 페이지로 진행한다.
커밋은 사용자가 명시적으로 요청할 때만 만든다.

## 미정

- 공용 도메인 타입과 함수의 최종 이름.
- 일정 목록 다음에 작업할 페이지.
- 실제 의존 관계를 확인한 뒤의 최종 파일 구성.
