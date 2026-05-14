# Ttokttak

반복되는 생활 항목을 일정으로 등록하고, 알림을 받고, 완료 또는 건너뛰기 기록을 남기는 개인 리마인더 앱입니다.

핵심 대상은 매일 반복되는 루틴만이 아닙니다.
복용, 교체, 정비, 학습처럼 주기가 있는 생활 항목을 같은 방식으로 관리합니다.

## Current Scope

- Supabase Auth 기반 로그인.
- Apple / Google 로그인 진입점.
- 일정 생성, 수정, 삭제.
- 한 번, 매일, n일마다, 매주, n주마다, 매달, n달마다 반복 규칙.
- 고정형 또는 완료일 기준 계산.
- 홈의 오늘, 다가오는 일정, 지난 일정.
- 홈에서 완료와 건너뛰기 처리.
- 일정 목록 조회와 제목순 / 생성순 정렬.
- 일정 상세, 최근 히스토리 5건, 수정 / 삭제 진입.
- 월간 달력과 선택 날짜 일정 목록.
- 기기 로컬 알림.
- 일정 제목과 설명의 서버 저장 내용 복구 경계.

현재 제공하지 않는 범위:

- 위젯.
- 알림함.
- 원격 푸시 발송.
- snooze.
- 반복 재알림.
- 통계 화면.
- 협업 또는 공유.
- 완전한 오프라인 충돌 해결 UX.

## Product Decisions

- 사용자-facing 관리 대상은 **일정**이라고 부릅니다.
- occurrence는 저장하지 않고 계산합니다.
- occurrence identity는 `(itemId, scheduledAtUtc)`입니다.
- 완료와 건너뛰기는 홈에서만 수행합니다.
- 지난 일정은 자동으로 다음날로 밀리지 않습니다.
- `completion_based`는 `daily`, `interval_days`, `monthly`, `interval_months`에서만 사용합니다.
- 한 번 일정은 고정형만 사용합니다.
- `weekly`, `interval_weeks`는 요일 패턴을 유지하기 위해 고정형만 사용합니다.
- 알림은 Expo Notifications 기반 기기 로컬 알림입니다.
- 일정 제목과 설명은 서버 DB에 평문으로 저장하지 않습니다.

## Stack

- Expo / React Native.
- Expo Router.
- TypeScript.
- React Hook Form.
- Zod.
- TanStack Query.
- Supabase Auth / Postgres / Edge Functions.
- Expo Notifications.
- Expo SecureStore.
- Expo Crypto.
- date-fns / date-fns-tz.
- Sentry.

## Run

```sh
pnpm install
pnpm start
```

자주 쓰는 명령:

```sh
pnpm ios
pnpm android
pnpm web
pnpm test
pnpm lint
npx tsc --noEmit
```

## Environment

앱 번들에는 public env만 넣습니다.
service role key와 private key는 `EXPO_PUBLIC_*`에 넣지 않습니다.

앱 실행에 사용하는 env 이름:

- `EXPO_PUBLIC_SUPABASE_URL`.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID`.
- `EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID`.
- `GOOGLE_AUTH_IOS_URL_SCHEME`.
- `EXPO_PUBLIC_SENTRY_DSN`.

Supabase Edge Function secret:

- `TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `SB_PUBLISHABLE_KEY` 또는 `SUPABASE_ANON_KEY`.
- `SUPABASE_URL`.

## Docs

- 도메인 용어: [CONTEXT.md](CONTEXT.md)
- 제품 범위: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)
- 도메인 규칙: [docs/DOMAIN_LOGIC.md](docs/DOMAIN_LOGIC.md)
- 시스템 설계: [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)
- 스키마 기준: [docs/DATABASE.sql](docs/DATABASE.sql)
- 설계 결정: [docs/adr/](docs/adr/)
- 에이전트 작업 규칙: [AGENTS.md](AGENTS.md)
