# 테스트

테스트 개수나 삭제 비율을 목표로 삼지 않는다. 실제 구현을 잘못 바꿨을 때 어떤 사용자 동작이 깨지는지 설명할 수 있는 검사를 남긴다.

- Jest: occurrence 경계, 입력 검증, 오류·경합·암호화 처리를 공개 interface에서 검증한다. mock은 외부 경계에 사용한다.
- 통합: 실제 로컬 Auth·PostgREST·DB·Edge Function을 연결해 소유권, 제약, 원자성과 키 복구를 검증한다. SQL 문서의 문자열 검사는 사용하지 않는다.
- Maestro: iOS 앱에서 일정 lifecycle과 계정 격리·서버 content key 복구를 확인한다. 소셜 로그인 자체는 이 검사 범위에 포함하지 않는다.

문구 원문 복제, 내부 key 배열 모양, 상위 검사와 중복되는 단순 mock 전달 검사는 삭제한다. 약한 검사를 보강해 존치시키는 것을 기본값으로 삼지 않는다. 중복 검사부터 삭제하고, 데이터 유실·권한·경합·도메인 경계처럼 독립적으로 보호할 이유가 있는 검사만 보강한다.

## 검사 선택 근거

| 대상                     | 검증할 결과                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 조회 hook                | 실제 QueryClient로 계정 전환 시 이전 데이터 차단, 세션 준비 전 요청 차단, 실패 후 재조회. `useQuery` 옵션을 mock으로 읽는 검사는 두지 않는다.          |
| 일정 조회                | 목록과 처리 기록의 준비·실패·새로고침을 함께 확인한다. 같은 경로의 `read` 전달 검사는 중복 유지하지 않는다.                                            |
| 생성·수정·삭제 정상 경로 | Maestro에서 저장과 재실행 결과를 확인한다. 폼·DB wrapper마다 같은 인자 전달 검사를 반복하지 않는다.                                                    |
| 입력 UI                  | 실제 React Hook Form의 입력값·오류·취소 결과를 확인한다. ref·layout callback·정적 prop 복제는 제외한다.                                                |
| 번역·화면 전환           | 단순 리소스 값과 mock 화면 종류 복제는 제외한다. 시간대 변환·복수 간격·언어 초기화 실패·캘린더 렌더 시점은 남긴다.                                     |
| 암호화·DB 권한           | SQL 문자열과 가짜 암복호화 왕복은 제외한다. 키 복구 실패는 단위 검사, 실제 암복호화는 앱 E2E, 키 변조 차단·감사 기록 삭제는 로컬 통합 검사로 확인한다. |
| 경합·실패 복구           | 입력 중 재조회, 계정 전환 중 늦은 응답, 알림 정리와 예약의 경합, 저장 실패 시 입력 보존은 정상 경로 E2E로 대체하지 않는다.                             |
| 반복 규칙                | 월말·서머타임·종료일·규칙 버전·완료와 건너뛰기의 차이를 실제 날짜로 확인한다.                                                                          |

테스트 통과나 결함 주입 실험의 탐지 개수만으로 존치 여부를 판단하지 않는다. 데이터 유실·계정 혼용·경합·도메인 경계를 보호하는지, 상위 검사가 같은 결과를 이미 확인하는지로 판단한다.

단순 복구 경고·로그인 오류 안내·제목 수정 시 오류 문구 제거의 개별 검사는 제외한다. 일정 제목 입력·수정 저장은 Maestro, 빈 이름 차단은 계정 화면 검사, 시간대·간격 표시는 일정 표시 검사에서 확인하므로 하위의 중복 검사는 유지하지 않는다. 삭제한 안내 문구 검사와 동일한 범위를 E2E가 모두 대체하는 것은 아니다.

## 자동 방어 범위

| 계약  | 검사 위치                                                                                                                                                         | 막는 손해                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| J1~J4 | `src/schedule/rules/*.test.ts`, `src/schedule/occurrence-policy.test.ts`, `src/schedule/write.test.ts`                                                            | 잘못된 예정 시점·상태·처리 대상과 과거 기록 변경          |
| J5~J7 | `src/schedule/write.test.ts`, `src/schedule/db/*.test.ts`, `src/schedule/{read,query}.test.ts`, `src/schedule/content/*.test.ts`, `src/session/provider.test.tsx` | 저장 실패 오인, 부분 조회, 계정 혼용과 내용 복구 단절     |
| J8    | `src/notifications/plan.test.ts`, `src/device-sync-session.test.ts`                                                                                               | 로그아웃 뒤 이전 계정 출력 부활과 잘못된 알림 재예약      |
| J9    | `src/screens/schedule-form/form.test.tsx`                                                                                                                         | 재조회·저장 실패 때 사용자가 입력한 내용 유실             |
| J10   | `src/session/local.test.ts`, `deployment-config.test.js`                                                                                                          | 운영 빌드의 테스트 로그인·개발 dotenv 유입                |
| B1~B4 | `tests/integration/schedule.mjs`                                                                                                                                  | DB 원자성·멱등성·소유권·삭제 cascade 회귀                 |
| F1~F3 | `supabase/functions/tests/edge-functions_test.ts`                                                                                                                 | 인증 우회, 잘못된 key binding과 복구 비밀정보 노출        |
| E1~E2 | `.maestro/e1-lifecycle.yaml`, `.maestro/e2-*.yaml`                                                                                                                | 실제 앱 저장·재조회·계정 격리·local key 유실 뒤 복구 실패 |

