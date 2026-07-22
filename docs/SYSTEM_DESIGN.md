# System Design

이 문서는 현재 코드의 구현 구조와 데이터 흐름만 설명한다.
제품 범위는 `PRODUCT_SPEC.md`, 도메인 계산 규칙은 `DOMAIN_LOGIC.md`를 따른다.

## Stack

- Expo.
- React Native.
- Expo Router.
- Expo Updates.
- TypeScript.
- React Hook Form.
- Zod.
- TanStack Query.
- Supabase Auth.
- Supabase Postgres.
- Supabase Edge Functions.
- Expo Notifications.
- Expo SecureStore.
- Expo Crypto.
- date-fns / date-fns-tz.
- Sentry.

## Architecture

현재 앱은 React Native와 Expo Router에 맞춘 FSD 계열 구조를 사용한다.
코드 위치는 폴더 템플릿보다 재사용 범위와 제품 의미를 기준으로 정한다.

- 루트 `app`: Expo Router route 파일.
- `src/application`: provider, bootstrap, session, navigation 같은 앱 조립.
- `src/screens`: route가 렌더링하는 화면 slice.
- `src/features`: 화면이 사용하는 제품 기능 흐름, 조회 흐름, 권한, 외부 링크.
- `src/entities`: 핵심 도메인 slice와 저장 adapter.
- `src/shared`: 도메인을 모르는 공통 기반 코드.

### Presentation

- `app`: route params를 읽고 screen을 연결하는 thin route shell.
- `src/screens/home`: 홈 피드 화면, 섹션 view model, 화면 controller.
- `src/screens/schedule-list`: 일정 목록 화면, 정렬, empty/loading/error 상태.
- `src/screens/calendar`: 캘린더 화면, 월 상태, 날짜별 일정 표시.
- `src/screens/schedule-detail`: 일정 상세 화면, 요약, 히스토리, 보관 진입점.
- `src/screens/schedule-form`: 생성/수정 route가 공유하는 form 화면 구현.
- `src/screens/login`: 로그인 화면.
- `src/screens/settings`: 설정 화면, 설정 action controller, 행 렌더링.
- `src/shared/ui`: 공통 텍스트, 화면, 카드, 버튼, token.

### Application

- `src/application/providers`: provider 조립.
- `src/application/bootstrap`: session 준비 뒤 splash screen 종료.
- `src/session`: Supabase session Context와 Apple, Google 인증.
- `src/account`: profile 복원, 표시 이름 저장과 계정 삭제.
- `src/application/navigation`: 탭 layout, 집중 화면 하단 탭 표시 정책.
- `src/notifications`: 알림 권한 Context, lifecycle, tap 처리와 Expo 예약.
- `src/application/routes`: route params 정규화.
- `src/application/schedule-read`: schedule read context wiring.
- 화면 controller hook이 query, mutation, navigation을 조합한다.
- React Query가 서버 데이터 조회와 무효화를 담당한다.
- mutation feature는 저장 성공 뒤 관련 query를 무효화하고 로컬 알림을 다시 맞춘다.

### Domain

- `src/entities/schedule/model`: 일정 타입, 반복 규칙, occurrence 계산, occurrence projection, validation, 수정 정책.
- `src/entities/schedule/lib`: 일정 날짜, 시간, 반복 규칙 표시 primitive의 기준 경계.
- `src/entities/schedule/api`: 일정 persistence, Supabase row mapping, RPC 호출, 일정 내용 암복호화 fallback.
- `src/entities/schedule/ui`: 일정 색상 표시와 일정 요약 row.
- `src/features/mutate-schedule`: 일정 생성, 수정, 보관 use case와 mutation 이후 query 무효화, 로컬 알림 재동기화 후속 흐름.
- `src/features/home-feed-occurrence-action`: 홈 피드의 완료와 건너뛰기 use case.
- `src/features/read-schedule`: 일정 조회 query, 목적별 occurrence projection read hook, query key.
- `src/features/settings`: 설정 화면의 표시 이름 입력 규칙.
- `src/features/legal`: 이용약관과 개인정보처리방침 공개 링크.
- 도메인 함수는 Supabase client 모양을 알지 않는다.

### Infrastructure

