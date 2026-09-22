# System Design

이 문서는 현재 코드의 구현 경계와 데이터 흐름을 설명한다.
제품 동작은 [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md), 계산 규칙은 [`DOMAIN_LOGIC.md`](DOMAIN_LOGIC.md)를 따른다.

## 구조

앱은 Expo Router와 역할 중심의 평면 모듈을 사용한다. 선택 배경은 [`ADR 0005`](adr/0005-role-based-flat-modules.md)에 기록한다.

- `app/`: route와 페이지 조립.
- `src/screens/`: 한 화면이 소유하는 조회, 상태, 동작과 UI.
- `src/schedule/`: 여러 화면이 공유하는 일정 규칙, 저장, 조회와 표시.
- `src/session/`, `src/account/`: 세션, 인증, profile과 계정 삭제.
- `src/notifications/`, `src/widgets/`: 기기 알림과 iOS 위젯 projection 동기화.
- `src/i18n/`, `src/theme/`, `src/sentry/`: 앱 전역 정책.
- `src/ui/`: 일정 지식이 없는 공용 UI.

화면 전용 코드는 화면이 소유하고 여러 화면이 공유하는 코드는 제품 역할 모듈이 소유한다.
화면 모듈끼리는 직접 의존하지 않으며 외부 I/O는 역할 모듈을 거친다.
전달만 하는 배럴, 호환 wrapper, `v2` 구조와 한 파일용 디렉터리는 만들지 않는다.
테스트는 구현 파일 옆에 두고 스타일은 실제로 공유할 때만 분리한다.

## 앱 경계

하단 탭은 홈, 목록, 캘린더와 설정을 연결하고 상세, 생성과 수정은 탭 밖의 집중 화면으로 연다.
일정 추가는 탭이 아닌 전역 동작이다.
iOS는 Expo Router Native Tabs와 Expo UI를 사용하고 Android는 React Navigation 기반 커스텀 탭을 유지한다.

앱 루트는 테마, 표시 언어, query, 세션과 알림 provider를 조립한다.
세션과 profile이 준비되기 전에는 인증된 화면을 열지 않는다.

## 데이터 기준

Supabase Postgres가 계정, profile, 일정과 occurrence 처리 기록의 최종 기준이다.
클라이언트는 서버 데이터를 읽고 occurrence, 홈 섹션, 캘린더 marker, 기기 알림과 위젯 snapshot을 파생한다.

[`database/DATABASE.sql`](database/DATABASE.sql)은 현재 운영 스키마 snapshot이다.
배포 변경 이력은 `supabase/migrations/`에 두며 스키마 변경 전에는 운영 DB와 snapshot을 함께 확인한다.

## 세션과 profile

Supabase Auth 세션은 SecureStore 기반 auth storage에 보존하고 초기 세션과 이후 변경을 `onAuthStateChange`에서 처리한다.
세션 상태는 `loading`, `signedOut`, `ready`, `error` 중 하나이며 `ready`는 사용자와 profile이 모두 준비된 상태다.

profile이 없으면 현재 기기 timezone과 provider 표시 이름으로 생성한다.
사용자가 수정한 표시 이름은 provider metadata로 덮어쓰지 않는다.
세션이 바뀐 뒤 끝난 이전 요청은 현재 상태에 적용하지 않는다.
profile 준비 실패는 기록하고 재시도 화면을 보여준다.

## 일정 저장과 조회

일정 row와 초기 규칙 버전은 하나의 RPC로 만든다.
수정은 메타 변경과 규칙 변경을 계산해 하나의 RPC로 저장하며 규칙이 바뀔 때만 새 버전을 추가한다.
일정 삭제는 `is_archived = true`를 저장하는 RPC를 사용한다.
새 규칙 버전의 적용 시각은 수정한 기기의 현재 시각을 사용한다.

일정 변경 흐름은 `검증 → 내용 암호화 → RPC 저장 → 현재 기기 알림 재동기화 → query 갱신` 순서다.
알림 동기화가 실패해도 저장된 변경을 되돌리지 않고 실패를 기록한 뒤 query를 갱신한다.

완료와 건너뛰기도 처리 기록 저장, 알림 재동기화, query 갱신 순서를 사용한다.
여러 처리 기록은 단일 insert로 원자적으로 저장한다.

화면 query는 활성 일정 최대 500개와 필요한 처리 기록·완료일 기준 anchor를 읽고 화면 모듈이 projection을 만든다.
상세는 진입한 `scheduledAtUtc`, 최신 지난 일정, 다음 occurrence 순서로 대표 상태를 고른다.
최근 처리 기록은 실제 처리 시각 최신순 5건만 읽는다.

## 내용 암호화와 복구

일정 제목과 설명은 앱에서 사용자별 content key로 AES-GCM 암호화한다.
서버 DB에는 암호문과 wrapped content key만 저장한다.

1. 앱이 SecureStore에서 content key를 읽거나 만든다.
2. Edge Function이 서버 secret으로 key를 wrap한다.
3. 사용자 ID와 key version을 AES-GCM additional data로 결합한다.
4. wrapped key를 사용자 소유 row에 저장한다.
5. 새 기기는 인증된 Edge Function 호출로 key를 복구해 SecureStore에 저장한다.

기존 기기 key에 대응하는 서버 row가 없으면 현재 key를 wrap해 보충한다.
기기 key 복호화가 실패하면 서버 key를 복구해 한 번 다시 시도한다.
기존 사용자 결합 전 wrapped key는 클라이언트 변경을 막고 정상 복구 뒤 사용자 결합 형식으로 다시 저장한다.

서버 DB만으로 content key와 평문을 복구할 수 없어야 한다.
Edge Function은 key만 wrap하거나 recover하며 일정 암호문을 복호화하지 않는다.
서버 실행 경계를 신뢰하므로 strict E2EE는 아니다.

