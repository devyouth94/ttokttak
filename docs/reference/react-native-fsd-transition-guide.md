# React Native FSD Transition Guide

이 문서는 Ttokttak의 React Native FSD 전환 작업 기준이다.
구조 결정의 배경은 `../adr/0004-feature-sliced-structure-for-react-native.md`를 따른다.
구현 추적의 부모 PRD는
[GitHub Issue #29](https://github.com/devyouth94/ttokttak/issues/29)다.

현재 코드 상태 설명이 아니다.
앞으로 구조를 옮길 때 지킬 실행 규칙이다.

## 기준

전환의 첫 기준은 카카오페이 기술 블로그의
[FSD 적용 사례](https://tech.kakaopay.com/post/fsd/)다.
핵심은 FSD 폴더 템플릿 복사가 아니라 재사용 범위로 코드 위치를 통제하는 것이다.

카카오페이 사례에서 가져온 적용 원칙:

- 모든 FSD layer를 기계적으로 만들지 않는다.
- 코드 위치는 "현재 어느 범위까지 재사용되는가"로 판단한다.
- 특정 화면에서만 쓰면 screen slice 안에 둔다.
- 같은 화면 그룹의 여러 slice에서 쓰면 feature로 올린다.
- 여러 화면 그룹이나 기능에서 쓰는 도메인 데이터는 entity로 옮긴다.
- 앱 전체 공통 코드는 shared로 둔다.
- shared와 entity를 단순 공통 코드 보관소로 쓰지 않는다.
- segment 이름은 `components`, `hooks` 같은 코드 형태보다 `ui`, `api`, `model`, `lib`, `config` 같은 목적을 드러낸다.
- 전환은 한 번에 끝내는 마이그레이션 이벤트가 아니라 점진적인 이동 규칙으로 운영한다.

React Native에서는 다음 변형을 사용한다.

- Expo Router route는 루트 `app/`에 둔다.
- FSD의 App layer 역할은 `src/application/`에 둔다.
- 웹의 `pages` layer는 모바일 문맥에 맞춰 `screens`로 부른다.
- 실제 화면, 기능, 도메인, 공통 코드는 `src/` 내부 레이어로 분리한다.

## 최종 구조

```text
app/
src/
  application/
  screens/
  features/
  entities/
  shared/
```

### `app/`

Expo Router route 파일만 둔다.
route 파일은 params를 읽고 screen을 연결하는 역할만 한다.

예시:

```text
app/(tabs)/schedule/index.tsx
  -> src/screens/schedule-list

app/items/[itemId]/index.tsx
  -> src/screens/schedule-detail

app/items/[itemId]/edit.tsx
  -> src/screens/schedule-edit
```

`src/app/`은 최종 구조에서 사용하지 않는다.
Expo Router가 route로 해석할 수 있으므로 provider, helper, component를 넣지 않는다.

### `src/application/`

FSD의 App layer 역할을 한다.
앱 전체 조립만 담당한다.

포함 가능:

- provider 조립.
- bootstrap.
- app-level config 연결.
- router layout에서 호출하는 전역 wiring.

포함하지 않음:

- 화면 UI.
- 사용자 동작 use case.
- 도메인 규칙.
- 저장소 구현.

### `src/screens/`

route가 렌더링하는 화면 slice를 둔다.
slice 이름은 route 폴더명보다 화면 역할과 도메인 언어를 우선한다.

초기 screen slice:

```text
src/screens/home/
src/screens/schedule-list/
src/screens/calendar/
src/screens/settings/
src/screens/schedule-detail/
src/screens/schedule-create/
src/screens/schedule-edit/
src/screens/login/
```

screen 내부에는 화면 전용 `ui`, `model`, `api` segment를 둘 수 있다.
화면 전용 controller, loading state, error state, helper는 해당 screen slice 안에 둔다.

### `src/features/`

사용자 동작과 use case만 둔다.
명사형 도메인이나 화면 이름을 feature로 만들지 않는다.

초기 후보:

```text
src/features/create-schedule/
src/features/update-schedule/
src/features/archive-schedule/
src/features/complete-occurrence/
src/features/skip-occurrence/
src/features/sign-in/
src/features/delete-account/
src/features/sync-local-notifications/
```

화면 이름을 가진 기존 모듈은 feature가 아니다.
`home`, `calendar-view`, `reminder-list`는 최종적으로 `screens`로 이동한다.

### `src/entities/`

핵심 도메인 slice를 둔다.
일정 도메인은 `schedule` slice로 시작한다.

```text
src/entities/schedule/
  model/
  lib/
  api/
  ui/
```

`occurrence`, `completion log`, `schedule version`, 반복 규칙은 `schedule` 내부 개념으로 둔다.
별도 entity slice로 분리하지 않는다.

DB table, RPC, Supabase schema 이름은 이 전환의 직접 대상이 아니다.
저장 경계 이름 변경은 별도 결정으로 다룬다.

### `src/shared/`

공통 기반 도구만 둔다.
도메인을 아는 코드는 `shared`에 두지 않는다.

최상위 segment:

```text
src/shared/
  api/
  config/
  i18n/
  routes/
  ui/
  lib/
```

`shared/lib` 아래에는 반드시 목적이 분명한 주제 폴더를 둔다.

```text
src/shared/lib/date/
src/shared/lib/errors/
src/shared/lib/notifications/
src/shared/lib/privacy/
src/shared/lib/query/
```

예시 기준:

- `shared/api`: Supabase client, generated `Database` type.
- feature/entity repository: table row alias, RPC input alias, 도메인 저장 타입.
- `shared/lib/privacy`: 암호화 primitive, byte/base64 helper.
- `entities/schedule`: 일정 제목/설명 암호화처럼 schedule 도메인을 아는 코드.
- `shared/lib/notifications`: Expo Notifications adapter, identifier parser.
- `features/sync-local-notifications`: 일정 알림을 언제 예약하고 다시 맞출지 정하는 동작.

## Segment Naming

segment 이름은 코드 형태가 아니라 목적을 드러내야 한다.

사용 가능:

```text
ui
api
model
lib
config
routes
i18n
assets
```

사용하지 않음:

```text
components
hooks
types
utils
helpers
constants
```

`lib`는 주제 폴더 없이 쓰지 않는다.
`shared/lib/utils.ts`, `shared/lib/misc.ts` 같은 파일은 만들지 않는다.

## Widgets

초기 전환에서는 `widgets` layer를 만들지 않는다.

현재 앱에는 여러 screen에서 독립적으로 재사용되는 큰 UI 블록이 많지 않다.
얇은 경유지를 만들 가능성이 더 크므로 제외한다.

나중에 여러 screen에서 재사용되고, feature와 entity를 조합하는 완결된 UI 블록이 생기면 별도 결정으로 추가한다.

## 전환 순서

1. Route shell과 application layer 기준 세우기.
   `src/app` route를 루트 `app`으로 옮긴다.
   provider, bootstrap, app-level wiring은 `src/application`으로 옮긴다.
   route 파일은 params를 읽고 screen만 연결한다.
   route가 직접 가진 화면 구현은 `src/screens`로 옮긴다.
2. Screens 정리.
   `home`, `schedule-list`, `calendar`, `schedule-detail`, `schedule-create`, `schedule-edit`, `login`을 만든다.
   이미 만든 `settings`는 같은 screen slice 기준을 따른다.
3. Shared 정리.
   디자인 시스템, QueryClient, error helper, Supabase client, Sentry config를 `shared` 기준으로 옮긴다.
4. `entities/schedule` 생성.
   일정 도메인 타입, 반복 규칙, occurrence 계산, projection, validation, 수정 정책, display logic을 먼저 옮긴다.
   저장소는 privacy cipher 의존 방향을 정리한 뒤 `api` segment로 옮긴다.
5. Features 추출.
   일정 생성/수정/보관, occurrence 완료/건너뛰기, 로그인, 계정 삭제, 알림 동기화를 use case 단위로 나눈다.
6. Application wiring 보강.
   route shell이 요구하는 전역 wiring이 늘어나면 `src/application` 안에서 목적별로 정리한다.
7. Import rule과 public API 정리.
   barrel export, path alias, lint rule 또는 dependency rule을 추가한다.

## 작업 단위

각 단계는 다음 순서로 진행한다.

1. 파일을 새 FSD 위치로 이동한다.
2. import와 public API를 정리한다.
3. 같은 경계 안의 중복을 제거한다.
4. 얇은 wrapper, helper, pass-through component를 제거한다.
5. 동작 의미는 유지한다.
6. 테스트 위치와 이름을 새 경계에 맞춘다.
7. 변경 범위에 맞게 검증한다.

## 간소화 기준

구조 전환은 단순 파일 이동이 아니다.
만지는 경계 안에서는 코드 간소화도 함께 진행한다.

허용:

- 단순 pass-through 컴포넌트 삭제.
- 의미 없는 wrapper, hook, helper 제거.
- 같은 경계 안의 중복 formatter/controller 통합.
- dead code 삭제.
- public API 정리.

금지:

- 도메인 정책 변경.
- UI/UX 동작 변경.
- DB table, RPC, schema 이름 변경.
- 확인된 중복 없이 새 generic abstraction 추가.
- 현재 단계 밖의 광범위한 리팩터링.

## 검증

문서만 바꾸면 다음을 실행한다.

```sh
pnpm exec prettier --check <files>
git diff --check
```

코드를 바꾸면 변경 범위에 맞춰 다음을 실행한다.

```sh
pnpm jest --runInBand
npx tsc --noEmit
pnpm lint
git diff --check
```

Supabase Edge Function을 바꾸면 추가로 실행한다.

```sh
pnpm supabase:functions:check
```
