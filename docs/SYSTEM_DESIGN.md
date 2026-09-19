# System Design

이 문서는 현재 코드의 구현 경계와 데이터 흐름을 설명한다.
제품 동작은 [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md), 계산 규칙은 [`DOMAIN_LOGIC.md`](DOMAIN_LOGIC.md)를 따른다.

## 구조

앱은 Expo Router와 역할 중심의 평면 모듈을 사용한다.

- `app/`: route와 페이지 컴포넌트.
- `src/screens/`: 한 화면이 소유하는 조회, 상태, 동작과 UI.
- `src/schedule/`: 여러 화면이 공유하는 일정 규칙, 저장, 조회와 표시.
- `src/session/`: 세션 상태와 Apple·Google 인증.
- `src/account/`: profile과 계정 삭제.
- `src/notifications/`: 권한, 후보 계산, 예약 동기화와 tap 처리.
- `src/i18n/`, `src/theme/`, `src/sentry/`: 앱 전역 provider와 정책.
- `src/ui/`: 일정 지식이 없는 공용 UI.

### 배치 규칙

- route에서 짧게 읽히는 화면 상태와 UI 조립은 페이지에 직접 둔다.
- 별도 검증이나 응집된 역할이 있는 화면 코드는 `screens/<화면>/`에 둔다.
- 화면 전용 UI는 `screens/<화면>/ui/`에 둔다.
- 화면 모듈끼리 직접 import하지 않는다. 여러 화면이 사용하는 코드는 공유 역할 모듈로 옮긴다.
- 여러 화면이 공유하는 코드는 제품 역할 이름의 최상위 모듈에 둔다.
- 외부 I/O는 화면에서 직접 호출하지 않고 해당 역할 모듈을 거친다.
- 한 파일을 위한 디렉터리, 전달만 하는 배럴, 호환 wrapper와 `v2` 구조는 만들지 않는다.
- `model`, `hooks`, `components`, `utils`, `helpers` 같은 기술 이름을 반복 계층으로 사용하지 않는다.
- 테스트는 구현 파일 옆에 둔다.
- 스타일은 사용하는 UI 파일에 두고 여러 UI가 실제로 공유할 때만 분리한다.

화면의 배타적 상태는 가능하면 하나의 status로 정한다.
JSX에서는 중첩 삼항보다 상태별 `&&` 블록을 사용한다.
오류, 안내와 빈 상태는 공용 `StateMessage`로 표현한다.

## 앱 경계

하단 탭은 홈, 목록, 캘린더와 설정을 연결한다.
일정 상세, 생성과 수정은 탭 밖의 집중 화면이다.
가운데 `+`는 탭이 아니라 일정 생성 동작이다.

앱 루트는 테마, 표시 언어, query, 세션과 알림 provider를 조립한다.
세션과 profile이 준비되기 전에는 인증된 화면을 열지 않는다.

## 데이터 기준

Supabase Postgres가 계정, profile, 일정과 occurrence 처리 기록의 최종 기준이다.
클라이언트는 서버 데이터를 읽고 화면에 필요한 occurrence를 런타임에서 계산한다.

다음 값은 서버에 별도 row로 저장하지 않는다.

- occurrence.
- 홈 섹션과 캘린더 marker.
- 기기 로컬 알림 예약 상태.

[`database/DATABASE.sql`](database/DATABASE.sql)은 현재 운영 스키마를 읽기 위한 snapshot이다.
배포 변경 이력은 `supabase/migrations/`에 두고, 스키마 변경 전에는 운영 DB와 snapshot을 함께 확인한다.

## 세션과 profile

Supabase Auth 세션은 SecureStore 기반 auth storage에 보존한다.
초기 세션과 이후 변경은 `onAuthStateChange` 한 경로에서 처리한다.

세션 상태는 `loading`, `signedOut`, `ready`, `error` 중 하나다.
`ready`는 사용자와 profile이 모두 준비된 상태다.

로그인한 사용자의 profile이 없으면 현재 기기 timezone과 provider 표시 이름으로 생성한다.
사용자가 수정한 표시 이름은 provider metadata로 덮어쓰지 않는다.
세션이 바뀐 뒤 늦게 끝난 이전 profile 요청은 현재 상태에 적용하지 않는다.
profile 준비 실패는 기록하고 재시도 화면을 보여준다.

## 일정 저장과 조회

일정 row와 초기 규칙 버전은 하나의 RPC로 함께 만든다.
수정은 현재 일정과 처리 기록에서 메타 변경과 규칙 변경을 계산한 뒤 하나의 RPC로 저장한다.
규칙 변경일 때만 새 규칙 버전을 추가한다.
일정 삭제는 `is_archived = true`를 저장하는 RPC를 사용한다.
새 규칙 버전의 적용 시각은 수정한 기기의 현재 시각을 사용하며 서버 시각으로 별도 보정하지 않는다.