- `src/shared/lib/privacy`: AES-GCM primitive, content key 저장/복구 helper, content key 복구 저장소, privacy 공통 helper.
- `src/supabase.ts`: SecureStore를 사용하는 Supabase client singleton.
- `src/database.types.ts`: 생성된 Supabase schema type.
- `src/sentry`: 오류 수집 초기화, 앱에서 사용하는 Sentry 함수와 event 전송 정책.
- `src/theme`: 테마 저장, 기기 화면 표시 설정 해석, Context와 provider.
- `src/shared/lib/*`: QueryClient, error helper, privacy sanitizer 같은 공통 기반 lib.

### Architecture Rules

- `screens`, `features`, `entities` slice 외부 호출자는 root `index.ts` 공개 진입점을 사용한다.
- `entities/<slice>/api`는 저장 adapter 공개 진입점이다.
- `entities/<slice>/testing`은 테스트 fixture 공개 진입점이다.
- `application`은 segment root를 공개 진입점으로 사용한다.
- 같은 slice 내부에서는 segment 파일을 직접 import할 수 있다.
- `shared`는 작은 foundation이므로 `shared/ui`, `shared/api`, `shared/config` 파일 직접 import를 허용한다.
- `shared/lib/<topic>`은 주제 경계다. Barrel import가 side effect나 bundle coupling을 만들면 leaf 파일 직접 import를 허용한다.
- FSD 공개 진입점과 layer boundary는 구조 변경 때 agent review로 확인한다.
- slice segment 이름은 `api`, `assets`, `config`, `i18n`, `lib`, `model`, `routes`, `ui`만 사용한다.
- `shared` 최상위 segment 이름은 `api`, `config`, `i18n`, `lib`, `routes`, `theme`, `ui`만 사용한다.
- `components`, `hooks`, `types`, `utils`, `helpers`, `constants`는 segment 이름으로 쓰지 않는다.
- `widgets` layer는 현재 만들지 않는다. 여러 화면에서 재사용되고 feature와 entity를 조합하는 큰 UI 블록이 생기면 별도 결정으로 추가한다.
- 앱 문구나 날짜/시간 표시 문구를 만드는 화면 model 경계는 `AppLanguage`를 필수 입력으로 받는다.
- 한국어 fallback 기본값은 shared/entity 표시 primitive나 테스트 helper처럼 의도적으로 좁은 경계에서만 둔다.
- 화면 model은 일정 날짜/시간 표시를 직접 format하지 않고 `entities/schedule/lib`의 표시 primitive를 조합한다.
- 특정 UI 라이브러리 전역 locale 설정은 해당 화면 내부에 둘 수 있지만 render 중에 변경하지 않는다.
- 표시 언어 초기화 실패는 앱 진입을 막지 않고 한국어 fallback으로 계속 진행한다.
- 표시 언어 초기화 실패 상태는 재시도 가능해야 하며 Promise cache에 영구 고정하지 않는다.
- 한국어 fallback 초기화까지 실패하면 i18n에 의존하지 않는 한국어 bootstrap 오류 화면과 재시도 액션만 보여준다.
- 지원 언어의 기준은 `appLanguages`와 `fallbackAppLanguage`다.
- 표시 언어 resource는 모든 `AppLanguage` key를 가져야 하며 타입으로 드리프트를 막는다.
- 앱 내부 public 경계는 `locale`이 아니라 `AppLanguage`를 노출한다.
- `locale`은 date-fns, Expo Localization, React Native Calendar 같은 외부 라이브러리 adapter 경계에서만 사용한다.
- 네이티브 번들 localization 선언은 지원 언어와 맞춘다.
- 네이티브 앱 표시명 다국어화는 필요가 확인될 때 별도 범위로 다룬다.
- 표시 언어 변경은 런타임 적용과 저장된 설정이 갈라지지 않게 처리한다.
- 표시 언어 저장 실패는 사용자에게 알리고 다음 시작 때 적용될 언어를 모호하게 두지 않는다.
- 테마 provider는 session과 무관하게 로그인 전 화면과 로그인 후 화면을 모두 감싼다.
- 테마 초기화 실패는 앱 진입을 막지 않고 시스템 fallback으로 계속 진행한다.
- 테마 select는 시스템, 라이트, 다크 순서로 표시한다.
- 테마는 전역 provider와 semantic color token hook으로 적용한다.
- 컴포넌트는 정적 `colors` 객체를 직접 고정하지 않고 현재 테마의 의미 토큰을 읽는다.
- 테마 적용 작업은 shared UI, navigation/app shell, settings/login, schedule screens 순서로 넓힌다.
- StatusBar는 resolved theme에 맞춰 라이트 테마에서 dark style, 다크 테마에서 light style을 사용한다.
- 시스템 테마는 실행 중 기기의 화면 표시 설정 변경을 즉시 따른다.
- 라이트 또는 다크 테마를 직접 고른 상태에서는 기기의 화면 표시 설정 변경을 따르지 않는다.
- 일정 색상 팔레트는 테마와 무관하게 같은 색상값을 사용한다.
- 일정 색상은 marker, swatch, line 같은 보조 표시에만 사용한다.
- 일정 관련 텍스트와 아이콘은 일정 색상 위에 올리지 않고 현재 테마의 text 토큰을 사용한다.
- 홈 피드 섹션 카드처럼 화면 전용 고정 표현 색상은 해당 screen slice가 소유하고 shared theme token으로 승격하지 않는다.
- 배경, 표면, 텍스트, border, divider, disabled text, control track, scrim, shadow, soft container는 테마별 의미 토큰으로 분리한다.
- accent, error, green, amber, red, blue 계열은 의미와 hue를 유지하되 테마별 대비가 부족하면 tone을 조정한다.
- 테마 저장 실패는 사용자에게 알리고 다음 시작 때 적용될 테마를 모호하게 두지 않는다.
- 순수 검증 model은 i18next에 의존하지 않고 `AppLanguage` 기준 사용자-facing 검증 메시지를 만든다.
- 검증 메시지가 여러 경계에서 반복되면 shared i18n resource가 아니라 해당 feature/entity 표시 primitive로 모은다.
- 일정 form은 입력 shape를 Zod로 확인하고 반복 규칙은 entity validator 결과를 사용자 문구로 바꿔 표시한다.

