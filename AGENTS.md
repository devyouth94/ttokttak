# AGENTS.md

## Worktree

- 사용자 변경사항은 요청 없이 되돌리거나 덮어쓰지 않는다.
- 커밋은 사용자가 명시적으로 요청할 때만 만든다.
- `ios/`, `android/` 네이티브 생성 코드는 직접 수정하지 않는다.
- 네이티브 설정 변경은 `app.config.ts`, config plugin, Expo prebuild 설정처럼 재생성 가능한 경로로 처리한다.

## Code Rules

- 날짜 포맷 관련 구현은 `date-fns`와 `date-fns-tz`를 우선 사용한다.
- `as unknown as` 캐스트는 사용하지 않는다.
- 타입은 `z.infer` 등으로 직접 맞춘다.
- UI text와 code comment는 한국어를 사용한다.

## Docs

문서, 설정, 가이드는 agent friendly하게 작성한다.

- 짧은 문장.
- 명확한 구조.
- 중복 최소화.
- 한 문단 한 주제.
- 목록 깊이 일관성 유지.
- 제목은 짧고 역할 중심.
- 예시는 꼭 필요한 것만 유지.
- 자주 읽는 문서는 추가보다 가독성과 검색성을 우선.

### Main Docs

- `CONTEXT.md`: 도메인 용어와 관계.
- `docs/PRODUCT_SPEC.md`: 현재 제품 범위와 화면 요구사항.
- `docs/DOMAIN_LOGIC.md`: 반복 규칙, occurrence 계산, 상태 판정.
- `docs/SYSTEM_DESIGN.md`: 구현 구조, 데이터 흐름, Supabase, 알림, 암호화 경계.
- `docs/adr/`: 되돌리기 어렵고 맥락 없이는 놀라운 설계 결정.
- `docs/database/DATABASE.sql`: 현재 운영 스키마 snapshot.
- `docs/release/RELEASE.md`: build, 제출, OTA와 복구 절차.
- `docs/release/STORE_METADATA.md`: 스토어 입력 원문과 공개 URL.

도메인 용어를 새로 만들거나 바꿀 때는 `grill-with-docs` 흐름으로 `CONTEXT.md`와 필요한 ADR을 먼저 확인한다.

## Security

- 의존성 audit 운영 기준은 `docs/security/DEPENDENCY_AUDIT.md`를 확인한다.
- secret은 git, 앱 번들, Sentry event, Supabase 로그, Edge Function 로그, EAS / CI 로그에 남기지 않는다.
- 앱 번들에는 `EXPO_PUBLIC_*` public env만 포함한다.
- service role key, private key, OAuth client secret, Sentry auth token, EAS / CI token은 `EXPO_PUBLIC_*`에 넣지 않는다.

## Tooling

- 외부 서비스 작업은 사용 가능한 플러그인/MCP를 먼저 사용한다.
- GitHub, Supabase, Notion, Figma 작업은 CLI나 웹 수동 확인보다 플러그인 도구를 우선한다.
- CLI는 로컬 검증, 플러그인이 제공하지 않는 기능, 플러그인 실패 시 fallback으로 사용한다.
- Supabase schema, migration, cron, function 확인과 적용은 Supabase MCP를 먼저 시도한다.

## Verification

- 변경 범위에 맞는 테스트를 실행한다.
- 테스트는 깊은 모듈의 공개 interface와 사용자가 관찰하는 결과를 확인한다.
- 내부 helper의 반환 shape나 구현 문자열은 고정하지 않는다. 문자열 자체가 구조 계약일 때만 소스 기반 테스트를 사용한다.
- 문서만 수정하면 최소 `pnpm exec prettier --check <files>`와 `git diff --check`를 확인한다.
- 코드 변경이면 필요에 따라 `pnpm jest --runInBand`, `npx tsc --noEmit`, `pnpm lint`를 실행한다.
- Supabase Edge Function을 수정하면 `pnpm supabase:functions:check`를 실행한다.
- 로컬에 Deno가 없으면 설치가 필요한 검증 환경 문제로 보고, 미실행 사유에 적는다.
- 실행하지 못한 검증은 최종 응답에 이유를 적는다.

## Agent Skills

### Issue Tracker

이슈, PRD, 이슈 기반 작업 흐름은 GitHub Issues 기준으로 관리한다.
자세한 기준은 `docs/agents/issue-tracker.md`를 본다.

### Triage Labels

triage 라벨은 기본 5개 역할 이름을 그대로 사용한다.
자세한 매핑은 `docs/agents/triage-labels.md`를 본다.

### Domain Docs

도메인 문서는 single-context 구조를 사용한다.
자세한 기준은 `docs/agents/domain.md`를 본다.

## Commit

- prefix: `feat:` | `fix:` | `refactor:` | `chore:` | `docs:` | `test:`
- scope(`type(scope): ...`) 사용 금지.
- commit message는 한국어로 작성한다.

## Language

- agent response: 한국어.
- code comment: 한국어.
- commit message: 한국어.
- UI text: 한국어.