필수 계약 밖에서는 언어 초기화 실패, 캘린더 locale 적용 시점, 표시 이름의 빈 값 차단, 시간대·복수 간격 표시만 별도 검사한다. 이 검사는 occurrence 계산을 화면별로 반복하지 않는다. 색상·route param·테마·정적 UI prop·일반 오류 문구·위젯 투영은 자동 검사에서 제외한다.

## 빠른 검사

외부 서비스 없이 실행한다.

```sh
pnpm exec jest --runInBand
pnpm exec tsc --noEmit
pnpm lint
pnpm supabase:functions:check
pnpm supabase:functions:test
```

## 로컬 실행

필요 도구: Docker 호환 런타임, Supabase CLI, Node.js, Deno, Java 17 이상, Maestro, Xcode와 iOS 시뮬레이터. 현재 Supabase CLI 2.113.0과 Maestro 2.10.0에서 확인한다.

```sh
pnpm start:local
```

환경 파일은 모두 Git에서 제외한다. `.env`는 공통 Google 설정, `.env.local`은 로컬 Supabase URL·public key와 빈 Sentry DSN을 담는다. `.env.production`은 기존 운영 값의 보관용 사본이다. 운영 빌드와 OTA는 EAS production 변수를 사용하며 [`release/RELEASE.md`](release/RELEASE.md)를 따른다.

이 명령은 기존 migration으로 로컬 Supabase를 시작하고 Edge Function과 별도 Metro(8082)를 실행한다. Expo는 `.env`와 `.env.local`을 기본 규칙대로 읽는다. 스크립트에서 Supabase 주소를 덮어쓰지 않는다. 처음에는 컨테이너 이미지 다운로드가 필요하다.

content key wrapping secret은 `supabase/functions/.env.local`에 무작위로 생성하고 이후 재사용한다. 이 파일은 커밋하지 않는다. DB를 유지한 채 secret만 바꾸면 기존 wrapped key를 복구할 수 없다.

시뮬레이터에는 이 프로젝트의 Expo development build(`com.youngzin.ttokttak`)가 설치되어 있어야 한다. 새 기기는 Expo prebuild 경로로 개발 빌드를 만든다. 생성된 네이티브 소스는 직접 수정하지 않는다.

E2E는 이름이 `Ttokttak E2E`인 전용 폐기 가능 시뮬레이터에서만 실행한다. 여러 전용 시뮬레이터가 있으면 `TTOKTTAK_E2E_SIMULATOR_UDID`로 대상을 고른다. runner는 해당 이름을 다시 확인한 뒤 시간대를 `Asia/Seoul`로 설정하고 keychain을 초기화하므로 개인 기기나 일상 개발용 시뮬레이터를 사용하지 않는다.

수동 확인용 계정은 로컬 Studio(`http://127.0.0.1:54323`)의 Auth에서 만들고 앱의 로컬 테스트 로그인으로 접속한다. `pnpm start`와 개발용 네이티브 실행 명령도 같은 로컬 설정을 읽는다. DB만 시작하려면 `supabase start`를 사용한다. 키 복구가 필요한 앱 동작에는 Edge Function도 실행해야 하므로 `pnpm start:local`을 사용한다. E2E는 이 명령의 8082 서버를 사용한다.

다른 터미널에서 실행한다.

```sh
pnpm test:integration
pnpm e2e:ios
```

E2E는 실행마다 새로운 로컬 테스트 계정 세 개를 만들고 실제 Auth로 로그인한다. E1은 일정 생성·수정·완료·건너뛰기·재실행·삭제를, E2는 A/B 계정 격리와 local key 삭제 뒤 서버 wrapped key 복구를 확인한다. 실행 중 서울 기준 날짜가 바뀌면 fixture를 이어 쓰지 않고 실패한다.

공개된 테스트 비밀번호는 로컬 fixture이며 운영 계정에는 사용하지 않는다. 로컬 로그인 화면은 개발 빌드와 허용된 로컬 주소에서만 열리고, 인증 요청 직전에도 같은 조건을 확인한다. 운영 URL을 받는 옵션은 제공하지 않는다.

Maestro는 PATH 또는 `.local-tools/maestro/bin/maestro`에서 찾는다. 결과는 `.maestro-results/`에 남기며 커밋하지 않는다. 실패한 계정과 데이터는 원인 확인을 위해 로컬에 남긴다.

## 초기화와 범위

로컬 데이터를 모두 지우고 migration 재생을 검증하려면 실행 중인 E2E를 종료한 뒤 다음 명령을 사용한다.

```sh
supabase db reset --local
```

운영에 연결된 CLI 이력이 있으므로 초기화에 `--linked`나 원격 `--db-url`을 사용하지 않는다. 운영 데이터·secret을 seed로 복사하지 않는다. 과거 원격 푸시 migration에 필요한 운영 secret도 넣지 않는다.

Google·Apple 로그인은 별도 개발 환경에서 실제 계정으로 로그인·앱 복귀·세션 생성까지 확인한다. 실제 기기에서는 알림 권한 허용·거부, 알림 표시·tap·로그아웃 뒤 정리와 위젯 표시를 수동 확인한다. 로컬 일정 E2E의 통과가 소셜 로그인이나 OS 알림 표시의 통과를 뜻하지 않는다. production build·OTA의 backend와 public env는 release 절차에서 확인하며 Android E2E는 후속 범위다.