복구 감사 이벤트에는 사용자, 동작, key version과 낮은 해상도 결과만 남긴다.
평문, key, 암호문과 내부 예외 메시지는 기록하지 않으며 사용자가 직접 조회할 수 없다.
복구 불가 일정은 숨기지 않고 fallback 제목과 빈 설명을 사용하며 상세에서 삭제만 허용한다.

## 계정 삭제

로그인한 사용자의 계정 삭제는 JWT를 검증하는 `delete-account` Edge Function에서 처리한다.
클라이언트는 service role key를 보유하지 않는다.

1. 앱이 사용자 확인을 받는다.
2. Apple 계정이면 삭제 직전에 재인증 code를 받는다.
3. Edge Function이 JWT 사용자와 provider를 확인한다.
4. Apple 계정이면 token revoke와 identity 일치를 확인한다.
5. Auth user를 삭제하고 외래 키 cascade로 사용자 데이터를 삭제한다.
6. 앱이 로컬 세션과 현재 기기 알림을 정리한다.

실패 응답은 내부 삭제 단계와 secret 경계를 노출하지 않는다.
Apple private key, service role key와 OAuth secret은 Edge Function secret으로만 관리한다.

## 기기 로컬 알림

알림은 서버 데이터에서 계산해 현재 기기 OS에 예약하는 파생 상태다.
Ttokttak identifier를 가진 기존 예약과 원하는 후보를 비교해 달라진 항목만 취소하거나 추가한다.

후보는 OS 권한이 있고, 보관되지 않았으며, 알림이 켜진 복구 가능한 일정의 종료일 이내 `scheduled` occurrence다.
완료일 기준 일정에 미해결 occurrence가 있으면 다음 후보를 만들지 않는다.
후보 범위는 현재부터 30일과 각 일정의 그 이후 첫 occurrence이며 가까운 순서로 최대 60개를 예약한다.

identifier는 사용자, 일정과 예정 시각을 포함한다.
payload에는 알림 종류와 일정 알림 source만 넣고 표시 내용에는 제목과 예정 시각만 사용한다.

앱 아이콘 뱃지는 처리 필요 수의 절대값으로 맞추고 각 예약에도 예정 시각의 예상 절대값을 넣는다.
처리됐거나 활성 일정에 속하지 않는 표시 알림은 제거한다.
로그아웃과 계정 삭제 때 알림을 제거하고 뱃지를 0으로 맞춘다.

세션, timezone, 표시 언어, foreground 복귀, 알림 tap, 일정 변경과 occurrence 처리는 전체 알림 동기화를 실행한다.
세션이 없으면 현재 기기의 Ttokttak 알림을 모두 취소한다.
실패는 Sentry에 기록하되 사용자 동작이나 로그아웃을 되돌리지 않는다.

예약을 변경한 뒤 OS 목록을 다시 읽어 원하는 identifier 집합과 비교한다.
불일치는 기록하되 자동 재시도나 별도 사용자 알림은 추가하지 않는다.
OS의 실제 알림 표시는 확인하거나 보장하지 않는다.

## iOS 홈 화면 위젯

`expo-widgets` config plugin이 WidgetKit 확장과 App Group을 생성한다.
생성된 `ios/` 코드는 직접 수정하지 않는다.

메인 앱이 데이터를 조회·복호화해 위젯 projection을 만들고 위젯 확장은 Supabase, 세션과 content key에 접근하지 않는다.
App Group `UserDefaults`에는 최대 6개의 일정 색상, 제목, 알림 시각과 지난 날짜 수만 저장한다.
복호화된 제목이 로컬 공유 저장소에 남는 경계는 [`ADR 0006`](adr/0006-expo-ios-home-widget.md)을 따른다.

앱 시작, foreground 복귀, 세션·표시 언어·timezone 변경과 일정 mutation이 위젯을 갱신한다.
세션이 없으면 로그인 안내 snapshot으로 이전 제목을 덮어쓰며 이전 세션에서 시작한 늦은 동기화는 다시 쓰지 못한다.
갱신 실패는 Sentry에 기록하고 알림 동기화와 사용자 동작은 계속한다.

## 표시 언어와 테마

표시 언어와 테마 provider는 세션 밖에서 로그인 전후 화면을 감싸며 설정은 현재 기기에 저장한다.
표시 언어 초기화 실패는 한국어로 다시 시도하고 한국어도 실패하면 재시도 화면을 보여준다.
번역 resource는 모든 지원 언어 key를 가지며 날짜 locale은 외부 adapter 경계에서만 사용한다.

테마 초기화에 실패하면 시스템 설정을 사용한다.
화면은 semantic theme token을 사용하고 일정 색상은 테마와 분리해 같은 identity를 유지한다.
`color_hex`와 구버전 `color_key`의 호환 규칙은 [`ADR 0007`](adr/0007-legacy-compatible-schedule-colors.md)을 따른다.

## 보안과 오류 수집

앱 번들에는 `EXPO_PUBLIC_*` public 설정만 넣는다.
service role key, private key, OAuth client secret과 Sentry auth token은 앱 번들에 넣지 않는다.

Sentry에는 오류 타입, stack, release, environment와 허용한 tag만 전송한다.
사용자 정보, request, breadcrumb, context, extra와 원본 오류 메시지는 전송하지 않는다.

민감 Edge Function은 인증된 `POST`만 처리하고 `Cache-Control: no-store`를 사용한다.
native 앱 전용인 현재 범위에서는 공개 health endpoint와 CORS `OPTIONS`를 제공하지 않는다.
복구와 계정 삭제 rate limit은 instance 메모리 기준의 best-effort 보호이며 분산 제한이 필요할 때 별도 설계한다.
