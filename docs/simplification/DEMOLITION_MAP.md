# 코드베이스 철거 지도

기준 커밋은 `db2f384`다.

이 문서는 기존 구현을 미화하지 않는다.
사용자 동작, UI와 저장 데이터 계약만 보존한다.
내부 구조와 기존 테스트는 교체할 수 있다.

## 판정

- **유지**: 제품 계약이 분명하고 인터페이스가 작다.
- **재작성**: 동작은 필요하지만 책임이나 테스트가 기존 구조에 묶여 있다.
- **삭제**: 전달만 하거나 새 구현에 필요하지 않다.

테스트 통과만으로 구현을 유지하지 않는다.
테스트는 제품 동작과 외부 경계를 확인하는 증거다.

## 전체 지도

| 기능 흐름             | 판정        | 유지할 계약                            | 방향                                                             |
| --------------------- | ----------- | -------------------------------------- | ---------------------------------------------------------------- |
| 일정 모델과 반복 규칙 | 유지        | 일정, 규칙 버전, 반복 날짜 계산        | 첫 재작성에서는 변경하지 않는다.                                 |
| occurrence 계산       | 유지        | `range`, `next`, `find`와 상태 판정    | 중앙 계산기로 유지한다. 화면별 projection만 교체한다.            |
| 일정 생성과 수정      | 재작성      | 입력 규칙, future-only 수정, UI        | 폼 상태 계층을 버리고 한 화면 인터페이스로 다시 만든다.          |
| 일정 저장과 조회      | 부분 재작성 | RPC, 암호화, DB row, query key         | DB 모듈에서 수정 정책을 빼고 저장 변환만 남긴다.                 |
| 홈 피드               | 재작성      | 현재 UI, 섹션, 완료와 건너뛰기         | 일정 기반이 정리된 뒤 화면 orchestration을 다시 판정한다.        |
| 일정 목록             | 유지        | 정렬, 다음 occurrence, 상세 진입       | 현재의 작은 `useItems` 인터페이스를 기준으로 삼는다.             |
| 캘린더                | 재작성      | 월 이동, marker, 날짜 목록             | 거대 screen model을 작은 projection과 화면 상태로 교체한다.      |
| 일정 상세             | 재작성      | 대표 상태, 최근 기록, 수정과 삭제 진입 | view model과 700줄 화면을 사용자 상태 단위로 다시 나눈다.        |
| 알림                  | 유지        | 권한, 후보 계산, lifecycle, tap        | 동기화 코어를 유지한다. session 전달 wrapper만 제거 후보로 둔다. |
| 세션과 계정           | 유지        | 세션 상태, profile 준비, 계정 삭제     | 보안 경계를 유지한다. 화면 소유 훅이나 route에서 직접 사용한다.  |
| 설정                  | 재작성      | 언어, 테마, 계정 동작과 현재 UI        | controller와 screen model을 화면 소유 훅 하나로 교체한다.        |
| 로그인                | 유지        | Apple, Google과 법적 문구              | 배럴만 제거하고 UI는 유지한다.                                   |
| 테마, i18n, 공용 UI   | 유지        | 앱 전역 provider와 의미 토큰           | 화면 model의 별도 번역 사전을 i18n 경계로 되돌린다.              |
| route와 screen 배럴   | 삭제        | route parameter와 화면 연결            | route가 실제 화면 파일을 직접 import한다.                        |

## 첫 흐름

첫 상세 범위는 다음과 같다.

```text
일정 생성·수정
→ 입력 검증
→ 규칙 버전 계산
→ 제목·설명 암호화
→ Supabase RPC 저장
→ 알림 재동기화
→ query 무효화와 재조회
→ occurrence projection
```

### 유지할 계약

- `Schedule.versions`는 비어 있지 않다.
- occurrence는 저장하지 않고 일정과 처리 기록에서 계산한다.
- 생성 입력은 도메인 검증을 통과해야 한다.
- 규칙 영향 필드가 바뀔 때만 새 규칙 버전을 만든다.
- 수정은 과거 occurrence와 처리 기록을 다시 쓰지 않는다.
- 제목과 설명은 저장 전에 AES-GCM으로 암호화한다.
- 암호화 key 복구 경계와 복구 불가 일정 처리를 유지한다.
- 생성과 수정은 DB 저장 후 알림을 맞추고 query를 무효화한다.
- 현재 RPC와 저장 데이터 shape를 유지한다.
- 현재 생성·수정 UI를 유지한다.

### 교체 전 경로

생성 화면은 다음 경로를 지난다.

```text
route
→ screen 배럴
→ ScheduleFormScreen
→ useScheduleFormScreenController
→ schedule-form-state + schedule-form-screen-model
→ schedule/write
→ schedule/db/items
→ validate + encrypt + RPC + 재조회
```