일정 생성, 수정과 보관은 다음 순서를 따른다.

1. 입력과 수정 정책을 확인한다.
2. 제목과 설명을 암호화한다.
3. RPC로 서버 상태를 저장한다.
4. 현재 기기의 알림을 전체 재동기화한다.
5. 일정 query를 무효화해 서버 상태를 다시 읽는다.

알림 동기화 실패는 이미 저장된 변경을 되돌리지 않는다.
실패를 기록한 뒤 query 갱신을 계속한다.

홈의 완료와 건너뛰기도 처리 기록 저장, 알림 전체 재동기화, query 갱신 순서를 사용한다.
여러 처리 기록은 단일 insert로 원자적으로 저장한다.

화면 query는 필요한 일정, 처리 기록과 완료일 기준 anchor를 조회하고 화면 모듈이 표시 projection을 만든다.
상세의 대표 상태 계산은 일정 시작 이후 처리 기록을 사용한다.
상세 진입 시 `scheduledAtUtc`가 있으면 해당 occurrence를 우선하고, 없으면 최신 지난 일정과 다음 occurrence 순서로 선택한다.
최근 처리 기록은 별도 query에서 실제 처리 시각 최신순 5건만 읽는다.

## 내용 암호화와 복구

일정 제목과 설명은 앱에서 사용자별 content key를 사용해 AES-GCM으로 암호화한다.
암호문과 wrapped content key만 서버 DB에 저장한다.

content key 흐름은 다음과 같다.

1. 앱은 SecureStore에서 content key를 읽거나 새로 만든다.
2. Edge Function은 서버 secret으로 content key를 wrap한다.
3. 사용자 ID와 key version은 AES-GCM additional data로 결합한다.
4. Edge Function이 wrapped key를 사용자 소유 row로 저장한다.
5. 새 기기에서 SecureStore key가 없으면 인증된 Edge Function 호출로 복구한다.
6. 복구한 key는 현재 기기 SecureStore에 저장한다.

기존 SecureStore key에 대응하는 wrapped key가 서버에 없으면 현재 key를 wrap해 서버 row를 보충한다.
기기 key로 복호화하지 못하면 서버 key를 복구해 한 번 다시 시도한다.
기존 사용자 결합 전 wrapped key는 클라이언트가 변경하지 못하게 보호한다.
정상 복구하면 사용자 결합 형식으로 다시 wrap해 같은 row에 저장한다.

서버 DB table만으로 content key와 제목·설명 평문을 복구할 수 없어야 한다.
Edge Function은 content key만 wrap하거나 recover하며 일정 암호문을 복호화하지 않는다.
이 구조는 서버 실행 경계를 신뢰하므로 strict E2EE가 아니다.

복구 호출은 사용자, 동작, key version과 낮은 해상도 결과만 감사 이벤트로 남긴다.
요청 한도를 넘긴 호출은 DB 감사 이벤트를 추가하지 않는다.
평문, content key, wrapped key, 암호문과 내부 예외 메시지는 기록하지 않는다.
감사 이벤트는 authenticated 사용자가 직접 조회할 수 없다.

복구 불가 일정은 목록에서 숨기지 않는다.
fallback 제목과 빈 설명을 사용하고, 상세에서는 삭제만 허용하며 알림 후보에서는 제외한다.

## 계정 삭제

로그인한 사용자의 계정 삭제는 JWT를 검증하는 `delete-account` Edge Function에서 처리한다.
클라이언트는 service role key를 보유하지 않는다.

1. 앱이 사용자 확인을 받는다.
2. Apple 계정이면 삭제 직전에 Apple 재인증 code를 받는다.
3. Edge Function이 JWT의 사용자와 provider를 확인한다.
4. Apple 계정이면 token revoke와 identity 일치를 먼저 확인한다.
5. service role 권한으로 Auth user를 삭제한다.
6. 외래 키 cascade가 profile과 사용자 데이터를 삭제한다.
7. 앱이 로컬 세션과 현재 기기의 알림을 정리한다.

실패 응답은 내부 삭제 단계와 secret 경계를 노출하지 않는다.
Apple private key, service role key와 OAuth secret은 Edge Function secret으로만 관리한다.

## 기기 로컬 알림

알림은 서버 데이터에서 계산해 현재 기기 OS에 예약하는 파생 상태다.
동기화는 Ttokttak identifier를 가진 기존 예약과 원하는 후보를 비교해 달라진 항목만 취소하거나 추가한다.

후보는 다음 조건을 모두 만족해야 한다.

- OS 권한이 허용됨.
- 일정이 보관되지 않음.
- 현재 규칙의 알림이 켜짐.
- 일정 내용을 복구할 수 있음.
- occurrence가 `scheduled`임.
- occurrence가 종료일 이내임.