## Routing

하단 탭은 홈, 목록, 캘린더, 설정으로 구성한다.
상세, 생성, 수정은 하단 탭을 숨기는 집중 화면이다.

주요 route:

- `/`: 로그인 또는 인증 후 홈 redirect.
- `/(tabs)/home`: 홈.
- `/(tabs)/schedule`: 일정 목록.
- `/(tabs)/calendar`: 캘린더.
- `/(tabs)/settings`: 설정.
- `/items/new`: 일정 생성.
- `/items/[itemId]`: 일정 상세.
- `/items/[itemId]/edit`: 일정 수정.

## Source Of Truth

Supabase Postgres가 서버 데이터의 최종 기준이다.
클라이언트는 서버 row를 읽고, 화면에 필요한 occurrence를 런타임에서 계산한다.

저장하지 않는 값:

- occurrence row.
- 홈 섹션 row.
- 달력 marker row.
- 로컬 알림 예약 metadata row.

기기 로컬 알림은 현재 기기 OS에 예약된 파생 상태다.
알림 예약은 source of truth가 아니다.

## Update Delivery

앱은 `expo-updates`와 EAS Update를 사용한다.
production 빌드는 `production` channel을 사용한다.
preview 빌드는 `preview` channel을 사용한다.
`runtimeVersion`은 `appVersion` 정책을 사용한다.

같은 앱 버전과 runtime 안에서는 JS와 asset 변경을 OTA로 받을 수 있다.
네이티브 코드, 권한, entitlements, native dependency 변경은 새 스토어 빌드가 필요하다.
현재 OTA 운영 대상은 iOS와 Android다.
web export는 운영 대상이 아니므로 EAS Update는 플랫폼별로 발행한다.

## Data Model

현재 주요 table은 다음과 같다.

- `profiles`: 사용자 timezone과 앱 표시 이름.
- `recurring_items`: 일정 메타, 보관 여부, 색상, 암호화된 제목/설명.
- `recurring_item_schedule_versions`: 반복 규칙 version.
- `completion_logs`: occurrence 처리 기록.
- `user_content_encryption_keys`: content key 복구용 wrapped key.
- `content_key_recovery_audit_events`: 서버 측 내용 복구 호출 감사 이벤트.

기준 스키마에는 원격 푸시용 `device_push_tokens`, `notification_delivery_jobs`, `notification_delivery_attempts`, `notification_inbox_items`를 두지 않는다.

## Auth And Session

Supabase Auth를 사용한다.
Supabase URL과 publishable key는 앱 실행에 필요한 public env다.
세션은 `expo-secure-store` 기반 Supabase auth storage에 보존한다.
초기 세션과 이후 auth 변경은 `onAuthStateChange` 단일 경로로 적용한다.
늦게 완료된 이전 세션의 profile 조회 결과는 현재 세션에 적용하지 않는다.

