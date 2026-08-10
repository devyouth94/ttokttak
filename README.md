# Ttokttak

복용, 교체, 정비, 학습처럼 예정 시점이 있는 생활 항목을 관리하는 Expo 기반 개인 리마인더 앱입니다.

## 실행

```sh
pnpm install
pnpm start
```

주요 명령은 `package.json`의 scripts를 기준으로 합니다.

```sh
pnpm ios
pnpm android
pnpm test
pnpm lint
pnpm exec tsc --noEmit
```

## 환경 변수

앱 실행에 필요한 public env는 다음과 같습니다.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID`
- `EXPO_PUBLIC_SENTRY_DSN`

iOS native build에는 `GOOGLE_AUTH_IOS_URL_SCHEME`도 필요합니다.
서버 secret과 release credential은 앱의 `EXPO_PUBLIC_*` 값으로 넣지 않습니다.

Supabase Edge Function은 다음 공통 secret을 사용합니다.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SB_PUBLISHABLE_KEY` 또는 `SUPABASE_ANON_KEY`
- `TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64`

Apple 계정 삭제에는 다음 secret도 필요합니다.

- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_CLIENT_ID`
- `APPLE_PRIVATE_KEY`

## 문서

제품과 설계:

- [용어](CONTEXT.md)
- [제품 범위](docs/PRODUCT_SPEC.md)
- [도메인 규칙](docs/DOMAIN_LOGIC.md)
- [시스템 설계](docs/SYSTEM_DESIGN.md)
- [설계 결정](docs/adr/)
- [운영 스키마 snapshot](docs/database/DATABASE.sql)

운영:

- [릴리스](docs/release/RELEASE.md)
- [스토어 원문](docs/release/STORE_METADATA.md)
- [의존성 보안 점검](docs/security/DEPENDENCY_AUDIT.md)

에이전트 작업 규칙은 [AGENTS.md](AGENTS.md)를 따릅니다.