완료일 기준 일정에 미해결 occurrence가 남아 있으면 다음 알림 후보를 만들지 않는다.
기본 후보 범위는 현재부터 30일이며, 각 일정의 그 이후 첫 occurrence도 포함한다.
기기 전체 예약 한도 안에서 최대 60개까지 가까운 시각을 우선한다.

identifier는 사용자, 일정과 occurrence 예정 시각을 포함한다.
payload는 알림 종류와 일정 알림 source만 가진다.
표시 내용은 복호화한 제목과 profile timezone 기준 예정 시각이며 설명은 포함하지 않는다.

앱 아이콘 뱃지는 일정과 occurrence 처리 기록에서 계산한 처리 필요 수의 절대값이다.
현재 값을 읽어 증감하지 않는다.
동기화할 때 현재 뱃지를 맞추고 각 예약 알림에도 예정 시각의 예상 절대값을 넣는다.
처리됐거나 활성 일정에 속하지 않는 표시 알림은 제거한다.
로그아웃과 계정 삭제 때 표시 알림을 제거하고 뱃지를 0으로 맞춘다.

뱃지 갱신과 표시 알림 정리는 사용자 동작을 실패시키지 않는 best-effort 작업이다.
예상하지 못한 오류는 Sentry에만 기록하고 알림 동기화 진단 단계에는 추가하지 않는다.
Android의 숫자 표시 여부는 기기 런처에 따라 다르다.

다음 변화는 현재 사용자의 전체 알림 동기화를 실행한다.

- 세션, profile timezone 또는 표시 언어 변경.
- 앱 foreground 복귀.
- 알림 tap.
- 일정 생성, 수정 또는 보관.
- occurrence 완료 또는 건너뛰기.

세션이 없으면 현재 기기의 Ttokttak 알림을 모두 취소한다.
동기화와 정리 실패는 기록하지만 사용자 동작이나 로그아웃을 되돌리지 않는다.
알림 tap payload가 유효하면 홈으로 이동한다.

예약을 취소하거나 추가한 동기화는 OS 예약 목록을 한 번 더 읽는다.
원하는 identifier 집합과 다르면 검증 실패로 기록한다.
자동 재시도나 별도 사용자 알림은 추가하지 않는다.

알림 동기화 진단은 현재 기기에 최근 성공과 실패를 각각 한 건만 저장한다.
성공에는 시각, 후보 수와 예약 수를 포함한다.
실패에는 시각과 실패 단계만 포함한다.
권한은 설정 화면에서 현재 상태를 별도로 보여준다.
사용자·일정·알림 식별자, 일정 표시 내용과 원본 오류 메시지는 포함하지 않는다.
로그아웃이나 실행 중 계정 변경 때 이 기록을 삭제한다.
동기화를 시작한 로그인 세대가 바뀌면 늦게 완료된 결과를 저장하지 않는다.
진단 저장과 삭제는 호출 순서대로 처리한다.
설정 화면은 두 기록을 보여주고, 실패 뒤 성공이 있으면 정상화 상태를 표시한다.

이 기록은 OS 예약 요청 결과만 설명한다.
OS가 실제로 알림을 표시했는지는 확인하거나 보장하지 않는다.

## 표시 언어와 테마

표시 언어와 테마 provider는 세션 밖에서 로그인 전후 화면을 모두 감싼다.
설정은 현재 기기 저장소에 보존한다.

선택한 표시 언어 초기화에 실패하면 한국어로 다시 시도한다.
한국어 초기화도 실패하면 앱 진입 대신 재시도 화면을 보여준다.
번역 resource는 모든 지원 언어 key를 가져야 한다.
날짜 라이브러리 locale은 외부 adapter 경계에서만 사용한다.

테마 초기화에 실패하면 시스템 설정을 사용한다.
화면은 정적 색상 대신 semantic theme token을 읽는다.
일정 색상은 theme token과 분리해 모든 테마에서 같은 identity를 유지한다.

## 보안과 오류 수집

앱 번들에는 `EXPO_PUBLIC_*` public 설정만 넣는다.
service role key, private key, OAuth client secret과 Sentry auth token은 앱 번들에 넣지 않는다.

Sentry event는 오류 타입, stack, release, environment와 허용한 tag만 전송한다.
알림 동기화 tag는 호출 계기, 실패 단계와 내부 오류 코드만 허용한다.
사용자 정보, request, breadcrumb, context, extra와 원본 오류 메시지는 전송하지 않는다.

민감 Edge Function은 인증된 `POST`만 처리하고 `Cache-Control: no-store`를 사용한다.
native 앱 전용인 현재 범위에서는 공개 health endpoint와 CORS `OPTIONS`를 제공하지 않는다.
웹 호출이 필요해질 때 origin 정책과 CORS를 함께 설계한다.
복구와 계정 삭제 rate limit은 instance 메모리 기준의 best-effort 보호다.
분산 제한이 필요해지면 외부 저장소 기반으로 별도 설계한다.