세션 복원 시 profile을 확인한다.
profile이 없으면 현재 기기 timezone과 provider metadata 이름으로 생성한다.
사용자가 설정에서 수정한 표시 이름은 provider metadata로 덮어쓰지 않는다.
profile 준비 실패는 Sentry에 기록하고 앱 진입을 막는다.
사용자에게 내부 오류를 노출하지 않고 다시 시도 동작을 제공한다.

### Account Deletion

로그인된 사용자의 계정 삭제는 JWT 검증이 켜진 `delete-account` Supabase Edge Function에서 처리한다.
클라이언트는 service role key를 절대 보유하지 않는다.

처리 흐름:

1. 앱은 사용자 확인 UI를 거친 뒤 Edge Function을 호출한다.
2. Apple 계정이면 앱은 삭제 직전에 Apple 재인증을 요청하고 authorization code를 Edge Function에 전달한다.
3. Edge Function은 현재 JWT로 사용자 id와 provider를 확인한다.
4. Edge Function은 Apple 계정인데 authorization code가 없으면 삭제를 거부한다.
5. Apple authorization code가 있으면 Edge Function이 Apple token revoke를 먼저 처리하고 Apple identity 일치를 확인한다.
6. Edge Function은 service role 권한으로 Supabase Auth user를 삭제한다.
7. `auth.users` 삭제는 `profiles`와 사용자 데이터의 cascade 삭제를 발생시킨다.
8. 앱은 로컬 세션과 현재 기기의 Ttokttak 로컬 알림을 정리한다.

계정 삭제 실패 응답은 내부 삭제 단계나 service role key 경계를 노출하지 않는다.
앱은 세션 없음 또는 만료만 별도 안내하고, 그 외 실패는 단순 실패 안내로 표시한다.

Apple token revoke에 필요한 Team ID, Key ID, Client ID, private key는 Edge Function secret으로만 관리한다.
클라이언트는 Apple private key나 service role key를 절대 보유하지 않는다.

공개 웹의 계정 삭제 요청은 로그인할 수 없는 사용자를 위한 접수 경로다.
해당 요청은 자동 삭제가 아니라 운영 확인 뒤 처리한다.

## Recurring Item Flow

repository는 item과 schedule version을 함께 읽는다.
도메인 `RecurringItem`은 비어 있지 않은 schedule version 목록을 제공한다.
화면, 수정 정책, 알림은 공통 accessor로 최신 version을 읽는다.
DB schema와 RPC의 규칙 필드를 별도 현재 값으로 복사하지 않는다.

### Create

1. form 입력을 검증한다.
2. 제목과 설명을 암호화한다.
3. `create_recurring_item_with_initial_version` RPC로 item과 초기 schedule version을 함께 만든다.
4. 현재 기기의 기기 로컬 알림을 재동기화한다.
5. query를 무효화한다.

### Update

1. 기존 item과 schedule version을 읽는다.
2. 수정 정책으로 메타 변경과 규칙 변경을 구분한다.
3. 제목과 설명을 다시 암호화한다.
4. `update_recurring_item_with_edit_policy` RPC로 item을 갱신한다.
5. 규칙 변경이면 새 schedule version을 추가한다.
6. 현재 기기의 기기 로컬 알림을 재동기화한다.
7. query를 무효화한다.

### Archive

삭제 UX는 `archive_recurring_item` RPC로 `is_archived = true`를 저장한다.
보관 후 현재 기기의 기기 로컬 알림을 재동기화하고 query를 무효화한다.

### Complete / Skip

홈 피드 occurrence 처리 feature는 `completion_logs`에 기록을 만든다.
여러 occurrence를 함께 처리하면 단일 batch insert로 전부 기록하거나 전부 실패한다.
지난 일정 action은 이전 미해결 overdue occurrence도 함께 기록할 수 있다.
기록 후 query를 무효화하고 로컬 알림을 다시 맞춘다.