수정 화면은 여기에 상세 query, 전체 처리 기록 조회와 수정 정책 계산을 추가한다.
화면 상태와 제품 규칙이 controller, form state, screen model, validator에 반복된다.

### 파일 판정

| 파일                                                                     | 판정   | 처리                                                                                       |
| ------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------ |
| `src/schedule/schedule.ts`                                               | 유지   | 일정과 생성 입력 계약을 유지한다.                                                          |
| `src/schedule/rules/recurrence.ts`                                       | 유지   | 반복 날짜 계산을 그대로 사용한다.                                                          |
| `src/schedule/rules/occurrence.ts`                                       | 유지   | `range`, `next`, `find` 인터페이스를 유지한다.                                             |
| `src/schedule/rules/validate.ts`                                         | 유지   | 단일 도메인 validator로 사용한다.                                                          |
| `src/schedule/rules/edit.ts`                                             | 유지   | future-only 수정 정책의 순수 경계로 사용한다.                                              |
| `src/schedule/content/cipher.ts`                                         | 유지   | 암복호화와 목록 key 공유를 유지한다.                                                       |
| `src/schedule/content/key.ts`                                            | 유지   | SecureStore와 서버 복구 경계를 유지한다.                                                   |
| `src/schedule/db/content-key.ts`                                         | 유지   | Edge Function 호출과 wrapped key 저장을 유지한다.                                          |
| `src/schedule/db/logs.ts`                                                | 유지   | 처리 기록과 completion anchor 조회를 유지한다.                                             |
| `src/schedule/query.ts`                                                  | 유지   | `useScheduleById`는 폼에서, 상세 기록을 합친 `useScheduleDetail`은 상세 화면에서 사용한다. |
| `src/schedule/write.ts`                                                  | 재작성 | 생성·수정 workflow를 완성하는 단일 진입점으로 만든다.                                      |
| `src/schedule/db/items.ts`                                               | 재작성 | row 변환, 암호화 저장과 RPC 호출만 남긴다. 수정 정책 계산은 `write.ts`로 옮긴다.           |
| `src/screens/schedule-form/model/use-schedule-form-screen-controller.ts` | 삭제   | `form.ts`의 `useScheduleForm`으로 교체한다.                                                |
| `src/screens/schedule-form/model/schedule-form-state.ts`                 | 삭제   | schema와 저장 값 변환만 `form-values.ts`에 남긴다.                                         |
| `src/screens/schedule-form/model/schedule-form-screen-model.ts`          | 삭제   | UI 파생값만 `ui/view.ts`에 남긴다.                                                         |
| `src/screens/schedule-form/model/*.test.ts`                              | 삭제   | `useScheduleForm` 화면 인터페이스 테스트로 교체한다.                                       |
| `src/screens/schedule-form/form.ts`                                      | 신규   | 폼 값, 반복 변경과 생성·수정·삭제 동작을 한 화면 인터페이스로 제공한다.                    |
| `src/screens/schedule-form/form-values.ts`                               | 신규   | 폼 타입, Zod schema, 기본값과 양방향 변환 다섯 개만 노출한다.                              |
| `src/screens/schedule-form/form.test.tsx`                                | 신규   | 생성·수정 화면에서 관찰되는 폼 동작을 검증한다.                                            |
| `src/screens/schedule-form/picker.ts`                                    | 신규   | 네이티브 날짜 선택기의 플랫폼 차이와 날짜 변환을 숨긴다.                                   |
| `src/screens/schedule-form/ui/screen.tsx`                                | 재작성 | 로딩 상태와 폼 화면을 연결한다.                                                            |
| `src/screens/schedule-form/ui/content.tsx`                               | 재작성 | 화면 배치, 제목·메모 입력과 오류 스크롤만 담당한다.                                        |
| `src/screens/schedule-form/ui/schedule-form-screen-sections.tsx`         | 삭제   | 여러 역할을 모은 파일을 실제 UI 역할 파일로 교체한다.                                      |
| `src/screens/schedule-form/ui/recurrence.tsx`                            | 신규   | 반복 유형, 간격과 요일 UI를 담당한다.                                                      |
| `src/screens/schedule-form/ui/schedule-fields.tsx`                       | 신규   | 시작일, 종료일, 알림 시간과 날짜 선택기를 담당한다.                                        |
| `src/screens/schedule-form/ui/options.tsx`                               | 신규   | 색상, 알림과 완료일 기준 UI를 담당한다.                                                    |
| `src/screens/schedule-form/ui/form-actions.tsx`                          | 신규   | 저장과 삭제 동작 UI를 담당한다.                                                            |
| `src/screens/schedule-form/ui/styles.ts`                                 | 유지   | 현재 UI 보존을 위해 스타일을 그대로 사용한다.                                              |
| `src/screens/schedule-form/index.ts`                                     | 삭제   | route가 `ui/screen.tsx`를 직접 import한다.                                                 |
| `app/items/new.tsx`                                                      | 유지   | 새 폼 화면을 직접 import한다.                                                              |
| `app/items/[itemId]/edit.tsx`                                            | 유지   | 새 폼 화면을 직접 import한다.                                                              |