completion log 조회는 projection 목적이나 후속 계산에 필요한 범위로 제한한다.
상세 화면의 최근 히스토리는 최신 5건만 표시한다.
상세 화면의 최근 히스토리 조회와 occurrence projection 조회는 분리한다.
상세 화면의 occurrence projection은 일정 시작 이후 전체 미해결 occurrence를 판정할 수 있는 completion log를 사용한다.
MVP는 전체 completion log 탐색이나 무한 스크롤을 제공하지 않는다.
`completion_based` 일정의 다음 occurrence 계산에는 표시 범위 이전의 최신 완료 기록 1건을 별도 anchor로 사용할 수 있다.
read-schedule의 목적별 projection read hook은 홈 피드, 일정 목록, 캘린더, 상세 화면의 조회 범위, completion log anchor, occurrence entry 조립을 숨긴다.
화면의 날짜 상태는 profile timezone을 기준으로 만든다.
화면별 문구, 정렬, card, row, marker 구성은 각 screen slice가 맡는다.

### 종료일 정책

종료일은 schedule version의 `endDateLocal`로 저장한다.
종료일이 있으면 occurrence local date가 종료일보다 늦은 occurrence는 만들지 않는다.
한 번 일정은 종료일을 갖지 않는다.
종료일은 nullable이며, 기존 일정과 종료일이 없는 반복 일정은 null을 유지한다.
종료일 변경은 규칙 변경으로 처리한다.
종료일 변경은 수정 시점 이후 occurrence에만 적용하고 과거 completion log를 다시 쓰지 않는다.
`completion_based` 일정도 완료한 날짜가 아니라 occurrence local date 기준으로 종료일을 적용한다.
anchor 조회는 화면 히스토리 조회와 섞지 않는다.

일정 목록은 MVP에서 active 일정 최대 500개를 조회한다.
500개를 넘는 사용자를 위한 검색과 페이지네이션은 후속 범위로 둔다.

조회 인덱스는 필터, 정렬, limit 패턴을 함께 기준으로 둔다.
일정 목록은 `user_id`, `is_archived`, `created_at desc` 순서를 기준으로 조회한다.
completion log 최신 히스토리는 `user_id`, `item_id`, `scheduled_at_utc desc` 순서를 기준으로 조회한다.
`completion_based` anchor 조회는 `user_id`, `item_id`, `action`, `acted_at_utc desc` 순서를 기준으로 조회한다.

## Content Privacy

일정 제목과 설명은 앱에서 AES-GCM으로 암호화한다.
암호화 key는 사용자별 content key다.

content key 흐름:

1. 앱은 content key를 생성하거나 SecureStore에서 읽는다.
2. 서버 복구를 위해 content key를 Edge Function secret으로 wrap한다.
3. wrapped key는 `user_content_encryption_keys`에 저장한다.
4. 새 기기에서 SecureStore key가 없으면 Edge Function으로 content key를 복구한다.
5. 복구된 key는 다시 SecureStore에 저장한다.

제한:

- 서버 DB table만으로 제목과 설명 평문을 복구할 수 없어야 한다.
- Edge Function은 content key만 wrap/recover하고 제목/설명 ciphertext를 복호화하지 않는다.
- strict E2EE는 아니다. 서버 실행 경계가 악의적이면 복구 순간 평문 접근 가능성이 있다.

복구 감사:

- `recover-content-key`는 호출 결과를 `content_key_recovery_audit_events`에 남긴다.
- 감사 이벤트는 user, action, key version, 낮은 해상도 result만 저장한다.
- 감사 이벤트는 제목, 설명, ciphertext, wrapped key, content key, exception message를 저장하지 않는다.
- 감사 이벤트 table은 authenticated 사용자에게 직접 조회 권한을 주지 않는다.

복호화 실패:

- 목록에서 일정은 숨기지 않는다.
- 제목은 복구 실패 fallback 문구로 표시한다.
- 설명은 비워 둔다.
- 상세 화면은 복구 실패 안내와 삭제 동작을 제공한다.
- 로컬 알림 예약 대상에서는 제외한다.

## Local Notifications

알림은 Expo Notifications 기반 기기 로컬 알림이다.
서버 원격 푸시는 사용하지 않는다.
추후 필요하면 별도 작업으로 설계한다.

예약 조건:

- OS 알림 권한이 `granted`.
- 일정이 보관되지 않음.
- 일정의 `notificationsEnabled`가 true.
- 일정 내용이 복구 불가 상태가 아님.
- occurrence 상태가 `scheduled`.
- occurrence local date가 종료일 이하이거나 종료일이 없음.

예약 범위:

- 기본 범위는 현재부터 30일이다.
- 각 일정의 다음 occurrence는 30일 밖이어도 후보에 추가한다.
- pending notification 상한은 코드 기준 60개다.
- 상한에 가까우면 예정 시각이 가까운 후보를 우선한다.

identifier:

```txt
ttokttak:reminder:{userId}:{itemId}:{scheduledAtUtc}
```

payload:

- `notificationKind = "reminder"`.
- `source = "recurring-item"`.

표시 content:

- title: 복호화한 일정 제목.
- body: 사용자 timezone 기준 예정 시각.
- 설명은 알림에 넣지 않는다.

## Notification Lifecycle

전체 재동기화 trigger:

- 세션 복원.
- 앱 foreground 복귀.
- 알림 tap.
- 표시 언어 변경.

범위 재동기화 trigger:

- 일정 생성.
- 일정 수정.
- 일정 보관.
- occurrence 완료.
- occurrence 건너뛰기.

세션이 없으면 알림 tap 동기화를 보류한다.
로그아웃 또는 세션 없음 상태가 되면 현재 기기의 Ttokttak 로컬 알림을 모두 취소한다.
취소 실패는 Sentry에 기록하되 로그아웃 자체를 막지 않는다.
기기 로컬 알림은 파생 예약 상태이므로 재동기화 실패 시 부분 rollback 모델을 만들지 않는다.
재동기화 실패는 기록하고 다음 lifecycle trigger에서 다시 맞춘다.

## Notification Tap Routing

알림 tap은 payload를 검증한 뒤 `/home`으로 이동한다.
지원하지 않는 payload는 navigation을 수행하지 않는다.

## Security And Observability

앱 번들에는 `EXPO_PUBLIC_*` public env만 포함한다.
service role key, private key, OAuth client secret, Sentry auth token은 앱 번들에 넣지 않는다.

Sentry event는 오류 타입과 stack trace, symbolication 정보, release, environment, `feature`와 `reason` tag만 전송한다.
오류 메시지, user, request, breadcrumb, context와 extra는 전송하지 않는다.

Edge Function secret은 Supabase 서버 실행 환경에만 둔다.
`recover-content-key`와 `delete-account`는 JWT 검증을 켠 상태로 배포한다.
두 함수는 인증된 `POST` 호출만 처리하고 응답에는 `Cache-Control: no-store`를 둔다.

민감 Edge Function에는 공개 health check endpoint를 만들지 않는다.
native 앱 호출 기준이므로 CORS `OPTIONS` 응답과 origin allowlist는 MVP에서 구현하지 않는다.
Expo web 또는 공개 웹 자동 처리 요구가 생기면 CORS를 별도 범위로 추가한다.

`recover-content-key`는 persistent 감사 이벤트와 사용자별 best-effort rate limit을 가진다.
`delete-account`는 사용자별 best-effort rate limit을 가진다.
두 rate limit은 Edge Function instance 메모리 기준이며 분산 전역 제한은 아니다.
분산 제한이 필요하면 Redis 같은 외부 저장소 기반 제한을 별도 강화 범위로 둔다.

## Operational Data Protection

Supabase Postgres 백업은 출시 전 운영 확인 대상이다.
운영 프로젝트는 자동 백업이 켜져 있어야 한다.

PITR(Point-in-Time Recovery, 특정 시점 복구)은 권장 설정이다.
PITR을 유료 기능으로만 사용할 수 있으면 첫 출시는 PITR 없이 진행할 수 있다.
이 경우 Supabase Dashboard에서 최신 자동 백업 상태와 보존 기간을 확인한다.

출시 전 확인 기록에는 다음을 남긴다.

- 확인 일시.
- Supabase project ref.
- 자동 백업 상태.
- 백업 보존 기간.
- PITR 사용 여부.
- PITR 미사용 사유.

## Testing Guardrails

현재 테스트는 다음 회귀를 확인한다.

- 반복 규칙과 occurrence 계산.
- 일정 수정 정책.
- repository mapping.
- 홈 occurrence action flow.
- 로컬 알림 예약과 lifecycle.
- 알림 tap routing.
- 제거한 원격 푸시 코드 경로의 과거 식별자 재도입.
- 제거한 content key 복구 정적 key의 과거 식별자 재도입.
- 복구 감사 이벤트의 민감 정보 저장.
- 표시 언어 초기화 실패가 blank screen으로 고정되지 않음.
- resource key completeness처럼 구조 자체가 요구사항인 경우에만 소스 문자열 기반 테스트를 사용한다.
- 테마 적용처럼 사용자-facing 동작은 구현 문자열 대신 provider로 실제 컴포넌트를 렌더링해 검증한다.