### 새 경계

새 구현은 다음 네 경계만 둔다.

```text
route
→ 일정 폼 화면과 폼 상태
→ schedule/write
→ schedule/db + schedule/rules + schedule/content
```

폼 값과 오류는 React Hook Form이 관리한다.
Zod schema는 입력 shape를 확인하고 `validateInput`의 도메인 오류를 화면 문구로 바꾼다.
제출할 때 폼 값을 `CreateScheduleInput`으로 정규화한다.

`write.ts`는 생성과 수정 workflow를 소유한다.
`db/items.ts`는 도메인 수정 정책을 결정하지 않는다.

### 테스트 판정

다음 테스트는 유지한다.

- 반복 날짜와 occurrence 계약.
- 입력 검증과 수정 정책.
- DB row, RPC와 암호화 mapping.
- content key 생성과 복구.
- query key와 completion anchor.

다음 테스트는 교체한다.

- form 내부 helper별 테스트.
- picker event별 상태 복사 테스트.
- screen model의 표시 flag 조합 테스트.
- 구현 함수 이름과 반환 shape를 고정하는 테스트.

새 폼 테스트는 사용자 동작만 확인한다.

- 생성 기본값과 필수 입력 오류.
- 반복 유형 변경과 종료일 처리.
- 수정 화면의 시작일 잠금.
- 생성과 수정 제출 payload.
- 생성, 수정과 삭제 호출.

## 실행 순서

1. 현재 생성·수정 UI와 제출 payload를 기준 자료로 고정한다.
2. `schedule/rules`와 암호화 테스트는 그대로 둔다.
3. React Hook Form과 Zod를 유지한 새 일정 폼 인터페이스를 작성한다.
4. 현재 UI를 새 폼 인터페이스에 직접 연결한다.
5. 생성·수정 route를 새 화면 파일에 직접 연결한다.
6. 기존 controller, model, 배럴과 내부 helper 테스트를 삭제한다.
7. 전체 테스트, 타입 검사, lint와 생성·수정 수동 확인을 실행한다.
8. 첫 흐름 결과를 승인한다.
9. `write.ts`와 `db/items.ts` 재작성을 시작한다.

## Ponytail 판정

`yagni:` 일정 폼의 state, screen model, controller 삼중 계층을 삭제한다. React Hook Form과 `validateInput`을 연결하는 화면 소유 폼 하나로 교체한다. [`src/screens/schedule-form`]

`delete:` 폼 내부 helper와 picker event를 고정하는 테스트를 삭제한다. 생성·수정 사용자 동작 테스트로 교체한다. [`src/screens/schedule-form/form.test.tsx`]

`shrink:` `db/items.ts`가 조회, 암호화, 검증, 수정 정책과 RPC를 함께 결정하는 구조를 줄인다. 수정 workflow는 `write.ts`, DB mapping은 `db/items.ts`에 둔다. [`src/schedule/db/items.ts`]

`delete:` 화면을 다시 export하기만 하는 배럴 다섯 개를 삭제한다. route가 실제 화면 파일을 직접 import한다. [`src/screens/*/index.ts`]

`yagni:` 설정의 screen model과 313줄 controller를 화면 소유 훅 하나로 교체한다. [`src/screens/settings/model`]

`shrink:` 캘린더의 329줄 model과 581줄 helper 테스트를 월 상태와 occurrence projection 중심으로 다시 쓴다. [`src/screens/calendar/model`]

`shrink:` 상세 화면의 568줄 view model과 411줄 helper 테스트를 대표 상태 projection과 화면 상태 테스트로 교체한다. [`src/screens/schedule-detail/model`]

`delete:` 세션 값을 알림 provider props로 전달만 하는 wrapper를 루트 연결에 합친다. [`src/notifications/session-provider.tsx`]

`shrink:` 화면 model의 한국어·English 사전과 language 전달을 기존 i18n 경계로 모은다. 순수 도메인 코드는 문구를 만들지 않는다. [`src/screens`]

net: 전체 지도 완료 시 약 -2,700줄. 의존성 제거는 목표로 두지 않는다.

## 제외 범위

이 지도는 복잡성과 과설계만 판정한다.
정확성, 보안과 성능 결함은 별도 검토 대상이다.
